import { expect, test } from './authFixture';

const ROUTINES_KEY = 'health-note.routines.v1:test-user';
const ROUTINE = {
  id: 'r1',
  name: '첫 루틴',
  isActive: false,
  exerciseIds: ['a', 'b'],
  schedule: { type: 'weekdays', days: [1, 5] },
  memo: '원본 메모',
};

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.goto('/routine');
  await page.evaluate(
    ({ key, routine }) => {
      localStorage.setItem(
        key,
        JSON.stringify([routine, { ...routine, id: 'r2', name: '둘째 루틴' }]),
      );
      localStorage.setItem(
        'health-note.exercises.v1:test-user',
        JSON.stringify([
          { id: 'a', name: '걷기', amount: '30분', sets: null },
          { id: 'b', name: '스쿼트', amount: '10회', sets: 3 },
        ]),
      );
    },
    { key: ROUTINES_KEY, routine: ROUTINE },
  );
  await page.reload();
  await expect(page.getByRole('link', { name: /첫 루틴/ })).toBeVisible();
});

for (const screen of ['목록', '상세', '수정', '정렬']) {
  test(`${screen}: 재조회 실패와 복구에도 콘텐츠와 편집 상태를 유지한다`, async ({ page }) => {
    if (screen === '상세') await page.getByRole('link', { name: /첫 루틴/ }).click();
    if (screen === '수정') {
      await page.goto('/routine/r1/edit');
      await page.getByLabel('루틴 이름').fill('작성 중 이름');
      await page.getByLabel('메모').fill('작성 중 메모');
    }
    if (screen === '정렬') {
      await page.getByRole('link', { name: '순서 변경' }).click();
      const handle = page.getByRole('button', { name: '첫 루틴 순서 이동' });
      await handle.focus();
      await page.keyboard.press('Space');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Space');
      await expect(page.getByRole('listitem').first()).toContainText('둘째 루틴');
    }
    await page.route('**/rest/v1/routines?**', (route) =>
      route.fulfill({ status: 503, json: { message: 'Unavailable' } }),
    );
    await page.clock.fastForward(61_000);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.getByRole('alert')).toContainText('불러오지 못했어요');
    if (screen === '수정') {
      await expect(page.getByLabel('루틴 이름')).toHaveValue('작성 중 이름');
      await expect(page.getByLabel('메모')).toHaveValue('작성 중 메모');
    } else if (screen === '정렬') {
      await expect(page.getByRole('listitem').first()).toContainText('둘째 루틴');
    } else if (screen === '상세') {
      await expect(page.getByText('원본 메모', { exact: true })).toBeVisible();
    } else {
      await expect(page.getByRole('link', { name: /첫 루틴/ })).toBeVisible();
    }
    if (screen === '수정')
      await page.screenshot({ path: '/tmp/health-note-routine-edit-refetch.png' });
    await page.unroute('**/rest/v1/routines?**');
    await page.getByRole('button', { name: '다시 시도', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    if (screen === '수정') await expect(page.getByLabel('메모')).toHaveValue('작성 중 메모');
    if (screen === '정렬')
      await expect(page.getByRole('listitem').first()).toContainText('둘째 루틴');
  });
}

test('저장 대기 중 입력과 운동 정렬을 잠그고 실패 후 초안을 복원한다', async ({ page }) => {
  await page.goto('/routine/r1/edit');
  await page.getByLabel('메모').fill('저장할 메모');
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/rest/v1/rpc/save_routine', async (route) => {
    await pending;
    await route.fulfill({ status: 503, json: { message: 'Unavailable' } });
  });
  await page.getByRole('button', { name: '저장', exact: true }).click();
  try {
    await expect(page.getByRole('button', { name: '저장 중…' })).toBeDisabled();
    await expect(page.getByLabel('루틴 이름')).toBeDisabled();
    await expect(page.getByLabel('메모')).toBeDisabled();
    await expect(page.getByRole('button', { name: '걷기 순서 이동' })).toBeDisabled();
  } finally {
    release();
  }
  await expect(page.getByRole('alert')).toContainText('저장하지 못했어요');
  await expect(page.getByLabel('메모')).toHaveValue('저장할 메모');
  await expect(page.getByLabel('메모')).toBeEnabled();
});

test('성공한 재조회도 편집 원본을 바꾸지 않아 최신 일정의 덮어쓰기를 막는다', async ({ page }) => {
  await page.goto('/routine/r1/edit');
  await page.getByLabel('루틴 이름').fill('내 초안');
  await page.evaluate(
    ({ key, routine }) => {
      localStorage.setItem(
        key,
        JSON.stringify([{ ...routine, schedule: { type: 'weekdays', days: [2] } }]),
      );
    },
    { key: ROUTINES_KEY, routine: ROUTINE },
  );
  await page.clock.fastForward(61_000);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  const response = page.waitForResponse((r) => r.url().includes('/rest/v1/routines?'));
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await response;
  await expect(page.getByRole('checkbox', { name: '월', exact: true })).toBeChecked();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('다른 화면에서 변경된 루틴');
  await expect(page.getByLabel('루틴 이름')).toHaveValue('내 초안');
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!)[0].schedule.days,
      ROUTINES_KEY,
    ),
  ).toEqual([2]);
});

test('삭제 응답 대기 중 수정 메뉴와 활성화 조작을 막는다', async ({ page }) => {
  await page.goto('/routine/r1');
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/rest/v1/routines?**', async (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    await pending;
    await route.fulfill({ status: 503, json: { message: 'Unavailable' } });
  });
  await page.getByRole('button', { name: '더보기', exact: true }).click();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '삭제', exact: true }).click();
  try {
    await expect(page.getByText('삭제 중…')).toBeVisible();
    await expect(page.getByRole('button', { name: '더보기', exact: true })).toHaveCount(0);
    await expect(page.getByRole('switch')).toBeDisabled();
  } finally {
    release();
  }
  await expect(page.getByRole('alert')).toContainText('삭제하지 못했어요');
  await expect(page.getByRole('switch')).toBeEnabled();
});

test('입력 검증은 운동 재조회보다 먼저 수행하고 조회 실패는 한 번만 안내한다', async ({ page }) => {
  await page.goto('/routine/r1/edit');
  await expect(page.getByRole('listitem')).toHaveCount(2);
  let reads = 0;
  await page.route('**/rest/v1/exercises?**', async (route) => {
    reads++;
    await route.fulfill({ status: 503, json: { message: 'Unavailable' } });
  });
  await page.getByLabel('루틴 이름').fill('   ');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('루틴 이름을 입력해 주세요.');
  expect(reads).toBe(0);
  await page.getByLabel('루틴 이름').fill('유효한 이름');
  await page.getByRole('checkbox', { name: '월', exact: true }).uncheck();
  await page.getByRole('checkbox', { name: '금', exact: true }).uncheck();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('반복할 요일을 하나 이상 선택해 주세요.');
  expect(reads).toBe(0);
  await page.getByRole('checkbox', { name: '월', exact: true }).check();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByRole('alert')).toContainText('운동 목록을 불러오지 못했어요.');
  expect(reads).toBe(1);
  await expect(page.getByLabel('루틴 이름')).toHaveValue('유효한 이름');
  await page.unroute('**/rest/v1/exercises?**');
  await page.getByRole('button', { name: '운동 선택', exact: true }).click();
  await page.getByRole('button', { name: /선택 완료/ }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeEnabled();
});
