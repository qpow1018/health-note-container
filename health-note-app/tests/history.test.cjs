const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ts = require('typescript');
const compiled = ts.transpile(fs.readFileSync('src/historyScript.ts', 'utf8'), { module: ts.ModuleKind.CommonJS });
const scriptModule = { exports: {} };
vm.runInNewContext(compiled, { exports: scriptModule.exports });
const { historyScript } = scriptModule.exports;

function page(initialState = { idx: 0 }) {
  const messages = [];
  const listeners = {};
  const history = {
    state: initialState,
    pushState(state) { this.state = state; },
    replaceState(state) { this.state = state; },
  };
  const context = vm.createContext({
    history, location: { href: 'https://health-note.example/exercise' },
    window: {
      ReactNativeWebView: { postMessage: (data) => messages.push(JSON.parse(data)) },
      addEventListener: (name, handler) => { listeners[name] = handler; },
    },
  });
  vm.runInContext(historyScript, context);
  return { history, messages, listeners, context };
}

test('최초 진입은 0, SPA push/replace와 popstate는 Router idx를 전달한다', () => {
  const p = page();
  assert.equal(p.messages.at(-1).index, 0);
  p.history.pushState({ idx: 1 });
  assert.equal(p.messages.at(-1).index, 1);
  p.history.replaceState({ idx: 1 });
  assert.equal(p.messages.at(-1).index, 1);
  p.history.state = { idx: 0 };
  p.listeners.popstate();
  assert.equal(p.messages.at(-1).index, 0);
});

test('새로고침한 상세 페이지의 idx와 pageshow 복원을 유지한다', () => {
  const p = page({ idx: 2 });
  assert.equal(p.messages.at(-1).index, 2);
  p.listeners.pageshow();
  assert.equal(p.messages.at(-1).index, 2);
});

test('재주입해도 history 래퍼와 이벤트를 중복 등록하지 않는다', () => {
  const p = page(null);
  assert.equal(p.messages.at(-1).index, 0);
  const push = p.history.pushState;
  vm.runInContext(historyScript, p.context);
  assert.equal(p.history.pushState, push);
  p.history.pushState({ idx: 1 });
  assert.equal(p.messages.length, 2);
});
