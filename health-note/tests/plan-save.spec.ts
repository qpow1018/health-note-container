import type { Page } from '@playwright/test';

import { expect, test, mockAuth, seedSession } from './authFixture';

const ROUTINES = [
  { id: 'a', name: 'A루틴', exerciseIds: ['squat'], memo: '' },
  { id: 'b', name: 'B루틴', exerciseIds: ['squat'], memo: '' },
];
const KEY = 'health-note.plans.v1:test-user';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-21T12:00:00+09:00'));
  await page.goto('/plan');
  await expect(page.getByRole('link', { name: '플랜 만들기' })).toBeVisible();
  await page.evaluate((routines) => {
    localStorage.setItem('health-note.routines.v1:test-user', JSON.stringify(routines));
    localStorage.setItem(
      'health-note.exercises.v1:test-user',
      JSON.stringify([{ id: 'squat', name: '스쿼트', amount: '50회', sets: null }]),
    );
  }, ROUTINES);
});

async function fillPlan(page: Page) {
  await page.goto('/plan/new');
  await expect(page.getByRole('button', { name: '플랜 시작', exact: true })).toBeDisabled();
  await page.getByRole('radio', { name: '14일', exact: true }).check();
  await expect(page.getByRole('button', { name: '플랜 시작', exact: true })).toBeDisabled();
  for (const day of ['월요일', '수요일', '금요일']) {
    await page.getByRole('button', { name: day + ' 휴식' }).click();
    await page
      .getByRole('dialog')
      .getByRole('radio', { name: /^A루틴/ })
      .click();
  }
}

test('저장 중 중복 제출을 막고 새로고침 후에도 주간 운동표와 배분 기준을 조회한다', async ({
  page,
}) => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let writes = 0;
  await page.route('**/rest/v1/rpc/create_plan', async (route) => {
    writes++;
    await ready;
    await route.fallback();
  });
  await fillPlan(page);
  await page.getByRole('button', { name: '플랜 시작', exact: true }).click();
  await expect(page.getByRole('button', { name: '시작 중…' })).toBeDisabled();
  await expect(page.getByRole('radio', { name: '30일', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '월요일 A루틴' })).toBeDisabled();
  await page.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit());
  release();
  await expect(page).toHaveURL('/plan');
  await expect(page.getByRole('heading', { name: '진행 중인 플랜' })).toBeVisible();
  await expect(page.getByText('9,000 XP', { exact: true })).toBeVisible();
  await expect(page.getByText('1,500 XP', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('list', { name: '플랜 주간 운동표' }).getByRole('listitem'),
  ).toHaveText([
    '월요일A루틴',
    '화요일휴식',
    '수요일A루틴',
    '목요일휴식',
    '금요일A루틴',
    '토요일휴식',
    '일요일휴식',
  ]);
  await expect(page.getByRole('link', { name: '플랜 만들기' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: '진행 중인 플랜' })).toBeVisible();
  await page.screenshot({ path: '/tmp/health-note-active-plan.png', fullPage: true });
  expect(writes).toBe(1);
  await page.goto('/plan/new');
  await expect(page.getByText('이미 진행 중인 플랜이 있어요.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '플랜 시작', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '플랜 확인' })).toBeVisible();
});

test('저장 실패 후 입력과 요청 ID를 유지해 재시도한다', async ({ page }) => {
  let isFailing = true;
  const ids: string[] = [];
  await page.route('**/rest/v1/rpc/create_plan', async (route) => {
    ids.push(route.request().postDataJSON().plan_id);
    if (isFailing) await route.fulfill({ status: 503, json: { message: 'Test failure' } });
    else await route.fallback();
  });
  await fillPlan(page);
  await page.getByRole('button', { name: '플랜 시작', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('플랜을 시작하지 못했어요.');
  await expect(page.getByRole('radio', { name: '14일', exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: '월요일 A루틴' })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull();
  isFailing = false;
  await page.getByRole('button', { name: '플랜 시작', exact: true }).click();
  await expect(page).toHaveURL('/plan');
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).length, KEY)).toBe(1);
});

test('다른 화면이 먼저 플랜을 저장하면 추가 생성하지 않고 기존 플랜으로 안내한다', async ({
  page,
  context,
}) => {
  await fillPlan(page);
  const other = await context.newPage();
  await mockAuth(other);
  await seedSession(other);
  await fillPlan(other);
  await other.getByRole('button', { name: '플랜 시작', exact: true }).click();
  await expect(other).toHaveURL('/plan');
  await page.getByRole('button', { name: '플랜 시작', exact: true }).click();
  await expect(page).toHaveURL('/plan');
  await expect(page.getByText('이미 진행 중인 플랜이 있어요.', { exact: true })).toBeVisible();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).length, KEY)).toBe(1);
});

test('플랜 조회 실패를 빈 상태로 표시하지 않고 재시도로 복구한다', async ({ page }) => {
  let isFailing = true;
  await page.route('**/rest/v1/plans?*', async (route) => {
    if (isFailing) await route.fulfill({ status: 503, json: { message: 'Test failure' } });
    else await route.fallback();
  });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('플랜을 불러오지 못했어요.');
  await expect(page.getByRole('link', { name: '플랜 만들기' })).toHaveCount(0);
  isFailing = false;
  await page.getByRole('button', { name: '다시 시도', exact: true }).click();
  await expect(page.getByRole('link', { name: '플랜 만들기' })).toBeVisible();
});

test('진행 중 플랜의 루틴과 그 루틴에 연결된 운동은 삭제하지 않는다', async ({ page }) => {
  await fillPlan(page);
  await page.getByRole('button', { name: '플랜 시작', exact: true }).click();
  await expect(page).toHaveURL('/plan');
  await page.goto('/routine/a');
  await page.getByRole('button', { name: '더보기' }).click();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '삭제', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('진행 중인 플랜에서 사용하는 루틴이에요.');
  await expect(page).toHaveURL('/routine/a');
  await page.goto('/exercise/squat');
  await page.getByRole('button', { name: '더보기' }).click();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '삭제', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('루틴에서 사용 중인 운동이에요.');
  await expect(page).toHaveURL('/exercise/squat');
});

test('저장된 응답을 잃어도 같은 요청 ID로 재시도해 중복 플랜을 만들지 않는다', async ({ page }) => {
  let isLost = true;
  await page.route('**/rest/v1/rpc/create_plan', async (route) => {
    if (!isLost) return route.fallback();
    const body = route.request().postDataJSON();
    await page.evaluate(
      ({ key, body }) => {
        localStorage.setItem(
          key,
          JSON.stringify([
            {
              id: body.plan_id,
              start_date: body.plan_start_date,
              time_zone: body.plan_time_zone,
              duration: body.plan_duration,
              status: 'active',
              target_xp: 9000,
              exercise_day_count: 6,
              assignments: body.scheduled_weekdays.map((weekday: number, index: number) => ({
                weekday,
                routine_id: body.routine_ids[index],
              })),
            },
          ]),
        );
      },
      { key: KEY, body },
    );
    await route.fulfill({ status: 503, json: { message: 'Response lost after save' } });
  });
  await fillPlan(page);
  await page.getByRole('button', { name: '플랜 시작', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('플랜을 시작하지 못했어요.');
  isLost = false;
  await page.getByRole('button', { name: '플랜 시작', exact: true }).click();
  await expect(page).toHaveURL('/plan');
  await expect(page.getByRole('heading', { name: '진행 중인 플랜' })).toBeVisible();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).length, KEY)).toBe(1);
});
