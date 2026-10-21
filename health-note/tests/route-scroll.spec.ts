import { expect, test } from './authFixture';

test('새 경로는 상단으로 이동하고 쿼리 전환과 POP 이동에는 초기화하지 않는다', async ({ page }) => {
  await page.goto('/plan');
  await page.evaluate(() => {
    localStorage.setItem(
      'health-note.exercises.v1:test-user',
      JSON.stringify([{ id: 'walk', name: '산책', amount: '20분', sets: null }]),
    );
    localStorage.setItem(
      'health-note.routines.v1:test-user',
      JSON.stringify([{ id: 'r', name: '산책 루틴', memo: '', exerciseIds: ['walk'] }]),
    );
  });
  await page.reload();
  await page.setViewportSize({ width: 390, height: 500 });
  await page.getByRole('link', { name: '플랜 만들기', exact: true }).scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await page.getByRole('link', { name: '플랜 만들기', exact: true }).click();
  await expect(page).toHaveURL('/plan/new');
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(page.getByRole('heading', { name: '플랜 만들기' })).toBeInViewport();

  await page.goto('/exercise');
  await expect(page.getByRole('link', { name: '등록한 운동' })).toBeVisible();
  // 페이지 길이 차이로 브라우저가 스크롤을 보정하지 않도록 동일한 높이를 확보한다.
  await page.addStyleTag({ content: 'body { min-height: 2400px; }' });
  await page.evaluate(() => {
    const calls: unknown[] = [];
    Object.defineProperty(window, 'scrollResetCalls', { value: calls, configurable: true });
    const original = window.scrollTo.bind(window);
    window.scrollTo = (...args: Parameters<typeof window.scrollTo>) => {
      calls.push(args);
      original(...args);
    };
  });
  await page.getByRole('link', { name: '등록한 운동' }).click();
  await expect(page).toHaveURL('/exercise?tab=exercises');
  expect(await page.evaluate(() => Reflect.get(window, 'scrollResetCalls').length)).toBe(0);
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.goBack();
  await expect(page).toHaveURL('/exercise');
  // 테스트에서 호출한 scrollTo(0, 400) 외에 초기화 호출이 없어야 한다.
  expect(await page.evaluate(() => Reflect.get(window, 'scrollResetCalls').length)).toBe(1);
  await page.goForward();
  await expect(page).toHaveURL('/exercise?tab=exercises');
  expect(await page.evaluate(() => Reflect.get(window, 'scrollResetCalls').length)).toBe(1);
});
