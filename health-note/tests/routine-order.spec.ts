import type { Page } from '@playwright/test';

import { expect, test } from './authFixture';

const KEY = 'health-note.routines.v1:test-user';
const ROUTINES = ['푸시업', '스쿼트', '걷기'].map((name, index) => ({
  id: String(index),
  name,
  exerciseIds: ['e'],
  memo: `${name} 메모`,
}));

test.beforeEach(async ({ page }) => {
  await page.goto('/exercise');
  await page.evaluate(({ key, items }) => localStorage.setItem(key, JSON.stringify(items)), {
    key: KEY,
    items: ROUTINES,
  });
  await page.reload();
});

test('드롭하면 즉시 저장하고 상세 이동 없이 새로고침 후에도 유지한다', async ({ page }) => {
  await moveFirstDown(page);
  await expect(page).toHaveURL('/exercise');
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).map((item: { id: string }) => item.id),
        KEY,
      ),
    )
    .toEqual(['1', '0', '2']);
  await page.reload();
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(['스쿼트', '푸시업', '걷기']);
});

test('핸들 클릭은 이동하지 않고 이름 영역만 상세로 이동한다', async ({ page }) => {
  const handle = page.getByRole('button', { name: '푸시업 순서 이동' });
  await handle.click();
  await expect(page).toHaveURL('/exercise');
  await expect(page.getByRole('link', { name: /푸시업/ }).getByRole('button')).toHaveCount(0);
  await page.getByRole('link', { name: /푸시업/ }).click();
  await expect(page).toHaveURL('/routine/0');
});

test('Escape는 저장하지 않고 원래 순서를 유지한다', async ({ page }) => {
  let writes = 0;
  page.on('request', (request) => {
    if (request.url().includes('rpc/reorder_routines')) writes++;
  });
  await page.getByRole('button', { name: '푸시업 순서 이동' }).focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-dnd-dropping]')).toHaveCount(0);
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(
    ROUTINES.map((item) => item.name),
  );
  expect(writes).toBe(0);
});

test('저장 실패는 원래 순서로 복구하고 다시 드래그할 수 있다', async ({ page }) => {
  await page.route('**/rest/v1/rpc/reorder_routines', (route) =>
    route.fulfill({ status: 500, json: { message: 'failure' } }),
  );
  await moveFirstDown(page);
  await expect(page.getByRole('alert')).toContainText('순서를 저장하지 못했어요.');
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(
    ROUTINES.map((item) => item.name),
  );
  await page.unroute('**/rest/v1/rpc/reorder_routines');
  await moveFirstDown(page);
  await expect
    .poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!)[0].id, KEY))
    .toBe('1');
});

test('다른 곳에서 목록이 바뀌면 덮어쓰지 않고 최신 목록을 표시한다', async ({ page }) => {
  await page.route('**/rest/v1/rpc/reorder_routines', async (route) => {
    await page.evaluate((key) => {
      const items = JSON.parse(localStorage.getItem(key)!);
      items.push({ ...items[0], id: 'new', name: '추가된 운동' });
      localStorage.setItem(key, JSON.stringify(items));
    }, KEY);
    await route.fallback();
  });
  await moveFirstDown(page);
  await expect(page.getByRole('alert')).toContainText('목록이 변경되었어요.');
  await expect(page.getByRole('listitem').locator('h2')).toHaveText([
    '푸시업',
    '스쿼트',
    '걷기',
    '추가된 운동',
  ]);
});

test('저장 중 핸들은 잠기고 응답 후 다시 사용할 수 있다', async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/rest/v1/rpc/reorder_routines', async (route) => {
    await pending;
    await route.fallback();
  });
  await moveFirstDown(page);
  for (const handle of await page.getByRole('button', { name: /순서 이동/ }).all())
    await expect(handle).toBeDisabled();
  release();
  await expect(page.getByRole('button', { name: '푸시업 순서 이동' })).toBeEnabled();
});

test('핸들을 마우스로 드래그해 이동한다', async ({ page }) => {
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

async function moveFirstDown(page: Page) {
  const handle = page.getByRole('button', { name: '푸시업 순서 이동' });
  await expect(handle).toBeEnabled();
  await handle.focus();
  await page.keyboard.press('Space');
  await expect(handle).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await expect(page.locator('[data-dnd-dropping]')).toHaveCount(0);
}
