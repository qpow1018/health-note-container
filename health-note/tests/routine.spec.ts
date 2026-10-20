import { expect, test } from './authFixture';

const KEY = 'health-note.routines.v1:test-user';
const EXERCISES = [{ id: 'squat', name: '스쿼트', amount: '50회', sets: null }];
test.beforeEach(async ({ page }) => {
  await page.goto('/exercise');
  await page.evaluate(
    (items) => localStorage.setItem('health-note.exercises.v1:test-user', JSON.stringify(items)),
    EXERCISES,
  );
  await page.getByRole('link', { name: '루틴 추가' }).click();
});

test('일정 없이 운동 묶음을 생성하고 목록과 상세에 표시한다', async ({ page }) => {
  await expect(page.getByText('반복 일정', { exact: true })).toHaveCount(0);
  await page.getByLabel('루틴 이름').fill('생활운동');
  await page.getByRole('button', { name: '운동 선택', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('checkbox', { name: /스쿼트/ })
    .check();
  await page.getByRole('button', { name: /선택 완료/ }).click();
  await page.getByLabel('메모').fill('내 몸에 맞게');
  const request = page.waitForRequest((req) => req.url().includes('rpc/save_routine_bundle'));
  await page.getByRole('button', { name: '저장', exact: true }).click();
  expect((await request).postDataJSON()).not.toHaveProperty('routine_schedule');
  await expect(page).toHaveURL('/exercise');
  await expect(page.getByText('운동 1개', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /생활운동/ }).click();
  await expect(page.getByRole('heading', { name: '생활운동' })).toBeVisible();
  await expect(page.getByRole('switch')).toHaveCount(0);
  await expect(page.getByText('반복 일정', { exact: true })).toHaveCount(0);
  await expect(page.getByText('내 몸에 맞게')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '생활운동' })).toBeVisible();
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!)[0].exerciseIds, KEY),
  ).toEqual(['squat']);
  await page.screenshot({ path: '/tmp/health-note-routine-bundle.png' });
});

test('빈 운동 묶음과 공백 이름은 저장하지 않는다', async ({ page }) => {
  await page.getByLabel('루틴 이름').fill('  ');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByText('루틴 이름을 입력해 주세요.')).toBeVisible();
  await page.getByLabel('루틴 이름').fill('생활운동');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByText('운동을 하나 이상 선택해 주세요.')).toBeVisible();
});
