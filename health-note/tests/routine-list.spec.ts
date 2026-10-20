import { expect, test } from './authFixture';

const KEY = 'health-note.routines.v1:test-user';
const ROUTINES = [
  {
    id: 'w',
    name: '요일 루틴',
    exerciseIds: ['a'],
    schedule: { type: 'weekdays', days: [3] },
    memo: '',
  },
  {
    id: 'i',
    name: '간격 루틴',
    exerciseIds: ['a'],
    schedule: { type: 'interval', startDate: '2099-10-14', intervalDays: 2 },
    memo: '',
  },
];

test('날짜와 관계없이 전체 루틴을 표시하고 상세에서 목록으로 돌아온다', async ({ page }) => {
  await page.goto('/exercise');
  await page.evaluate(
    (routines) =>
      localStorage.setItem('health-note.routines.v1:test-user', JSON.stringify(routines)),
    ROUTINES,
  );
  await page.goto('/exercise?date=2026-10-15');
  await expect(page.getByRole('listitem')).toHaveText(['요일 루틴운동 1개', '간격 루틴운동 1개']);
  await expect(page.getByLabel('날짜 선택')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '전체 루틴', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: /간격 루틴/ }).click();
  await page.getByRole('button', { name: '뒤로가기' }).click();
  await expect(page.getByRole('listitem')).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole('listitem')).toHaveCount(2);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual(
    ROUTINES,
  );
});

test('빈 목록과 손상 데이터를 구분하고 원본을 보존한다', async ({ page }) => {
  await page.goto('/exercise');
  await expect(page.getByText('아직 등록한 루틴이 없어요.')).toBeVisible();
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), KEY);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('루틴 목록을 불러오지 못했어요.');
  await expect(page.getByText('아직 등록한 루틴이 없어요.')).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe('{broken');
});
