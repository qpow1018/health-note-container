import { expect, test } from '@playwright/test';

import { AUTH_STORAGE_KEY, createSession, mockAuth, seedSession } from './authFixture';

test.beforeEach(async ({ page }) => {
  await mockAuth(page);
});

test('미로그인 사용자는 상세·수정 주소에서도 로그인 화면만 본다', async ({ page }) => {
  for (const path of ['/', '/my', '/exercise/new', '/routine/example/edit']) {
    await page.goto(path);
    await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toBeVisible();
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await expect(page.locator('form')).toHaveCount(0);
  }
  await page.screenshot({ path: 'test-results/login-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 568 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('세션 복원·새로고침·로그아웃 후 뒤로가기와 재접속', async ({ page }) => {
  await seedSession(page);
  await page.goto('/exercise');
  await expect(page.getByRole('heading', { name: '내 운동 관리' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '내 운동 관리' })).toBeVisible();
  await page.getByRole('link', { name: '마이', exact: true }).click();
  await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), AUTH_STORAGE_KEY)).toBeNull();
});

test('계정별 기록을 분리하고 기존 비로그인 기록을 가져오거나 삭제하지 않는다', async ({ page }) => {
  const legacy = [{ id: 'legacy', name: '이전 운동', amount: '', sets: null }];
  await seedSession(page);
  await page.addInitScript((items) => {
    localStorage.setItem('health-note.exercises.v1', JSON.stringify(items));
  }, legacy);
  await page.goto('/exercise');
  await expect(page.getByText('아직 등록한 운동이 없어요.')).toBeVisible();
  await page.getByRole('link', { name: '운동 추가', exact: true }).click();
  await page.getByLabel('운동 이름').fill('A 계정 운동');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A 계정 운동' })).toBeVisible();
  await page.evaluate(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), {
    key: AUTH_STORAGE_KEY,
    session: createSession('other-user'),
  });
  await page.reload();
  await expect(page.getByText('아직 등록한 운동이 없어요.')).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('health-note.exercises.v1')!)),
  ).toEqual(legacy);
  await page.evaluate(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), {
    key: AUTH_STORAGE_KEY,
    session: createSession(),
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'A 계정 운동' })).toBeVisible();
});

test('로그인 요청 실패와 제공자 미설정에서 재시도할 수 있다', async ({ page }) => {
  await page.route('**/auth/v1/settings', (route) => route.abort('failed'));
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Google로 계속하기' });
  await button.click();
  await expect(page.getByRole('alert')).toContainText('로그인을 시작하지 못했어요.');
  await expect(button).toBeEnabled();
  await page.unroute('**/auth/v1/settings');
  await page.route('**/auth/v1/settings', (route) =>
    route.fulfill({ json: { external: { google: false } } }),
  );
  await button.click();
  await expect(page.getByRole('alert')).toContainText('구글 로그인 연결을 준비하고 있어요.');
  await expect(button).toBeEnabled();
});

test('OAuth 요청은 Google과 현재 origin의 복귀 주소·PKCE를 사용한다', async ({ page }) => {
  let authorizationUrl = '';
  await page.route('**/auth/v1/authorize?**', async (route) => {
    authorizationUrl = route.request().url();
    await route.fulfill({
      status: 302,
      headers: {
        location: 'http://127.0.0.1:4173/?error=access_denied&error_description=Cancelled',
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Google로 계속하기' }).click();
  await expect(page.getByRole('alert')).toContainText('로그인을 완료하지 못했어요.');
  const url = new URL(authorizationUrl);
  expect(url.searchParams.get('provider')).toBe('google');
  expect(url.searchParams.get('redirect_to')).toBe('http://127.0.0.1:4173/');
  expect(url.searchParams.get('code_challenge')).toBeTruthy();
  expect(url.searchParams.get('code_challenge_method')).toBe('s256');
  await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toBeEnabled();
});

test('PKCE 복귀 코드 교환에 성공하면 홈으로 진입한다', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(
    (key) => localStorage.setItem(`${key}-code-verifier`, JSON.stringify('test-code-verifier')),
    AUTH_STORAGE_KEY,
  );
  await page.goto('/?code=test-code');
  await expect(page.getByRole('heading', { name: '헬스노트' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toBeVisible();
  expect(new URL(page.url()).searchParams.has('code')).toBe(false);
});

test('로그아웃 서버 실패에도 기기 세션을 제거하고 기록은 보존한다', async ({ page }) => {
  await seedSession(page);
  await page.route('**/auth/v1/logout?**', (route) =>
    route.fulfill({ status: 500, json: { message: 'Service unavailable' } }),
  );
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('health-note.exercises.v1:test-user', '[]'));
  await page.getByRole('link', { name: '마이', exact: true }).click();
  const button = page.getByRole('button', { name: '로그아웃', exact: true });
  await button.click();
  await expect(page.getByRole('alert')).toContainText('로그아웃을 서버에서 확인하지 못했어요.');
  await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), AUTH_STORAGE_KEY)).toBeNull();
  expect(
    await page.evaluate(() => localStorage.getItem('health-note.exercises.v1:test-user')),
  ).toBe('[]');
});

test('만료된 세션의 갱신 거부 시 보호 화면을 표시하지 않는다', async ({ page }) => {
  const session = { ...createSession(), expires_at: 1 };
  await page.addInitScript(
    ({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
    { key: AUTH_STORAGE_KEY, session },
  );
  await page.route('**/auth/v1/token?**', (route) =>
    route.fulfill({
      status: 400,
      json: { error_code: 'refresh_token_not_found', msg: 'Invalid refresh token' },
    }),
  );
  await page.goto('/exercise');
  await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
});

test('다른 탭에서 로그아웃하면 열린 수정 화면도 즉시 닫힌다', async ({ page, context }) => {
  await seedSession(page);
  await page.goto('/my');
  await expect(page.getByRole('button', { name: '로그아웃', exact: true })).toBeVisible();
  const otherPage = await context.newPage();
  await mockAuth(otherPage);
  await otherPage.goto('/exercise/new');
  await expect(otherPage.getByLabel('운동 이름')).toBeVisible();
  await otherPage.getByLabel('운동 이름').fill('저장하지 않은 입력');
  await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  await expect(otherPage.getByRole('button', { name: 'Google로 계속하기' })).toBeVisible();
  await expect(otherPage.locator('form')).toHaveCount(0);
  await otherPage.close();
});

test('세션 갱신을 기다리는 동안 로그인·보호 화면을 먼저 표시하지 않는다', async ({ page }) => {
  const session = { ...createSession(), expires_at: 1 };
  await page.addInitScript(
    ({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
    { key: AUTH_STORAGE_KEY, session },
  );
  let releaseRefresh: () => void = () => {};
  const refresh = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  await page.route('**/auth/v1/token?**', async (route) => {
    await refresh;
    await route.fulfill({ json: createSession() });
  });
  await page.goto('/exercise');
  await expect(page.getByRole('status')).toHaveText('로그인 상태를 확인하고 있어요.');
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toHaveCount(0);
  releaseRefresh();
  await expect(page.getByRole('heading', { name: '내 운동 관리' })).toBeVisible();
});
