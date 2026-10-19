import type { Page } from '@playwright/test';

import { expect, test } from './authFixture';

const KEY = 'health-note.exercises.v1:test-user';
const EXERCISES = ['푸시업', '스쿼트', '걷기'].map((name, index) => ({
  id: String(index),
  name,
  amount: '10회',
  sets: 3,
  youtubeLinks: [],
  memo: `${name} 메모`,
}));

test.beforeEach(async ({ page }) => {
  await page.goto('/exercise');
  await page.evaluate(({ key, items }) => localStorage.setItem(key, JSON.stringify(items)), {
    key: KEY,
    items: EXERCISES,
  });
  await page.reload();
});

test('핸들로 순서를 변경하고 완료하면 내용과 루틴을 보존하며 새로고침 후 유지한다', async ({
  page,
}) => {
  const routine = { marker: '기존 루틴 순서 보존' };
  await page.evaluate(
    (value) => localStorage.setItem('health-note.routines.v1:test-user', JSON.stringify(value)),
    routine,
  );
  await page.getByRole('link', { name: '순서 변경' }).click();
  await expect(page.getByRole('button', { name: '완료' })).toBeDisabled();
  await expect(page.getByRole('link', { name: /푸시업/ })).toHaveCount(0);
  await moveFirstDown(page);
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(['스쿼트', '푸시업', '걷기']);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual(
    EXERCISES,
  );
  await page.getByRole('button', { name: '완료' }).click();
  await expect(page.getByRole('heading', { name: '내 운동 관리', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(['스쿼트', '푸시업', '걷기']);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    EXERCISES[1],
    EXERCISES[0],
    EXERCISES[2],
  ]);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('health-note.routines.v1:test-user')!),
    ),
  ).toEqual(routine);
});

test('헤더와 브라우저 뒤로가기는 미저장 순서를 버린다', async ({ page }) => {
  await page.getByRole('link', { name: '순서 변경' }).click();
  await moveFirstDown(page);
  await page.getByRole('button', { name: '뒤로가기' }).click();
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(
    EXERCISES.map((item) => item.name),
  );
  await page.getByRole('link', { name: '순서 변경' }).click();
  await moveFirstDown(page);
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(
    EXERCISES.map((item) => item.name),
  );
});

test('저장 실패는 임시 순서를 유지하고 재시도할 수 있다', async ({ page }) => {
  await page.getByRole('link', { name: '순서 변경' }).click();
  await moveFirstDown(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      Storage.prototype.setItem = original;
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  await page.getByRole('button', { name: '완료' }).click();
  await expect(page.getByRole('alert')).toContainText('순서를 저장하지 못했어요');
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(['스쿼트', '푸시업', '걷기']);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual(
    EXERCISES,
  );
  await page.getByRole('button', { name: '완료' }).click();
  await expect(page.getByRole('heading', { name: '내 운동 관리', exact: true })).toBeVisible();
});

for (const change of ['추가', '삭제', '순서']) {
  test(`편집 중 목록 변경을 덮어쓰지 않는다: ${change}`, async ({ page }) => {
    await page.getByRole('link', { name: '순서 변경' }).click();
    await moveFirstDown(page);
    const changed =
      change === '추가'
        ? [...EXERCISES, { ...EXERCISES[0], id: 'new' }]
        : change === '삭제'
          ? EXERCISES.slice(1)
          : [...EXERCISES].reverse();
    await page.evaluate(({ key, items }) => localStorage.setItem(key, JSON.stringify(items)), {
      key: KEY,
      items: changed,
    });
    await page.getByRole('button', { name: '완료' }).click();
    await expect(page.getByRole('alert')).toContainText('목록이 변경되었어요');
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual(
      changed,
    );
  });
}

test('순서 저장은 다른 화면에서 수정한 운동 내용을 유지한다', async ({ page }) => {
  await page.getByRole('link', { name: '순서 변경' }).click();
  await moveFirstDown(page);
  const changed = EXERCISES.map((item) => ({ ...item, memo: '최신 메모' }));
  await page.evaluate(({ key, items }) => localStorage.setItem(key, JSON.stringify(items)), {
    key: KEY,
    items: changed,
  });
  await page.getByRole('button', { name: '완료' }).click();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    changed[1],
    changed[0],
    changed[2],
  ]);
});

