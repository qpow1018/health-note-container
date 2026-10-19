// 이 주소는 app.json의 scheme 및 Supabase Redirect URLs와 일치해야 한다.
export const AUTH_CALLBACK_URL = 'com.healthnote.app://auth/callback';

// WebView가 만든 PKCE 요청만 시스템 인증 브라우저로 전달한다.
export function createGoogleAuthRequest(rawUrl: string, supabaseUrl: string, webUrl: URL) {
  try {
    const url = new URL(rawUrl);
    const server = new URL(supabaseUrl);
    const returnUrl = new URL(url.searchParams.get('redirect_to') ?? '');
    if (server.protocol !== 'https:' || url.origin !== server.origin ||
        url.pathname !== '/auth/v1/authorize' || url.username || url.password || url.hash ||
        url.searchParams.getAll('provider').length !== 1 || url.searchParams.get('provider') !== 'google' ||
        url.searchParams.getAll('redirect_to').length !== 1 ||
        url.searchParams.getAll('code_challenge').length !== 1 ||
        !/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get('code_challenge') ?? '') ||
        url.searchParams.getAll('code_challenge_method').length !== 1 ||
        url.searchParams.get('code_challenge_method')?.toLowerCase() !== 's256' ||
        returnUrl.origin !== webUrl.origin || returnUrl.pathname !== '/' || returnUrl.hash ||
        returnUrl.username || returnUrl.password) return null;

    // PKCE verifier는 원래 WebView에 남긴다. 교환 주체를 native로 바꾸지 않는다.
    url.searchParams.set('redirect_to', AUTH_CALLBACK_URL);
    return { url: url.href, returnUrl };
  } catch {
    return null;
  }
}

export function getGoogleAuthReturnUrl(callbackUrl: string, returnUrl: URL) {
  const callback = new URL(callbackUrl);
  const expected = new URL(AUTH_CALLBACK_URL);
  if (callback.protocol !== expected.protocol || callback.host !== expected.host ||
      callback.pathname !== expected.pathname || callback.username || callback.password ||
      callback.hash || callback.searchParams.has('error') ||
      callback.searchParams.has('error_description') ||
      callback.searchParams.has('access_token') || callback.searchParams.has('refresh_token') ||
      callback.searchParams.getAll('code').length !== 1) {
    throw new Error('Invalid authentication callback');
  }
  const code = callback.searchParams.get('code');
  if (!code || code.length > 2048 || /[\s\u0000-\u001f]/.test(code)) {
    throw new Error('Missing authentication code');
  }
  const target = new URL(returnUrl.href);
  target.searchParams.set('code', code);
  return target.href;
}

export function createAuthReturnScript(targetUrl: string, origin: string) {
  // 임의 스크립트 삽입을 막고 시작한 웹 origin에서만 코드 교환을 재개한다.
  return `if (window.location.origin === ${JSON.stringify(origin)}) { window.location.replace(${JSON.stringify(targetUrl)}); } true;`;
}
