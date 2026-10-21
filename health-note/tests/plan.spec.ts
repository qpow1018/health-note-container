import { expect, test } from './authFixture';

const ROUTINES = [
  { id: 'a', name: 'A루틴', exerciseIds: ['squat'], memo: '' },
  { id: 'b', name: 'B루틴', exerciseIds: ['squat'], memo: '' },
];

test('홈 옆 플랜 메뉴에서 빈 상태를 안내하고 루틴 생성 후 복귀한다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link')).toHaveText([
    '홈',
    '플랜',
    '운동',
    '운동장',
    '마이',
  ]);
  await page.getByRole('link', { name: '플랜', exact: true }).click();
  await expect(page.getByRole('link', { name: '플랜', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('link', { name: '플랜 만들기' })).toHaveCount(0);
  await page.evaluate(() =>
    localStorage.setItem(
      'health-note.exercises.v1:test-user',
      JSON.stringify([{ id: 'squat', name: '스쿼트', amount: '50회', sets: null }]),
    ),
  );
  await page.getByRole('link', { name: '루틴 만들기' }).click();
  await expect(page).toHaveURL('/routine/new');
  await page.getByRole('button', { name: '뒤로가기' }).click();
  await expect(page).toHaveURL('/plan');
  await page.getByRole('link', { name: '루틴 만들기' }).click();
  await page.getByLabel('루틴 이름').fill('A루틴');
  await page.getByRole('button', { name: '운동 선택', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('checkbox', { name: /스쿼트/ })
    .check();
  await page.getByRole('button', { name: /선택 완료/ }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/plan');
  await page.goBack();
  await expect(page).toHaveURL('/');
  await page.goForward();
  await expect(page).toHaveURL('/plan');
  await page.getByRole('link', { name: '플랜 만들기' }).click();
  await expect(page.getByRole('heading', { name: '플랜 만들기' })).toBeVisible();
});

test('요일별 루틴과 기간으로 운동일·경험치를 계산하고 휴식으로 변경한다', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-21T12:00:00+09:00'));
  await page.goto('/plan');
  await page.evaluate(
    (items) => localStorage.setItem('health-note.routines.v1:test-user', JSON.stringify(items)),
    ROUTINES,
  );
  await page.reload();
  await page.getByRole('link', { name: '플랜 만들기' }).click();
  await expect(page.getByRole('combobox')).toHaveCount(7);
  for (const select of await page.getByRole('combobox').all()) await expect(select).toHaveValue('');
  await expect(page.getByText('최소 하루에 루틴을 배정해 주세요.')).toBeVisible();
  await page.getByRole('radio', { name: '14일', exact: true }).check();
  for (const day of ['월요일', '수요일', '금요일'])
    await page.getByLabel(day, { exact: true }).selectOption('a');
  for (const day of ['화요일', '목요일', '토요일'])
    await page.getByLabel(day, { exact: true }).selectOption('b');
  const summary = page.getByRole('region', { name: '시작 전 확인' });
  await expect(summary).toContainText('2026-10-21');
  await expect(summary).toContainText('2026-11-03');
  await expect(summary).toContainText('총 운동일12일');
  await expect(summary).toContainText('1,200 XP');
  await expect(page.getByText('최소 하루에 루틴을 배정해 주세요.')).toHaveCount(0);
  await page.screenshot({ path: '/tmp/health-note-plan-form.png', fullPage: true });
  await page.getByRole('radio', { name: '30일', exact: true }).check();
  await expect(summary).toContainText('2026-11-19');
  await expect(summary).toContainText('총 운동일26일');
  await page.getByRole('radio', { name: '100일', exact: true }).check();
  await expect(summary).toContainText('2027-01-28');
  await expect(summary).toContainText('총 운동일86일');
  await page.getByLabel('수요일', { exact: true }).selectOption('');
  await expect(summary).toContainText('총 운동일71일');
  await expect(page.getByRole('button', { name: '플랜 시작', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: '뒤로가기' }).click();
  await expect(page).toHaveURL('/plan');
});

test('조회 실패를 빈 목록으로 표시하지 않고 재시도한다', async ({ page }) => {
  let isFailing = true;
  await page.route('**/rest/v1/routines?*', async (route) => {
    if (!isFailing) return route.fallback();
    await route.fulfill({ status: 500, json: { message: 'Test failure' } });
  });
  await page.goto('/plan/new');
  await expect(page.getByRole('alert')).toContainText('루틴을 불러오지 못했어요.', {
    timeout: 15000,
  });
  await expect(page.getByRole('link', { name: '루틴 만들기' })).toHaveCount(0);
  isFailing = false;
  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.getByRole('link', { name: '루틴 만들기' })).toBeVisible();
});
