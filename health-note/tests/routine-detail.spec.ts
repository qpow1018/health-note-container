import { expect, test, mockAuth } from './authFixture';

const ROUTINE = {
  id: 'routine-1',
  name: '상체 루틴',
  isActive: false,
  exerciseIds: ['walk', 'squat'],
  schedule: { type: 'weekdays', days: [0, 5, 1] },
  memo: '천천히\n무리하지 않기',
};
const EXERCISES = [
  { id: 'squat', name: '스쿼트', amount: '10회', sets: 3 },
  { id: 'walk', name: '걷기', amount: '30분', sets: null },
];

test.beforeEach(async ({ page }) => {
  await page.goto('/exercise');
  await page.evaluate(
    ({ routine, exercises }) => {
      localStorage.setItem('health-note.routines.v1:test-user', JSON.stringify([routine]));
      localStorage.setItem('health-note.exercises.v1:test-user', JSON.stringify(exercises));
    },
    { routine: ROUTINE, exercises: EXERCISES },
  );
});

test('목록에서 상세로 이동해 저장된 운동 순서와 메모를 표시한다', async ({ page }) => {
  await page.reload();
  const listUrl = page.url();
  await page.getByRole('link', { name: /상체 루틴/ }).click();
  await expect(page).toHaveURL('/routine/routine-1');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('상체 루틴');
  await expect(page.getByRole('listitem')).toHaveText(['걷기30분', '스쿼트10회 × 3세트']);
  await expect(page.getByText('천천히\n무리하지 않기', { exact: true })).toHaveCSS(
    'white-space',
    'pre-wrap',
  );
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('상체 루틴');
  await page.getByRole('button', { name: '뒤로가기' }).click();
  await expect(page).toHaveURL(listUrl);
});

test('기존 일정은 표시하지 않고 빈 메모와 직접 진입 뒤로가기를 처리한다', async ({
  page,
  context,
}) => {
  await page.evaluate(
    (routine) =>
      localStorage.setItem(
        'health-note.routines.v1:test-user',
        JSON.stringify([
          {
            ...routine,
            schedule: { type: 'interval', startDate: '2026-10-14', intervalDays: 2 },
            memo: '',
          },
        ]),
      ),
    ROUTINE,
  );
  const direct = await context.newPage();
  await mockAuth(direct);
  await direct.goto('/routine/routine-1');
  await expect(direct.getByText('반복 일정', { exact: true })).toHaveCount(0);
  await expect(direct.getByText('-', { exact: true })).toBeVisible();
  await direct.getByRole('button', { name: '뒤로가기' }).click();
  await expect(direct).toHaveURL('/exercise');
});

test('삭제된 운동의 자리를 유지하며 다른 운동과 루틴 데이터는 보존한다', async ({ page }) => {
  await page.evaluate(
    (exercises) =>
      localStorage.setItem('health-note.exercises.v1:test-user', JSON.stringify([exercises[0]])),
    EXERCISES,
  );
  await page.goto('/routine/routine-1');
  await expect(page.getByRole('listitem')).toHaveText(['삭제된 운동이에요.', '스쿼트10회 × 3세트']);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('health-note.routines.v1:test-user')!),
    ),
  ).toEqual([ROUTINE]);
});

test('없는 루틴과 손상된 루틴 저장 데이터를 구분한다', async ({ page }) => {
  await page.goto('/routine/missing');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('루틴을 찾을 수 없어요.');
  await expect(page.getByRole('heading', { name: '운동', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '뒤로가기' }).click();
  await expect(page).toHaveURL('/exercise');
  await page.evaluate(() => localStorage.setItem('health-note.routines.v1:test-user', '{broken'));
  await page.goto('/routine/routine-1');
  await expect(page.getByRole('alert')).toContainText('루틴을 불러오지 못했어요.');
  expect(await page.evaluate(() => localStorage.getItem('health-note.routines.v1:test-user'))).toBe(
    '{broken',
  );
});

test('운동 저장 데이터 손상은 삭제 안내로 처리하지 않고 루틴 정보는 표시한다', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('health-note.exercises.v1:test-user', '{broken'));
  await page.goto('/routine/routine-1');
  await expect(page.getByRole('alert')).toContainText('운동 목록을 불러오지 못했어요.');
  await expect(page.getByText('삭제된 운동이에요.')).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem('health-note.exercises.v1:test-user')),
  ).toBe('{broken');
});
