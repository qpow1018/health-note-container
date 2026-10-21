import { expect, test } from './authFixture';

test('기간 박스를 선택하면 설명과 요약이 바뀌고 좁은 화면에도 맞는다', async ({ page }) => {
  await page.goto('/exercise');
  await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toBeVisible();
  await page.evaluate(() => {
    localStorage.setItem(
      'health-note.routines.v1:test-user',
      JSON.stringify([{ id: 'r', name: '산책 루틴', memo: '', exerciseIds: ['walk'] }]),
    );
    localStorage.setItem(
      'health-note.exercises.v1:test-user',
      JSON.stringify([{ id: 'walk', name: '산책', amount: '20분', sets: null }]),
    );
  });
  await page.goto('/plan/new');
  const period = page.getByRole('group', { name: '플랜 기간', exact: true });
  await expect(period.getByRole('radio', { checked: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '시작 전 확인' })).toContainText(
    '함께할 기간을 선택해 주세요',
  );
  for (const [days, description] of [
    [14, '아직 운동이 낯설다면, 작은 실천부터 습관을 만들어봐요.'],
    [30, '운동이 조금 익숙해졌다면, 한 달 동안 이어가 볼까요?'],
    [100, '운동이 이미 일상이라면, 100일 플랜은 어때요?'],
  ] as const) {
    await period.getByRole('radio', { name: `${days}일`, exact: true }).check();
    await expect(period.getByRole('radio', { checked: true })).toHaveCount(1);
    await expect(period.getByText(description)).toBeVisible();
    await expect(page.getByRole('region', { name: '시작 전 확인' })).toContainText(
      '운동할 요일을 선택해 주세요.',
    );
    await expect(page.getByRole('region', { name: '시작 전 확인' })).toContainText(
      `${days}일 동안 함께해요`,
    );
  }
  const monday = page.getByRole('button', { name: '월요일 휴식' });
  await expect(monday).toContainText('월');
  await monday.click();
  await page
    .getByRole('dialog')
    .getByRole('radio', { name: /^산책 루틴/ })
    .click();
  await expect(page.getByRole('button', { name: '월요일 산책 루틴' })).toBeVisible();
  await expect(page.getByRole('button', { name: '화요일 휴식' })).toBeVisible();
  await expect(page.getByRole('region', { name: '시작 전 확인' })).toContainText(
    '예정된 운동을 모두 완료했을 때의 경험치예요.',
  );
  await page.screenshot({ path: '/tmp/health-note-plan-duration.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
