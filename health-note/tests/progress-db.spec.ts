import type { Page } from '@playwright/test';
import { expect, mockAuth, seedSession, test } from './authFixture';

const DATE = '2026-10-16';
const KEY = 'health-note.routine-progress.v1:test-user';
async function seedRoutines(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'health-note.exercises.v1:test-user',
      JSON.stringify([
        { id: 'a', name: '스쿼트', amount: '10회', sets: 3 },
        { id: 'b', name: '걷기', amount: '30분', sets: null },
      ]),
    );
    localStorage.setItem(
      'health-note.routines.v1:test-user',
      JSON.stringify([
        {
          id: 'r',
          name: '오늘 루틴',
          exerciseIds: ['a', 'b'],
          schedule: { type: 'weekdays', days: [0, 1, 2, 3, 4, 5, 6] },
          memo: '',
          isActive: true,
        },
      ]),
    );
  });
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(`${DATE}T12:00:00`) });
  await seedRoutines(page);
});

test('완료 조회 중에는 미완료로 표시하지 않고 실패 후 다시 조회한다', async ({ page }) => {
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/rest/v1/routine_progress?**', async (route) => {
    await pending;
    await route.fulfill({ status: 503, json: { message: 'Unavailable' } });
  });
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('오늘의 루틴을 불러오고 있어요.');
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  release();
  await expect(page.getByRole('alert')).toContainText('완료 상태를 불러오지 못했어요.');
  await page.unroute('**/rest/v1/routine_progress?**');
  await page.getByRole('button', { name: '다시 시도', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: '스쿼트 완료' })).not.toBeChecked();
});

test('응답 대기 중에는 중복 저장을 막고 실패한 체크는 수동 재시도한다', async ({ page }) => {
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let writes = 0;
  await page.route('**/rest/v1/routine_progress?**', async (route) => {
    if (route.request().method() !== 'POST' || route.request().postDataJSON().exercise_id !== 'a')
      return route.fallback();
    writes++;
    await pending;
    await route.fulfill({ status: 503, json: { message: 'Unavailable' } });
  });
  await page.goto('/');
  const checkbox = page.getByRole('checkbox', { name: '스쿼트 완료' });
  await checkbox.click();
  await expect(checkbox).toBeDisabled();
  await expect(checkbox).toBeChecked();
  await expect(checkbox).toHaveCSS('background-color', 'rgb(16, 185, 129)');
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '1');
  const walking = page.getByRole('checkbox', { name: '걷기 완료' });
  await expect(walking).toBeEnabled();
  await checkbox.press('Space');
  await walking.click();
  await expect(walking).toBeEnabled();
  await expect(walking).toBeChecked();
  release();
  await expect(page.getByRole('alert')).toContainText('완료 상태를 저장하지 못했어요.');
  await expect(checkbox).not.toBeChecked();
  expect(writes).toBe(1);
  await expect(walking).toBeChecked();
  await page.unroute('**/rest/v1/routine_progress?**');
  await checkbox.click();
  await expect(checkbox).toBeChecked();
  await expect(checkbox).toBeEnabled();
  await expect(checkbox).toHaveCSS('background-color', 'rgb(16, 185, 129)');
  await page.reload();
  await expect(checkbox).toBeChecked();
});

test('체크 해제 실패는 완료 상태를 유지하고 재시도하면 해제한다', async ({ page }) => {
  await page.goto('/');
  const checkbox = page.getByRole('checkbox', { name: '스쿼트 완료' });
  await checkbox.click();
  await expect(checkbox).toBeChecked();
  await page.route('**/rest/v1/routine_progress?**', async (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    await route.fulfill({ status: 503, json: { message: 'Unavailable' } });
  });
  await checkbox.click();
  await expect(page.getByRole('alert')).toContainText('완료 상태를 저장하지 못했어요.');
  await expect(checkbox).toBeChecked();
  await page.unroute('**/rest/v1/routine_progress?**');
  await checkbox.click();
  await expect(checkbox).not.toBeChecked();
});

