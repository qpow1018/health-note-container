const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function loadApp() {
  const cache = {};
  const mocks = {
    'react-native': {
      ActivityIndicator: 'ActivityIndicator', Alert: { alert() {} },
      BackHandler: { addEventListener: () => ({ remove() {} }) },
      Button: 'Button', Text: 'Text', View: 'View', StyleSheet: { create: (styles) => styles },
    },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' },
    'react-native-webview': { WebView: 'WebView' },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'expo-web-browser': { openAuthSessionAsync: async () => ({ type: 'cancel' }) },
  };
  function load(path) {
    if (cache[path]) return cache[path];
    const exports = {};
    cache[path] = exports;
    vm.runInNewContext(ts.transpile(fs.readFileSync(path, 'utf8'), {
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
    }), {
      exports,
      process: { env: { EXPO_PUBLIC_WEB_URL: 'https://health-note.example/' } }, URL,
      require(name) {
        if (name.startsWith('./')) return load(`${name.slice(2)}.ts`);
        return mocks[name] ?? require(name);
      },
    });
    return exports;
  }
  return load('App.tsx').default;
}

const loadingText = 'Health Note를 불러오고 있어요.';
function hasLoading(renderer) {
  return renderer.root.findAllByType('Text').some((node) => node.props.children === loadingText);
}

// Native WebView 이벤트만 대체한다. 로딩 상태 변경과 화면 렌더링은 실제 React로 실행한다.
test('페이지 완료 후 인증 코드 제거·SPA 주소 변경 이벤트가 와도 로딩을 다시 켜지 않는다', async () => {
  let renderer;
  try {
    await act(() => { renderer = create(React.createElement(loadApp())); });
    assert.equal(hasLoading(renderer), true);
    await act(() => renderer.root.findByType('WebView').props.onLoadEnd());
    assert.equal(hasLoading(renderer), false);

    await act(() => renderer.root.findByType('WebView').props.onLoadStart({
      nativeEvent: { url: 'https://health-note.example/', loading: false },
    }));
    assert.equal(hasLoading(renderer), false, 'Android visited-history 알림은 문서 로딩 시작이 아니다');

    await act(() => renderer.root.findByType('WebView').props.onLoadStart({
      nativeEvent: { url: 'https://health-note.example/exercise', loading: true },
    }));
    assert.equal(hasLoading(renderer), true, '실제 문서를 요청하는 동안에는 로딩 표시를 유지한다');
    await act(() => renderer.root.findByType('WebView').props.onLoadEnd());
    assert.equal(hasLoading(renderer), false);
  } finally {
    if (renderer) await act(() => renderer.unmount());
  }
});
