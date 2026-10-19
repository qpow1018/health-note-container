// React Router의 history.state.idx는 replace/reload에도 현재 앱 내 위치를 유지한다.
// Android는 pushState만으로 onNavigationStateChange를 호출하지 않을 수 있다.
export const historyScript = `
(function () {
  if (window.__healthNoteHistory) return;
  window.__healthNoteHistory = true;
  function report() {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'health-note-history',
      index: typeof history.state?.idx === 'number' ? history.state.idx : 0,
      url: location.href
    }));
  }
  ['pushState', 'replaceState'].forEach(function (method) {
    var original = history[method];
    history[method] = function () {
      var result = original.apply(this, arguments);
      report();
      return result;
    };
  });
  window.addEventListener('popstate', report);
  window.addEventListener('pageshow', report);
  report();
})();
true;
`;
