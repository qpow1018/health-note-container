import { test, expect } from './authFixture';

const KEY = 'health-note.exercises.v1:test-user';
const EXERCISE = {
  id: 'db-exercise',
  name: '스쿼트',
  amount: '10회',
  sets: 3,
  youtubeLinks: [],
  memo: '',
};

test('조회 중에는 빈 목록으로 오인시키지 않고 실패 후 재시도한다', async ({ page }) => {
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/rest/v1/exercises?**', async (route) => {
    await pending;
    await route.fulfill({ status: 503, json: { message: 'Unavailable' } });
  });
  await page.goto('/exercise?tab=exercises');
  await expect(page.getByRole('status', { name: '불러오고 있어요.' })).toBeVisible();
  await page.screenshot({ path: '/tmp/health-note-exercise-loading.png' });
  await expect(page.getByText('아직 등록한 운동이 없어요.')).toHaveCount(0);
  release();
  await expect(page.getByRole('alert')).toContainText('운동 목록을 불러오지 못했어요.');
  await page.unroute('**/rest/v1/exercises?**');
  await page.getByRole('button', { name: '다시 시도', exact: true }).click();
  await expect(page.getByText('아직 등록한 운동이 없어요.')).toBeVisible();
});

test('저장 응답을 기다리는 동안 중복 제출을 막는다', async ({ page }) => {
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let writes = 0;
  await page.route('**/rest/v1/exercises?**', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    writes++;
    await pending;
    await route.fallback();
  });
  await page.goto('/exercise/new');
  await page.getByLabel('운동 이름').fill('스쿼트');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장 중…' })).toBeDisabled();
  await expect(page.getByLabel('운동 이름')).toBeDisabled();
  await expect(page.getByLabel('운동량', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('세트', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('메모')).toBeDisabled();
  await expect(page.getByRole('button', { name: '링크 추가', exact: true })).toBeDisabled();
  await page.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit());
  release();
  await expect(page).toHaveURL('/exercise?tab=exercises');
  await expect(page.getByRole('listitem')).toHaveCount(1);
  expect(writes).toBe(1);
});

test('DB가 루틴에 포함된 운동의 삭제를 거부하면 데이터를 유지한다', async ({ page }) => {
  await page.goto('/exercise?tab=exercises');
  await page.evaluate(
    ({ key, exercise }) => {
      localStorage.setItem(key, JSON.stringify([exercise]));
      localStorage.setItem(
        'health-note.routines.v1:test-user',
        JSON.stringify([
          {
            id: 'r',
            name: '하체',
            exerciseIds: [exercise.id],
            schedule: { type: 'weekdays', days: [1] },
            memo: '',
            isActive: false,
          },
        ]),
      );
    },
    { key: KEY, exercise: EXERCISE },
  );
  let deletes = 0;
  await page.route('**/rest/v1/exercises?**', async (route) => {
    if (route.request().method() === 'DELETE') deletes++;
    await route.fallback();
  });
  await page.goto('/exercise/db-exercise');
  await page.getByRole('button', { name: '더보기', exact: true }).click();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '삭제', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('루틴에서 먼저 제외해 주세요.');
  expect(deletes).toBe(1);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    EXERCISE,
  ]);
});

test('기존 브라우저 운동을 자동 업로드하거나 삭제하지 않는다', async ({ page }) => {
  await page.addInitScript(
    ({ key, exercise }) => localStorage.setItem(key, JSON.stringify([exercise])),
    { key: KEY, exercise: EXERCISE },
  );
  let uploads = 0;
  await page.route('**/rest/v1/exercises?**', async (route) => {
    if (route.request().method() === 'POST') uploads++;
    await route.fulfill({ json: [] });
  });
  await page.goto('/exercise?tab=exercises');
  await expect(page.getByText('아직 등록한 운동이 없어요.')).toBeVisible();
  expect(uploads).toBe(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    EXERCISE,
  ]);
});

