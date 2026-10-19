const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadSteps({ status = 'disabled', enabled = false, permission = 'granted' } = {}) {
  const calls = [];
  const native = {
    snapshot: async () => ({ date: '2026-10-19', steps: 10, status, enabled }),
    start: async () => { calls.push('start'); status = 'tracking'; enabled = true; },
    reset: async () => { calls.push('reset'); },
    stop: async () => { calls.push('stop'); status = 'disabled'; enabled = false; },
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
          request: async (name) => { calls.push(name); return permission; },
        },
        Alert: { alert: () => calls.push('alert') }, Linking: { openSettings() {} },
      };
      throw new Error(name);
    },
  });
  return { api: exports, calls };
}

test('활성 설정이 없는 앱 시작에서는 자동으로 기록하지 않는다', async () => {
  const { api, calls } = loadSteps();
  await api.readSteps(true);
  assert.deepEqual(calls, []);
});

test('복귀 시 활성 설정과 권한이 있는 중단된 측정만 재개한다', async () => {
  const { api, calls } = loadSteps({ status: 'stopped', enabled: true });
  assert.equal((await api.readSteps(true)).status, 'tracking');
  assert.deepEqual(calls, ['start']);
  const denied = loadSteps({ status: 'permission', enabled: true });
  await denied.api.readSteps(true);
  assert.deepEqual(denied.calls, []);
});

test('권한 거절 시 측정하지 않으며 영구 거절에는 설정 안내를 제공한다', async () => {
  const { api, calls } = loadSteps({ permission: 'never' });
  await api.changeStepTracking('start');
  assert.deepEqual(calls, ['activity', 'alert']);
});

test('권한 허용 뒤 시작하고 중지 시 다시 권한을 요청하지 않는다', async () => {
  const { api, calls } = loadSteps();
  await api.changeStepTracking('start');
  await api.changeStepTracking('stop');
  assert.deepEqual(calls, ['activity', 'notifications', 'start', 'stop']);
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
  const { api, calls } = loadSteps({ status: 'tracking', enabled: true });
  await api.changeStepTracking('reset');
  assert.deepEqual(calls, ['reset']);
  assert.equal((await api.readSteps()).status, 'tracking');
  assert.equal((await api.readSteps()).enabled, true);
});
