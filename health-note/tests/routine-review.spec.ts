import { expect, test, mockAuth } from './authFixture';

const KEY = 'health-note.routines.v1:test-user';
const ROUTINE = {
  id: 'r',
  name: '기존 루틴',
  isActive: false,
  exerciseIds: ['a'],
  schedule: { type: 'interval', startDate: '2026-10-14', intervalDays: 2 },
  memo: '',
};
const EXERCISE = { id: 'a', name: '걷기', amount: '30분', sets: null };

test.use({ timezoneId: 'Asia/Seoul' });
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-18T14:59:59Z') });
  await page.goto('/routine');
  await page.evaluate(
    ({ routine, exercise }) => {
      localStorage.setItem('health-note.routines.v1:test-user', JSON.stringify([routine]));
      localStorage.setItem('health-note.exercises.v1:test-user', JSON.stringify([exercise]));
    },
    { routine: ROUTINE, exercise: EXERCISE },
  );
});

test('오래 열린 수정 폼은 다른 탭의 일정과 미루기 내역을 덮어쓰지 않는다', async ({
  page,
  context,
}) => {
  await page.goto('/routine/r/edit');
  await page.getByLabel('루틴 이름').fill('내가 편집한 이름');
  const otherTab = await context.newPage();
  await mockAuth(otherTab);
  await otherTab.goto('/routine');
  const updated = {
    ...ROUTINE,
    schedule: { ...ROUTINE.schedule, intervalDays: 3, postponedDates: ['2026-10-17'] },
  };
  await otherTab.evaluate(
    ({ key, updated }) => localStorage.setItem(key, JSON.stringify([updated])),
    { key: KEY, updated },
  );
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('다른 화면에서 변경');
  await expect(page.getByLabel('루틴 이름')).toHaveValue('내가 편집한 이름');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    updated,
  ]);
  await page.getByRole('button', { name: '뒤로가기' }).click();
  await page.getByRole('button', { name: '더보기', exact: true }).click();
  await page.getByRole('link', { name: '수정', exact: true }).click();
  await expect(page.getByLabel('반복 간격')).toHaveValue('3');
  await page.getByLabel('루틴 이름').fill('최신 내용으로 수정');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/routine/r');
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!)[0].schedule, KEY),
  ).toEqual(updated.schedule);
});

test('운동 선택을 다시 열면 추가·삭제를 반영하고 폼 입력을 유지한다', async ({ page, context }) => {
  await page.goto('/routine/r/edit');
  await page.getByLabel('메모').fill('유지할 입력');
  const otherTab = await context.newPage();
  await mockAuth(otherTab);
  await otherTab.goto('/exercise?tab=exercises');
  await otherTab.evaluate(() =>
    localStorage.setItem(
      'health-note.exercises.v1:test-user',
      JSON.stringify([{ id: 'b', name: '스쿼트', amount: '10회', sets: 3 }]),
    ),
  );
  await page.getByRole('button', { name: /^(운동 선택|선택 변경)$/ }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('checkbox', { name: /스쿼트/ })).toBeVisible();
  await expect(sheet.getByRole('checkbox', { name: /걷기/ })).toHaveCount(0);
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(page.getByText('삭제된 운동', { exact: true })).toBeVisible();
  await expect(page.getByLabel('메모')).toHaveValue('유지할 입력');
  await page.getByRole('button', { name: '삭제된 운동 제거' }).click();
  await page.getByRole('button', { name: /^(운동 선택|선택 변경)$/ }).click();
  await sheet.getByRole('checkbox', { name: /스쿼트/ }).check();
  await page.getByRole('button', { name: /선택 완료/ }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/routine/r');
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!)[0].exerciseIds, KEY),
  ).toEqual(['b']);
});

test('운동 목록 읽기 실패 후 다시 선택하면 복구하고 입력을 유지한다', async ({ page }) => {
  await page.goto('/routine/r/edit');
  await page.getByLabel('메모').fill('복구 후 유지');
  await page.evaluate(() => localStorage.setItem('health-note.exercises.v1:test-user', '{broken'));
  await page.getByRole('button', { name: /^(운동 선택|선택 변경)$/ }).click();
  await expect(page.getByRole('alert')).toContainText('운동 목록을 불러오지 못했어요.');
  await page.evaluate(
    (exercise) =>
      localStorage.setItem('health-note.exercises.v1:test-user', JSON.stringify([exercise])),
    EXERCISE,
  );
  await page.getByRole('button', { name: /^(운동 선택|선택 변경)$/ }).click();
  await expect(page.getByRole('dialog').getByRole('checkbox', { name: /걷기/ })).toBeChecked();
  await page.getByRole('button', { name: /선택 완료/ }).click();
  await expect(page.getByLabel('메모')).toHaveValue('복구 후 유지');
  await expect(page.getByRole('alert')).toHaveCount(0);
});