test('재조회에 실패해도 기존 목록을 유지하고 재시도로 최신 목록을 표시한다', async ({ page }) => {
  await page.clock.install();
  await page.goto('/exercise?tab=exercises');
  await page.evaluate(
    ({ key, exercise }) => localStorage.setItem(key, JSON.stringify([exercise])),
    { key: KEY, exercise: EXERCISE },
  );
  await page.reload();
  await expect(page.getByRole('link', { name: /스쿼트/ })).toBeVisible();
  await page.route('**/rest/v1/exercises?**', (route) =>
    route.fulfill({ status: 503, json: { message: 'Unavailable' } }),
  );
  await page.clock.fastForward(61_000);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByRole('alert')).toContainText('운동 목록을 불러오지 못했어요.');
  await expect(page.getByRole('link', { name: /스쿼트/ })).toBeVisible();
  await expect(page.getByText('아직 등록한 운동이 없어요.')).toHaveCount(0);
  await page.screenshot({ path: '/tmp/health-note-exercise-refetch-error.png' });
  await page.evaluate(
    ({ key, exercise }) =>
      localStorage.setItem(key, JSON.stringify([{ ...exercise, name: '최신 스쿼트' }])),
    { key: KEY, exercise: EXERCISE },
  );
  await page.unroute('**/rest/v1/exercises?**');
  await page.getByRole('button', { name: '다시 시도', exact: true }).click();
  await expect(page.getByRole('link', { name: /최신 스쿼트/ })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('상세 재조회 실패와 재시도 중 기존 내용과 영상 프레임을 유지한다', async ({ page }) => {
  await page.clock.install();
  await page.goto('/exercise?tab=exercises');
  await page.evaluate(
    ({ key, exercise }) =>
      localStorage.setItem(
        key,
        JSON.stringify([
          { ...exercise, youtubeLinks: ['https://youtu.be/abcdefghijk'], memo: '상세 메모' },
        ]),
      ),
    { key: KEY, exercise: EXERCISE },
  );
  await page.reload();
  await page.getByRole('link', { name: /스쿼트/ }).click();
  const player = page.locator('iframe');
  await expect(player).toHaveCount(1);
  await player.evaluate((element) => element.setAttribute('data-preserved', 'true'));
  await page.route('**/rest/v1/exercises?**', (route) =>
    route.fulfill({ status: 503, json: { message: 'Unavailable' } }),
  );
  await page.clock.fastForward(61_000);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByRole('alert')).toContainText('운동을 불러오지 못했어요.');
  await expect(page.getByText('상세 메모', { exact: true })).toBeVisible();
  await expect(player).toHaveAttribute('data-preserved', 'true');
  await page.unroute('**/rest/v1/exercises?**');
  await page.getByRole('button', { name: '다시 시도', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(player).toHaveAttribute('data-preserved', 'true');
  await page.screenshot({ path: '/tmp/health-note-detail.png' });
});

test('삭제 응답을 기다리는 동안 수정·삭제 메뉴를 제공하지 않는다', async ({ page }) => {
  await page.goto('/exercise?tab=exercises');
  await page.evaluate(
    ({ key, exercise }) => localStorage.setItem(key, JSON.stringify([exercise])),
    { key: KEY, exercise: EXERCISE },
  );
  await page.reload();
  await page.getByRole('link', { name: /스쿼트/ }).click();
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/rest/v1/exercises?**', async (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    await pending;
    await route.fallback();
  });
  await page.getByRole('button', { name: '더보기', exact: true }).click();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '삭제', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('삭제 중…');
  await expect(page.getByRole('button', { name: '더보기', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '수정', exact: true })).toHaveCount(0);
  release();
  await expect(page).toHaveURL('/exercise?tab=exercises');
  await expect(page.getByText('아직 등록한 운동이 없어요.')).toBeVisible();
});

test('수정 폼은 재조회 실패와 재시도 후에도 입력과 링크를 유지한다', async ({ page }) => {
  await page.clock.install();
  await page.goto('/exercise?tab=exercises');
  await page.evaluate(
    ({ key, exercise }) => localStorage.setItem(key, JSON.stringify([exercise])),
    { key: KEY, exercise: EXERCISE },
  );
  await page.goto('/exercise/db-exercise/edit');
  await page.getByLabel('운동 이름').fill('작성 중인 이름');
  await page.getByLabel('메모').fill('작성 중인 메모');
  await page.getByLabel('유튜브 링크 1', { exact: true }).fill('https://youtu.be/abcdefghijk');
  await page.route('**/rest/v1/exercises?**', (route) =>
    route.fulfill({ status: 503, json: { message: 'Unavailable' } }),
  );
  await page.clock.fastForward(61_000);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByRole('alert')).toContainText('운동을 불러오지 못했어요.');
  await expect(page.getByLabel('운동 이름')).toHaveValue('작성 중인 이름');
  await page.unroute('**/rest/v1/exercises?**');
  await page.getByRole('button', { name: '다시 시도', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByLabel('운동 이름')).toHaveValue('작성 중인 이름');
  await expect(page.getByLabel('메모')).toHaveValue('작성 중인 메모');
  await expect(page.getByLabel('유튜브 링크 1', { exact: true })).toHaveValue(
    'https://youtu.be/abcdefghijk',
  );
  await page.screenshot({ path: '/tmp/health-note-edit.png' });
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/exercise/db-exercise');
  await expect(page.getByRole('heading', { name: '작성 중인 이름', exact: true })).toBeVisible();
});
