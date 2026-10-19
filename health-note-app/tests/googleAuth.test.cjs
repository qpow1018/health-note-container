const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ts = require('typescript');
const exportsForTest = {};
vm.runInNewContext(ts.transpile(fs.readFileSync('src/googleAuth.ts', 'utf8'), {
  module: ts.ModuleKind.CommonJS,
}), { exports: exportsForTest, URL });
const { AUTH_CALLBACK_URL, createGoogleAuthRequest, getGoogleAuthReturnUrl, createAuthReturnScript } = exportsForTest;
const web = new URL('https://health-note.example/');
const server = 'https://test-project.supabase.co';

function authorizationUrl() {
  const url = new URL('/auth/v1/authorize', server);
  url.search = new URLSearchParams({
    provider: 'google', redirect_to: web.href,
    code_challenge: 'a'.repeat(43), code_challenge_method: 's256',
  }).toString();
  return url;
}

test('시스템 브라우저 요청에서도 WebView의 PKCE challenge를 유지한다', () => {
  const request = createGoogleAuthRequest(authorizationUrl().href, server, web);
  assert.ok(request);
  assert.equal(new URL(request.url).searchParams.get('redirect_to'), AUTH_CALLBACK_URL);
  assert.equal(new URL(request.url).searchParams.get('code_challenge'), 'a'.repeat(43));
  assert.equal(request.returnUrl.href, web.href);
});

test('다른 서버·제공자·복귀 origin·누락/중복된 challenge 요청은 열지 않는다', () => {
  const variants = [
    (u) => { u.hostname = 'evil.example'; },
    (u) => { u.protocol = 'http:'; },
    (u) => { u.pathname = '/auth/v1/authorize/other'; },
    (u) => { u.username = 'attacker'; },
    (u) => { u.searchParams.set('provider', 'github'); },
    (u) => { u.searchParams.set('redirect_to', 'https://evil.example/'); },
    (u) => { u.searchParams.set('code_challenge_method', 'plain'); },
    (u) => { u.searchParams.delete('code_challenge'); },
    (u) => { u.searchParams.append('code_challenge', 'b'.repeat(43)); },
    (u) => { u.searchParams.append('redirect_to', 'https://evil.example/'); },
  ];
  for (const change of variants) {
    const url = authorizationUrl();
    change(url);
    assert.equal(createGoogleAuthRequest(url.href, server, web), null);
  }
  assert.equal(createGoogleAuthRequest('not-a-url', server, web), null);
  assert.equal(createGoogleAuthRequest(authorizationUrl().href, '', web), null);
});

test('코드만 원래 WebView에 반환하고 기존 PKCE flow id도 보존한다', () => {
  const target = new URL(web);
  target.searchParams.set('sb_flow_id', 'original-flow');
  const result = new URL(getGoogleAuthReturnUrl(`${AUTH_CALLBACK_URL}?code=one-time-code`, target));
  assert.equal(result.origin, web.origin);
  assert.equal(result.searchParams.get('code'), 'one-time-code');
  assert.equal(result.searchParams.get('sb_flow_id'), 'original-flow');
});

test('다른 스킴·접두사만 같은 경로·오류·토큰·중복 코드는 거절한다', () => {
  for (const callback of [
    'evil://auth/callback?code=a',
    `${AUTH_CALLBACK_URL}-evil?code=a`,
    'com.healthnote.app://auth:123/callback?code=a',
    'com.healthnote.app://attacker@auth/callback?code=a',
    `${AUTH_CALLBACK_URL}?error=access_denied`,
    `${AUTH_CALLBACK_URL}?code=a&error_description=failed`,
    `${AUTH_CALLBACK_URL}?code=a&code=b`,
    `${AUTH_CALLBACK_URL}?code=a&access_token=token`,
    `${AUTH_CALLBACK_URL}?code=a&refresh_token=token`,
    `${AUTH_CALLBACK_URL}#access_token=token`,
    `${AUTH_CALLBACK_URL}?code=`,
  ]) assert.throws(() => getGoogleAuthReturnUrl(callback, web));
});

test('복귀 스크립트는 현재 WebView가 원래 origin일 때만 동작한다', () => {
  const target = `${web.href}?code=${encodeURIComponent('a";danger()//')}`;
  const script = createAuthReturnScript(target, web.origin);
  let replaced = null;
  vm.runInNewContext(script, { window: { location: { origin: web.origin, replace: (url) => { replaced = url; } } } });
  assert.equal(replaced, target);
  replaced = null;
  vm.runInNewContext(script, { window: { location: { origin: 'https://evil.example', replace: (url) => { replaced = url; } } } });
  assert.equal(replaced, null);
});
