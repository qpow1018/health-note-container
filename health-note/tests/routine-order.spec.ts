import type { Page } from '@playwright/test';

import { expect, test } from './authFixture';

const KEY = 'health-note.routines.v1:test-user';
const ROUTINES = ['푸시업', '스쿼트', '걷기'].map((name, index) => ({
  id: String(index),
  name,
  isActive: false,
  exerciseIds: ['a'],
  schedule: { type: 'weekdays', days: [1] },
  memo: `${name} 메모`,
}));

test.beforeEach(async ({ page }) => {
  await page.goto('/routine');
  await page.evaluate(({ key, items }) => localStorage.setItem(key, JSON.stringify(items)), {
    key: KEY,
    items: ROUTINES,
  });
  await page.reload();
});

test('핸들로 순서를 변경하고 완료하면 내용과 운동을 보존하며 새로고침 후 유지한다', async ({
  page,
}) => {
  const routine = { marker: '기존 운동 순서 보존' };
  await page.evaluate(
    (value) => localStorage.setItem('health-note.exercises.v1:test-user', JSON.stringify(value)),
    routine,
  );
  await page.getByRole('link', { name: '순서 변경' }).click();
  await expect(page.getByRole('button', { name: '완료' })).toBeDisabled();
  await expect(page.getByRole('link', { name: /푸시업/ })).toHaveCount(0);
  await moveFirstDown(page);
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(['스쿼트', '푸시업', '걷기']);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual(
    ROUTINES,
  );
  await page.getByRole('button', { name: '완료' }).click();
  await expect(page.getByRole('heading', { name: '운동 관리', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(['스쿼트', '푸시업', '걷기']);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    ROUTINES[1],
    ROUTINES[0],
    ROUTINES[2],
  ]);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('health-note.exercises.v1:test-user')!),
    ),
  ).toEqual(routine);
});

test('헤더와 브라우저 뒤로가기는 미저장 순서를 버린다', async ({ page }) => {
  await page.getByRole('link', { name: '순서 변경' }).click();
  await moveFirstDown(page);
  await page.getByRole('button', { name: '뒤로가기' }).click();
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(
    ROUTINES.map((item) => item.name),
  );
  await page.getByRole('link', { name: '순서 변경' }).click();
  await moveFirstDown(page);
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(
    ROUTINES.map((item) => item.name),
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
    ROUTINES,
  );
  await page.getByRole('button', { name: '완료' }).click();
  await expect(page.getByRole('heading', { name: '운동 관리', exact: true })).toBeVisible();
});

for (const change of ['추가', '삭제', '순서']) {
  test(`편집 중 목록 변경을 덮어쓰지 않는다: ${change}`, async ({ page }) => {
    await page.getByRole('link', { name: '순서 변경' }).click();
    await moveFirstDown(page);
    const changed =
      change === '추가'
        ? [...ROUTINES, { ...ROUTINES[0], id: 'new' }]
        : change === '삭제'
          ? ROUTINES.slice(1)
          : [...ROUTINES].reverse();
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

test('순서 저장은 다른 화면에서 수정한 루틴 내용을 유지한다', async ({ page }) => {
  await page.getByRole('link', { name: '순서 변경' }).click();
  await moveFirstDown(page);
  const changed = ROUTINES.map((item) => ({
    ...item,
    memo: '최신 메모',
    schedule: {
      type: 'interval',
      startDate: '2026-10-14',
      intervalDays: 2,
      postponedDates: ['2026-10-16'],
    },
  }));
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
    ROUTINES.map((item) => item.name),
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
      const modulePath = '/src/api/routine/index.ts';
      const { reorderRoutines } = await import(modulePath);
      try {
        await reorderRoutines(ids, ['0', '1', '2']);
        return false;
      } catch {
        return true;
      }
    }, ids);
    expect(rejected).toBe(true);
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual(
      ROUTINES,
    );
  });
}

test('새로고침은 미저장 순서를 폐기하고 루틴이 하나면 편집 진입을 숨긴다', async ({ page }) => {
  await page.getByRole('link', { name: '순서 변경' }).click();
  await moveFirstDown(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: '루틴 순서 변경', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '완료' })).toBeDisabled();
  await expect(page.getByRole('listitem').locator('h2')).toHaveText(
    ROUTINES.map((item) => item.name),
  );
  await page.evaluate(({ key, routine }) => localStorage.setItem(key, JSON.stringify([routine])), {
    key: KEY,
    routine: ROUTINES[0],
  });
  await page.reload();
  await page.goto('/routine');
  await expect(page.getByRole('link', { name: '순서 변경' })).toHaveCount(0);
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

for (const stored of ['[]', '{broken']) {
  test(`빈 목록과 손상 데이터에서 정렬을 저장하지 않는다: ${stored}`, async ({ page }) => {
    await page.evaluate(({ key, stored }) => localStorage.setItem(key, stored), {
      key: KEY,
      stored,
    });
    await page.goto('/routine/order');
    await expect(page.getByRole('button', { name: '완료' })).toHaveCount(0);
    if (stored === '[]') {
      await expect(page.getByText('순서를 변경할 루틴이 없어요.')).toBeVisible();
    } else {
      await expect(page.getByRole('alert')).toContainText('루틴 목록을 불러오지 못했어요.');
    }
    expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(stored);
  });
}
