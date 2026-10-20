import { expect, test } from './authFixture';

const KEY = 'health-note.routines.v1:test-user';
const LEGACY = {
  id: 'r',
  name: '상체 루틴',
  exerciseIds: ['walk', 'squat'],
  schedule: {
    type: 'interval',
    startDate: '2026-10-14',
    intervalDays: 2,
    postponedDates: ['2026-10-16'],
  },
  memo: '천천히 진행하기',
};
const OTHER = { ...LEGACY, id: 'other', name: '하체 루틴', isActive: false };

test.beforeEach(async ({ page }) => {
  await page.goto('/exercise');
  await page.evaluate(
    ({ key, routines }) => {
      localStorage.setItem(key, JSON.stringify(routines));
      localStorage.setItem(
        'health-note.exercises.v1:test-user',
        JSON.stringify([
          { id: 'walk', name: '걷기', amount: '30분', sets: null },
          { id: 'squat', name: '스쿼트', amount: '10회', sets: 3 },
        ]),
      );
    },
    { key: KEY, routines: [LEGACY, OTHER] },
  );
  await page.goto('/routine/r');
  await expect(page.getByRole('switch', { name: '루틴 활성화' })).toBeVisible();
});

test('기존 필드가 없는 데이터는 비활성으로 읽고 조회만으로 원본을 쓰지 않는다', async ({
  page,
}) => {
  await expect(page.getByRole('switch', { name: '루틴 활성화' })).not.toBeChecked();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    LEGACY,
    OTHER,
  ]);
  await expect(page.getByText('2일 간격', { exact: true })).toBeVisible();
  await expect(page.getByText('2026년 10월 14일부터 시작', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '하루 미루기' })).toHaveCount(0);
});

test('여러 루틴을 독립적으로 활성화·비활성화하고 설정·순서·미루기 내역을 유지한다', async ({
  page,
}) => {
  const toggle = page.getByRole('switch', { name: '루틴 활성화' });
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).toBeChecked();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    { ...LEGACY, isActive: true },
    OTHER,
  ]);
  await page.screenshot({ path: '/tmp/health-note-routine-management.png', fullPage: true });
  await page.reload();
  await expect(toggle).toBeChecked();
  await page.goto('/routine/other');
  await toggle.click();
  await expect(toggle).toBeChecked();
  await page.goto('/routine/r');
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    { ...LEGACY, isActive: false },
    { ...OTHER, isActive: true },
  ]);
  await page.getByRole('button', { name: '뒤로가기' }).click();
  await page.goto('/exercise');
  await expect(page.getByRole('link', { name: /상체 루틴/ })).toContainText('비활성');
  await expect(page.getByRole('link', { name: /하체 루틴/ })).toContainText('활성');
});

test('상태 저장 실패는 화면과 원본을 유지하고 다시 시도할 수 있다', async ({ page }) => {
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      Storage.prototype.setItem = original;
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  const toggle = page.getByRole('switch', { name: '루틴 활성화' });
  await toggle.click();
  await expect(page.getByRole('alert')).toContainText('활성 상태를 변경하지 못했어요.');
  await expect(toggle).not.toBeChecked();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    LEGACY,
    OTHER,
  ]);
  await toggle.click();
  await expect(toggle).toBeChecked();
});

test('다른 화면의 최신 설정은 보존하고 활성 상태 충돌은 알려주고 최신 상태를 표시한다', async ({
  page,
}) => {
  const changed = { ...LEGACY, name: '최신 루틴', memo: '최신 메모', isActive: false };
  await page.evaluate(({ key, items }) => localStorage.setItem(key, JSON.stringify(items)), {
    key: KEY,
    items: [changed, OTHER],
  });
  const toggle = page.getByRole('switch', { name: '루틴 활성화' });
  await toggle.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('최신 루틴');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    { ...changed, isActive: true },
    OTHER,
  ]);
  await page.evaluate(({ key, items }) => localStorage.setItem(key, JSON.stringify(items)), {
    key: KEY,
    items: [changed, OTHER],
  });
  await toggle.click();
  await expect(page.getByRole('alert')).toContainText('다른 화면에서 활성 상태가 변경');
  await expect(toggle).not.toBeChecked();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    changed,
    OTHER,
  ]);
});

test('활성 루틴 수정은 상태를 유지하고 편집 도중 상태 변경은 덮어쓰지 않는다', async ({ page }) => {
  await page.getByRole('switch', { name: '루틴 활성화' }).click();
  await page.goto('/routine/r/edit');
  await page.getByLabel('메모').fill('수정한 메모');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/routine/r');
  await expect(page.getByRole('switch', { name: '루틴 활성화' })).toBeChecked();
  await page.goto('/routine/r/edit');
  await page.getByLabel('루틴 이름').fill('저장 안 될 이름');
  await page.evaluate(async () => {
    const modulePath = '/src/api/routine/index.ts';
    const { setRoutineActive } = await import(modulePath);
    await setRoutineActive('r', false, true);
  });
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('다른 화면에서 변경된 루틴');
  await expect(page.getByLabel('루틴 이름')).toHaveValue('저장 안 될 이름');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!)[0], KEY)).toEqual({
    ...LEGACY,
    memo: '수정한 메모',
    isActive: false,
  });
});

for (const stored of ['[]', '{broken', JSON.stringify([{ ...LEGACY, isActive: 'yes' }])]) {
  test(`삭제·손상 데이터는 활성 상태 저장으로 덮어쓰지 않는다: ${stored}`, async ({ page }) => {
    await page.evaluate(({ key, stored }) => localStorage.setItem(key, stored), {
      key: KEY,
      stored,
    });
    await page.getByRole('switch', { name: '루틴 활성화' }).click();
    await expect(page.getByRole('alert')).toContainText('활성 상태를 변경하지 못했어요.');
    expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(stored);
    await page.reload();
    await expect(page.getByRole('switch')).toHaveCount(0);
  });
}

test('요일 반복과 긴 이름을 좁은 화면에 표시한다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.evaluate(
    ({ key, routine }) =>
      localStorage.setItem(
        key,
        JSON.stringify([
          {
            ...routine,
            name: '긴 이름'.repeat(30),
            schedule: { type: 'weekdays', days: [1, 3, 5] },
          },
        ]),
      ),
    { key: KEY, routine: LEGACY },
  );
  await page.reload();
  await expect(page.getByText('매주 월 · 수 · 금', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
