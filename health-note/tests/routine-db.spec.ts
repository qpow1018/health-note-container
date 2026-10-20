import { expect, test } from './authFixture';

const KEY = 'health-note.routines.v1:test-user';
const EXERCISE = { id: 'e', name: '스쿼트', amount: '10회', sets: 3 };
const ROUTINE = {
  id: 'r',
  name: '하체',
  exerciseIds: ['e'],
  schedule: { type: 'weekdays', days: [1] },
  memo: '',
  isActive: false,
};

test('루틴 조회 중에는 빈 목록을 표시하지 않고 오류 후 재시도한다', async ({ page }) => {
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/rest/v1/routines?**', async (route) => {
    await pending;
    await route.fulfill({ status: 503, json: { message: 'Unavailable' } });
  });
  await page.goto('/exercise');
  await expect(page.getByRole('status')).toHaveText('루틴을 불러오고 있어요.');
  await expect(page.getByText('아직 등록한 루틴이 없어요.')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/routine-db-loading-mobile.png' });
  release();
  await expect(page.getByRole('alert')).toContainText('루틴 목록을 불러오지 못했어요.');
  await page.unroute('**/rest/v1/routines?**');
  await page.getByRole('button', { name: '다시 시도', exact: true }).click();
  await expect(page.getByText('아직 등록한 루틴이 없어요.')).toBeVisible();
});

test('원자적 저장 API 실패는 입력을 유지하고 수동 재시도로 한 번만 등록한다', async ({ page }) => {
  await page.goto('/exercise');
  await page.evaluate(
    (exercise) =>
      localStorage.setItem('health-note.exercises.v1:test-user', JSON.stringify([exercise])),
    EXERCISE,
  );
  await page.route('**/rest/v1/rpc/save_routine', (route) =>
    route.fulfill({ status: 409, json: { code: '23503', message: 'Exercise removed' } }),
  );
  await page.goto('/routine/new');
  await page.getByLabel('루틴 이름').fill('실패 후 보존');
  await page.getByLabel('메모').fill('입력을 유지해요');
  await page.getByRole('button', { name: '운동 선택', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('checkbox', { name: /스쿼트/ })
    .check();
  await page.getByRole('button', { name: /선택 완료/ }).click();
  await page.getByLabel('월', { exact: true }).check();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('저장하지 못했어요.');
  await expect(page.getByLabel('루틴 이름')).toHaveValue('실패 후 보존');
  await expect(page.getByLabel('메모')).toHaveValue('입력을 유지해요');
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull();
  await page.unroute('**/rest/v1/rpc/save_routine');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/exercise');
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await page.getByRole('link', { name: /실패 후 보존/ }).click();
  await expect(page.getByRole('switch', { name: '루틴 활성화' })).not.toBeChecked();
  await page.screenshot({ path: 'test-results/routine-db-detail-mobile.png', fullPage: true });
});

test('활성 상태 저장 중에는 중복 변경 요청을 막는다', async ({ page }) => {
  await page.goto('/exercise');
  await page.evaluate(
    ({ key, routine, exercise }) => {
      localStorage.setItem(key, JSON.stringify([routine]));
      localStorage.setItem('health-note.exercises.v1:test-user', JSON.stringify([exercise]));
    },
    { key: KEY, routine: ROUTINE, exercise: EXERCISE },
  );
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let writes = 0;
  await page.route('**/rest/v1/routines?**', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    writes++;
    await pending;
    await route.fallback();
  });
  await page.goto('/routine/r');
  const toggle = page.getByRole('switch', { name: '루틴 활성화' });
  await toggle.click();
  await expect(toggle).toBeDisabled();
  await toggle.press('Space');
  release();
  await expect(toggle).toBeChecked();
  await expect(toggle).toBeEnabled();
  expect(writes).toBe(1);
});

test('기존 브라우저 루틴은 DB에 자동 업로드하거나 삭제하지 않는다', async ({ page }) => {
  await page.addInitScript(
    ({ key, routine }) => localStorage.setItem(key, JSON.stringify([routine])),
    { key: KEY, routine: ROUTINE },
  );
  let uploads = 0;
  await page.route('**/rest/v1/routines?**', (route) => route.fulfill({ json: [] }));
  await page.route('**/rest/v1/rpc/save_routine', async (route) => {
    uploads++;
    await route.fulfill({ json: 'unexpected' });
  });
  await page.goto('/exercise');
  await expect(page.getByText('아직 등록한 루틴이 없어요.')).toBeVisible();
  expect(uploads).toBe(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    ROUTINE,
  ]);
});
