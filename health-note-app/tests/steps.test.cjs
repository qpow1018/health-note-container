const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadSteps({ status = 'permission', permission = 'granted', granted = false } = {}) {
  const calls = [];
  const native = {
    snapshot: async () => ({ date: '2026-10-19', steps: 10, status }),
    start: async () => { calls.push('start'); status = 'tracking'; },
    reset: async () => { calls.push('reset'); },
  };
  const exports = {};
  vm.runInNewContext(ts.transpile(fs.readFileSync('src/steps.ts', 'utf8'), {
    module: ts.ModuleKind.CommonJS,
  }), {
    exports,
    require(name) {
      if (name === 'expo') return { requireOptionalNativeModule: () => native };
      if (name === 'react-native') return {
        Platform: { OS: 'android', Version: 37 },
        PermissionsAndroid: {
          PERMISSIONS: { ACTIVITY_RECOGNITION: 'activity', POST_NOTIFICATIONS: 'notifications' },
          RESULTS: { GRANTED: 'granted', NEVER_ASK_AGAIN: 'never' },
          check: async () => granted,
          request: async (name) => { calls.push(name); return permission; },
        },
        Alert: { alert: () => calls.push('alert') }, Linking: { openSettings() {} },
      };
      throw new Error(name);
    },
  });
  return { api: exports, calls };
}

test('앱 시작 이벤트가 겹쳐도 권한 요청은 한 번이고 허용 후 자동 기록한다', async () => {
  const { api, calls } = loadSteps();
  await Promise.all([api.initializeSteps(), api.initializeSteps()]);
  await api.initializeSteps();
  assert.deepEqual(calls, ['activity', 'notifications', 'start']);
});

test('권한이 이미 있으면 권한 창 없이 자동 기록한다', async () => {
  const { api, calls } = loadSteps({ status: 'stopped', granted: true });
  await api.initializeSteps();
  assert.deepEqual(calls, ['start']);
});

test('거절 후 같은 실행에서는 다시 묻지 않고 새 실행에서는 한 번 요청한다', async () => {
  const first = loadSteps({ permission: 'denied' });
  await first.api.initializeSteps();
  await first.api.initializeSteps();
  await first.api.readSteps(true);
  assert.deepEqual(first.calls, ['activity']);
  const next = loadSteps({ permission: 'denied' });
  await next.api.initializeSteps();
  assert.deepEqual(next.calls, ['activity']);
});

test('영구 거절은 실행당 한 번 설정 안내를 표시한다', async () => {
  const { api, calls } = loadSteps({ permission: 'never' });
  await api.initializeSteps();
  await api.initializeSteps();
  assert.deepEqual(calls, ['activity', 'alert']);
});

test('복귀는 중단된 측정을 재개하지만 권한을 다시 요청하지 않는다', async () => {
  const { api, calls } = loadSteps({ status: 'stopped', granted: true });
  assert.equal((await api.readSteps(true)).status, 'tracking');
  assert.deepEqual(calls, ['start']);
  const denied = loadSteps();
  await denied.api.readSteps(true);
  assert.deepEqual(denied.calls, []);
});

test('센서 미지원 기기에는 권한을 요청하지 않는다', async () => {
  const { api, calls } = loadSteps({ status: 'unsupported' });
  await api.initializeSteps();
  assert.deepEqual(calls, []);
});

test('걸음 응답은 허용 origin에서만 전달된다', () => {
  const { api } = loadSteps();
  const snapshot = { date: '2026-10-19', steps: 12, status: 'tracking', enabled: true };
  const script = api.createStepsScript(snapshot, 'https://health-note.example');
  const events = [];
  for (const origin of ['https://else.example', 'https://health-note.example']) {
    vm.runInNewContext(script, {
      location: { origin }, window: { dispatchEvent: (event) => events.push(event) },
      CustomEvent: function(type, { detail }) { this.type = type; this.detail = detail; },
    });
  }
  assert.equal(events.length, 1);
  assert.equal(events[0].detail.steps, 12);
});

test('초기화는 권한을 요청하거나 측정 설정을 바꾸지 않는다', async () => {
  const { api, calls } = loadSteps({ status: 'tracking' });
  await api.resetSteps();
  assert.deepEqual(calls, ['reset']);
  assert.equal((await api.readSteps()).status, 'tracking');
});