test('별도 브라우저의 체크를 재조회하며 서로 다른 운동을 덮어쓰지 않는다', async ({
  page,
  browser,
}) => {
  const server = new Set<string>();
  async function connect(page: Page) {
    await page.route('**/rest/v1/routine_progress?**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const date = url.searchParams.get('date')?.slice(3);
      if (request.method() === 'GET') {
        return route.fulfill({
          json: [...server]
            .filter((key) => key.startsWith(`${date}:`))
            .map((key) => ({ routine_id: 'r', exercise_id: key.split(':')[1] })),
        });
      }
      if (request.method() === 'POST') {
        const body = request.postDataJSON();
        server.add(`${body.date}:${body.exercise_id}`);
      } else {
        server.delete(`${date}:${url.searchParams.get('exercise_id')?.slice(3)}`);
      }
      await route.fulfill({ json: [] });
    });
  }
  await connect(page);
  const otherContext = await browser.newContext();
  try {
    const other = await otherContext.newPage();
    await mockAuth(other);
    await seedSession(other);
    await seedRoutines(other);
    await other.clock.install({ time: new Date(`${DATE}T12:00:00`) });
    await connect(other);
    await page.goto('/');
    await other.goto('http://127.0.0.1:4173/');
    await page.getByRole('checkbox', { name: '스쿼트 완료' }).click();
    await expect(page.getByRole('checkbox', { name: '스쿼트 완료' })).toBeChecked();
    await other.getByRole('checkbox', { name: '걷기 완료' }).click();
    await expect(other.getByRole('checkbox', { name: '걷기 완료' })).toBeChecked();
    await expect(other.getByRole('checkbox', { name: '걷기 완료' })).toBeEnabled();
    await expect(page.getByRole('checkbox', { name: '스쿼트 완료' })).toBeEnabled();
    await page.reload();
    await expect(page.getByRole('checkbox', { name: '걷기 완료' })).toBeChecked();
    await expect(page.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      '운동 2개 중 2개 완료',
    );
    await page.screenshot({ path: 'test-results/progress-db-mobile.png', fullPage: true });
    await other.getByRole('checkbox', { name: '걷기 완료' }).click();
    await expect(other.getByRole('checkbox', { name: '걷기 완료' })).not.toBeChecked();
    await expect(other.getByRole('checkbox', { name: '걷기 완료' })).toBeEnabled();
    await page.reload();
    await expect(page.getByRole('checkbox', { name: '걷기 완료' })).not.toBeChecked();
    await expect(page.getByRole('checkbox', { name: '스쿼트 완료' })).toBeChecked();
  } finally {
    await otherContext.close();
  }
});

test('기존 브라우저 완료 기록은 자동 업로드하거나 삭제하지 않는다', async ({ page }) => {
  const legacy = [{ routineId: 'r', date: DATE, exerciseIds: ['a'] }];
  await page.addInitScript(({ key, legacy }) => localStorage.setItem(key, JSON.stringify(legacy)), {
    key: KEY,
    legacy,
  });
  let uploads = 0;
  await page.route('**/rest/v1/routine_progress?**', async (route) => {
    if (route.request().method() === 'POST') uploads++;
    await route.fulfill({ json: [] });
  });
  await page.goto('/');
  await expect(page.getByRole('checkbox', { name: '스쿼트 완료' })).not.toBeChecked();
  expect(uploads).toBe(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual(legacy);
});

test('저장 중 날짜가 바뀌면 이전 날짜의 완료를 새 날짜에 표시하지 않는다', async ({ page }) => {
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let savedDate = '';
  await page.route('**/rest/v1/routine_progress?**', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    savedDate = route.request().postDataJSON().date;
    await pending;
    await route.fallback();
  });
  await page.goto('/');
  const checkbox = page.getByRole('checkbox', { name: '스쿼트 완료' });
  await checkbox.click();
  await expect(checkbox).toBeDisabled();
  await page.clock.setSystemTime(new Date('2026-10-17T12:00:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('time[datetime="2026-10-17"]')).toBeVisible();
  release();
  await expect(checkbox).toBeEnabled();
  await expect(checkbox).not.toBeChecked();
  expect(savedDate).toBe(DATE);
  await page.clock.setSystemTime(new Date(`${DATE}T12:00:00`));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator(`time[datetime="${DATE}"]`)).toBeVisible();
  await expect(checkbox).toBeChecked();
});
