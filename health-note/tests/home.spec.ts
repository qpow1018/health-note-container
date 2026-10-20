import { expect, test } from './authFixture';
test('플랜 연결 전 홈은 기존 루틴을 실행하거나 기록을 수정하지 않는다', async ({ page }) => {
  await page.goto('/');
  const original = { routineId: 'r', date: '2026-10-20', exerciseId: 'e' };
  await page.evaluate(
    (record) => localStorage.setItem('health-note.progress.v1:test-user', JSON.stringify([record])),
    original,
  );
  await page.reload();
  await expect(
    page.getByText('루틴을 만들어 두세요. 플랜과 연결하는 기능을 준비하고 있어요.'),
  ).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('health-note.progress.v1:test-user')!),
    ),
  ).toEqual([original]);
});
