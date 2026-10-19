import { expect, test } from './authFixture';
import type { Page } from '@playwright/test';

const KEY = 'health-note.routines.v1:test-user';
const ROUTINE = {
  id: 'r',
  name: '격일 루틴',
  isActive: false,
  exerciseIds: ['a'],
  schedule: { type: 'interval', startDate: '2026-10-14', intervalDays: 2 },
  memo: '',
};
const OTHER = { ...ROUTINE, id: 'other', schedule: { type: 'weekdays', days: [1] } };

test.use({ timezoneId: 'Asia/Seoul' });
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-18T01:00:00Z') });
  await page.goto('/routine');
  await page.evaluate(
    (routines) => {
      localStorage.setItem('health-note.routines.v1:test-user', JSON.stringify(routines));
      localStorage.setItem(
        'health-note.exercises.v1:test-user',
        JSON.stringify([{ id: 'a', name: '걷기', amount: '30분', sets: null }]),
      );
    },
    [ROUTINE, OTHER],
  );
});

test('관리 상세에는 수행 조작이 없으며 기존 미루기 저장·계산은 유지한다', async ({ page }) => {
  await page.goto('/routine/r');
  await expect(page.getByRole('button', { name: '하루 미루기' })).toHaveCount(0);
  expect(await postpone(page, '2026-10-18')).toBe(true);
  expect(await postpone(page, '2026-10-19')).toBe(true);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    { ...ROUTINE, schedule: { ...ROUTINE.schedule, postponedDates: ['2026-10-18', '2026-10-19'] } },
    OTHER,
  ]);
});

test('이름 수정은 미루기를 유지하고 반복 간격 변경은 내역을 초기화한다', async ({ page }) => {
  expect(await postpone(page, '2026-10-18')).toBe(true);
  await page.goto('/routine/r/edit');
  await expect(
    page.getByText('시작일이나 반복 간격을 변경하면 미루기 내역이 초기화돼요.'),
  ).toBeVisible();
  await page.getByLabel('루틴 이름').fill('이름만 변경');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/routine/r');
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!)[0].schedule.postponedDates,
      KEY,
    ),
  ).toEqual(['2026-10-18']);
  await page.goto('/routine/r/edit');
  await page.getByLabel('반복 간격').fill('3');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/routine/r');
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!)[0].schedule, KEY),
  ).toEqual({ type: 'interval', startDate: '2026-10-14', intervalDays: 3 });
});

test('미루기 저장 실패는 기존 데이터를 보존한다', async ({ page }) => {
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  expect(await postpone(page, '2026-10-18')).toBe(false);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    ROUTINE,
    OTHER,
  ]);
});

test('오래된 예정일은 다시 미루지 않고 현재 날짜를 기준으로 검증한다', async ({ page }) => {
  expect(await postpone(page, '2026-10-18')).toBe(true);
  expect(await postpone(page, '2026-10-18')).toBe(false);
  await page.clock.setSystemTime(new Date('2026-10-21T01:00:00Z'));
  expect(await postpone(page, '2026-10-19')).toBe(false);
  expect(await postpone(page, '2026-10-21')).toBe(true);
});

async function postpone(page: Page, date: string) {
  return page.evaluate(async (date) => {
    const modulePath = '/src/features/routine/routineActions.ts';
    const { postponeRoutine } = await import(modulePath);
    try {
      await postponeRoutine('r', date);
      return true;
    } catch {
      return false;
    }
  }, date);
}
