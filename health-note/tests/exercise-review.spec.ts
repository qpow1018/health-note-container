import { expect, test, mockAuth } from './authFixture';

const KEY = 'health-note.exercises.v1:test-user';
const EXERCISE = { id: 'a', name: '걷기', amount: '30분', sets: null, youtubeLinks: [], memo: '' };

test.beforeEach(async ({ page }) => {
  await page.goto('/exercise');
  await page.evaluate(
    ({ key, exercise }) => localStorage.setItem(key, JSON.stringify([exercise])),
    { key: KEY, exercise: EXERCISE },
  );
  await page.reload();
});

test('다른 탭에서 변경해도 작성 중인 입력을 유지하고 저장한 값으로 갱신한다', async ({
  page,
  context,
}) => {
  await page.clock.install();
  await page.goto('/exercise/a/edit');
  await page.getByLabel('운동 이름').fill('내가 입력한 이름');
  const otherTab = await context.newPage();
  await mockAuth(otherTab);
  await otherTab.goto('/exercise/a/edit');
  await otherTab.getByLabel('운동량').fill('45분');
  await otherTab.getByLabel('세트').fill('2');
  await otherTab.getByLabel('메모').fill('다른 탭 메모');
  await otherTab.getByRole('button', { name: '저장', exact: true }).click();
  await expect(otherTab).toHaveURL('/exercise/a');
  await page.clock.fastForward(61_000);
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  const response = page.waitForResponse(
    (response) =>
      response.url().includes('/rest/v1/exercises?') && response.request().method() === 'GET',
  );
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await response;
  await expect(page.getByLabel('운동 이름')).toHaveValue('내가 입력한 이름');
  await expect(page.getByLabel('운동량')).toHaveValue('30분');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/exercise/a');
  await expect(page.getByRole('heading', { name: '내가 입력한 이름', exact: true })).toBeVisible();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    { ...EXERCISE, name: '내가 입력한 이름' },
  ]);
});

test('새로고침하면 다른 탭에서 변경한 운동을 반영한다', async ({ page, context }) => {
  const otherTab = await context.newPage();
  await mockAuth(otherTab);
  await otherTab.goto('/exercise/new');
  await otherTab.getByLabel('운동 이름').fill('스쿼트');
  await otherTab.getByRole('button', { name: '저장', exact: true }).click();
  await expect(otherTab).toHaveURL('/exercise');
  await page.reload();
  await expect(page.getByRole('listitem')).toHaveCount(2);
  await expect(page.getByRole('link', { name: /스쿼트/ })).toBeVisible();
});

test('새로고침으로 읽기 오류를 확인하고 복구할 수 있다', async ({ page }) => {
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), KEY);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('운동 목록을 불러오지 못했어요.');
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe('{broken');
  await page.evaluate(
    ({ key, exercise }) =>
      localStorage.setItem(key, JSON.stringify([{ ...exercise, amount: '50분' }])),
    { key: KEY, exercise: EXERCISE },
  );
  await page.reload();
  await expect(page.getByRole('listitem')).toHaveText(['걷기50분']);
  await expect(page.getByRole('alert')).toHaveCount(0);
});