test('핸들을 마우스로 드래그해 이동한다', async ({ page }) => {
  await page.getByRole('link', { name: '순서 변경' }).click();
  const source = (await page.getByRole('button', { name: '푸시업 순서 이동' }).boundingBox())!;
  const target = (await page.getByRole('button', { name: '걷기 순서 이동' }).boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2 + 12, {
    steps: 3,
  });
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 20 });
  await page.mouse.up();
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(['스쿼트', '걷기', '푸시업']);
});

test('키보드로 이동하고 Escape로 드래그를 취소한다', async ({ page }) => {
  await page.getByRole('link', { name: '순서 변경' }).click();
  const handle = page.getByRole('button', { name: '푸시업 순서 이동' });
  await handle.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(
    EXERCISES.map((item) => item.name),
  );
  await expect(page.getByRole('button', { name: '완료' })).toBeDisabled();
  await expect(page.locator('[data-dnd-dropping]')).toHaveCount(0);
  await expect(handle).toHaveAttribute('aria-pressed', 'false');
  await handle.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(['스쿼트', '푸시업', '걷기']);
  await page.keyboard.press('Space');
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(['스쿼트', '푸시업', '걷기']);
});

for (const ids of [
  ['0', '0', '2'],
  ['0', '1'],
  ['0', '1', 'unknown'],
]) {
  test(`잘못된 순서는 기존 데이터를 보존한다: ${ids.join(',')}`, async ({ page }) => {
    const rejected = await page.evaluate(async (ids) => {
      const modulePath = '/src/api/exercise/index.ts';
      const { reorderExercises } = await import(modulePath);
      try {
        await reorderExercises(ids, ['0', '1', '2']);
        return false;
      } catch {
        return true;
      }
    }, ids);
    expect(rejected).toBe(true);
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual(
      EXERCISES,
    );
  });
}

test('새로고침은 미저장 순서를 폐기하고 운동이 하나면 편집 진입을 숨긴다', async ({ page }) => {
  await page.getByRole('link', { name: '순서 변경' }).click();
  await moveFirstDown(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: '운동 순서 변경', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '완료' })).toBeDisabled();
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(
    EXERCISES.map((item) => item.name),
  );
  await page.evaluate(
    ({ key, exercise }) => localStorage.setItem(key, JSON.stringify([exercise])),
    { key: KEY, exercise: EXERCISES[0] },
  );
  await page.reload();
  await page.goto('/exercise');
  await expect(page.getByRole('link', { name: '순서 변경' })).toHaveCount(0);
});

test('재조회 실패와 재시도 후에도 미저장 순서를 유지한다', async ({ page }) => {
  await page.clock.install();
  await page.getByRole('link', { name: '순서 변경' }).click();
  await moveFirstDown(page);
  await page.route('**/rest/v1/exercises?**', (route) =>
    route.fulfill({ status: 503, json: { message: 'Unavailable' } }),
  );
  await page.clock.fastForward(61_000);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByRole('alert')).toContainText('운동 목록을 불러오지 못했어요.');
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(['스쿼트', '푸시업', '걷기']);
  await page.unroute('**/rest/v1/exercises?**');
  await page.getByRole('button', { name: '다시 시도', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(['스쿼트', '푸시업', '걷기']);
  await expect(page.getByRole('button', { name: '완료', exact: true })).toBeEnabled();
  await page.screenshot({ path: '/tmp/health-note-order.png' });
});

test('저장 응답을 기다리는 동안 정렬 핸들을 비활성화한다', async ({ page }) => {
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/rest/v1/rpc/reorder_exercises', async (route) => {
    await pending;
    await route.fallback();
  });
  await page.getByRole('link', { name: '순서 변경' }).click();
  await moveFirstDown(page);
  await page.getByRole('button', { name: '완료', exact: true }).click();
  await expect(page.getByRole('button', { name: '완료', exact: true })).toBeDisabled();
  for (const name of ['스쿼트', '푸시업', '걷기']) {
    await expect(
      page.getByRole('button', { name: `${name} 순서 이동`, exact: true }),
    ).toBeDisabled();
  }
  release();
  await expect(page).toHaveURL('/exercise');
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(['스쿼트', '푸시업', '걷기']);
});

async function moveFirstDown(page: Page) {
  const handle = page.getByRole('button', { name: '푸시업 순서 이동' });
  await handle.focus();
  await page.keyboard.press('Space');
  await expect(handle).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(['스쿼트', '푸시업', '걷기']);
  await page.keyboard.press('Space');
  await expect(handle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-dnd-dropping]')).toHaveCount(0);
}
