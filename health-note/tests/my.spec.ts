import { test, expect, AUTH_STORAGE_KEY, createSession } from './authFixture';

test('홈에서 마이로 이동해 계정을 확인하고 새로고침해도 유지한다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '헬스노트' })).toBeVisible();
  await expect(page.getByRole('button', { name: '로그아웃', exact: true })).toHaveCount(0);
  const links = page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link');
  await expect(links).toHaveText(['홈', '루틴', '운동', '마이']);
  await links.last().click();
  await expect(page).toHaveURL('/my');
  await expect(links.last()).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: '마이페이지' })).toBeVisible();
  await expect(page.getByText('test-user@example.test', { exact: true })).toBeVisible();
  await expect(page.getByText('Google', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('test-user@example.test', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/my-mobile.png', fullPage: true });
  await page.getByRole('link', { name: '홈', exact: true }).click();
  await expect(page.getByRole('heading', { name: '헬스노트' })).toBeVisible();
});

test('좁은 화면에서도 긴 이메일이 가로 넘침 없이 표시된다', async ({ page }) => {
  const session = createSession();
  session.user.email = `${'long-email-'.repeat(12)}@example.test`;
  await page.addInitScript(
    ({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
    { key: AUTH_STORAGE_KEY, session },
  );
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/my');
  await expect(page.getByRole('heading', { name: '마이페이지' })).toBeVisible();
  await expect(page.getByText(session.user.email, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
