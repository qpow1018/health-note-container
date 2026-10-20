import { expect, test } from './authFixture';

const KEY = 'health-note.routines.v1:test-user';
const ROUTINE = {
  id: 'r',
  name: '3일 간격 루틴',
  isActive: true,
  exerciseIds: ['walk'],
  schedule: { type: 'interval', startDate: '2026-09-30', intervalDays: 3 },
  memo: '',
};

test.use({ timezoneId: 'Asia/Seoul' });
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-16T03:00:00Z') });
  await page.goto('/exercise');
  await page.evaluate(
    ({ key, routine }) => {
      localStorage.setItem(key, JSON.stringify([routine]));
      localStorage.setItem(
        'health-note.exercises.v1:test-user',
        JSON.stringify([{ id: 'walk', name: '걷기', amount: '30분', sets: null }]),
      );
    },
    { key: KEY, routine: ROUTINE },
  );
});

for (const { startDate, expected } of [
  { startDate: '2026-09-28', expected: '오늘 · 2026년 10월 16일' },
  { startDate: '2026-09-29', expected: '내일 · 2026년 10월 17일' },
  { startDate: '2026-09-30', expected: '2일 후 · 2026년 10월 18일' },
  { startDate: '2026-10-20', expected: '4일 후 · 2026년 10월 20일' },
]) {
  test(`반복 규칙으로부터 가까운 예정일을 표시한다: ${expected}`, async ({ page }) => {
    const routine = { ...ROUTINE, schedule: { ...ROUTINE.schedule, startDate } };
    await page.evaluate(
      ({ key, routine }) => localStorage.setItem(key, JSON.stringify([routine])),
      { key: KEY, routine },
    );
    await page.goto('/routine/r');
    await expect(page.getByText('다음 예정일', { exact: true })).toBeVisible();
    await expect(page.locator('dd')).toHaveText(expected);
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
      routine,
    ]);
    if (startDate === '2026-09-30')
      await page.screenshot({ path: '/tmp/health-note-routine-next-date.png', fullPage: true });
  });
}

test('비활성 상태는 활성화 시 예정일로 구분하고 전환해도 주기와 미루기 내역을 유지한다', async ({
  page,
}) => {
  const routine = {
    ...ROUTINE,
    isActive: false,
    schedule: { ...ROUTINE.schedule, postponedDates: ['2026-10-15'] },
  };
  await page.evaluate(({ key, routine }) => localStorage.setItem(key, JSON.stringify([routine])), {
    key: KEY,
    routine,
  });
  await page.goto('/routine/r');
  await expect(page.getByText('활성화 시 다음 예정일', { exact: true })).toBeVisible();
  await expect(page.locator('dd')).toHaveText('오늘 · 2026년 10월 16일');
  await page.getByRole('switch', { name: '루틴 활성화' }).click();
  await expect(page.getByText('다음 예정일', { exact: true })).toBeVisible();
  await expect(page.locator('dd')).toHaveText('오늘 · 2026년 10월 16일');
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!)[0].schedule, KEY),
  ).toEqual(routine.schedule);
});

test('요일 반복도 오늘부터 가장 가까운 선택 요일을 표시한다', async ({ page }) => {
  await page.evaluate(
    ({ key, routine }) =>
      localStorage.setItem(
        key,
        JSON.stringify([{ ...routine, schedule: { type: 'weekdays', days: [1, 5] } }]),
      ),
    { key: KEY, routine: ROUTINE },
  );
  await page.goto('/routine/r');
  await expect(page.locator('dd')).toHaveText('오늘 · 2026년 10월 16일');
  await page.clock.setSystemTime(new Date('2026-10-17T03:00:00Z'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('dd')).toHaveText('2일 후 · 2026년 10월 19일');
});

test('자정을 지나면 날짜를 다시 계산한다', async ({ page }) => {
  await page.clock.setSystemTime(new Date('2026-10-16T14:59:59Z'));
  await page.goto('/routine/r');
  await expect(page.locator('dd')).toHaveText('2일 후 · 2026년 10월 18일');
  await page.clock.runFor(2000);
  await expect(page.locator('dd')).toHaveText('내일 · 2026년 10월 18일');
});

for (const eventName of ['focus', 'pageshow', 'visibilitychange']) {
  test(`${eventName} 복귀 시 날짜를 갱신한다`, async ({ page }) => {
    await page.goto('/routine/r');
    await page.clock.setSystemTime(new Date('2026-10-19T03:00:00Z'));
    await page.evaluate((name) => {
      if (name === 'visibilitychange') {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          value: 'visible',
        });
        document.dispatchEvent(new Event(name));
      } else window.dispatchEvent(new Event(name));
    }, eventName);
    await expect(page.locator('dd')).toHaveText('2일 후 · 2026년 10월 21일');
  });
}

test('표시 범위를 넘는 예정일은 날짜 대신 안내를 표시한다', async ({ page }) => {
  await page.evaluate(
    ({ key, routine }) =>
      localStorage.setItem(
        key,
        JSON.stringify([
          { ...routine, schedule: { ...routine.schedule, intervalDays: Number.MAX_SAFE_INTEGER } },
        ]),
      ),
    { key: KEY, routine: ROUTINE },
  );
  await page.goto('/routine/r');
  await expect(page.locator('dd')).toHaveText('표시할 수 있는 다음 예정일이 없어요.');
  await expect(page.locator('time')).toHaveCount(0);
});
