import { expect, test } from './authFixture';

const EXERCISES = Array.from({ length: 24 }, (_, index) => ({
  id: String(index),
  name: `운동 ${index + 1}`,
  amount: '10회',
  sets: 3,
}));

test.beforeEach(async ({ page }) => {
  await page.goto('/routine/new');
  await page.evaluate(
    (items) => localStorage.setItem('health-note.exercises.v1:test-user', JSON.stringify(items)),
    EXERCISES,
  );
  await page.reload();
});

test('긴 선택 목록은 높이를 제한하고 제목·완료 버튼을 유지하며 목록만 스크롤한다', async ({
  page,
}) => {
  await expect(page.getByText('선택한 운동이 없어요.', { exact: true })).toBeVisible();
  await expect(page.getByText('등록한 운동량과 세트를 사용해요.', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: '운동 선택', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: '운동 선택' });
  const bounds = (await sheet.boundingBox())!;
  expect(bounds.height).toBeLessThanOrEqual(page.viewportSize()!.height * 0.8 + 1);
  const headingBefore = (await sheet.getByRole('heading').boundingBox())!;
  const done = sheet.getByRole('button', { name: '선택 완료 (0)', exact: true });
  const doneBefore = (await done.boundingBox())!;
  await sheet.getByRole('checkbox', { name: '운동 24 10회 × 3세트', exact: true }).check();
  expect((await sheet.getByRole('heading').boundingBox())!.y).toBe(headingBefore.y);
  expect(
    (await sheet.getByRole('button', { name: '선택 완료 (1)', exact: true }).boundingBox())!.y,
  ).toBe(doneBefore.y);
  await sheet.getByRole('button', { name: '선택 완료 (1)', exact: true }).click();
  await expect(page.getByRole('button', { name: '운동 선택', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: /순서 이동/ })).toHaveCount(0);
  await expect(page.getByText('선택한 운동이 없어요.', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('listitem')).toHaveText(['운동 2410회 × 3세트']);
});

test('핸들로 정렬하고 Escape는 순서를 복구하며 선택 변경 취소는 기존 선택을 보존한다', async ({
  page,
}) => {
  await page.getByLabel('루틴 이름').fill('테스트 루틴');
  await page.getByRole('button', { name: '운동 선택', exact: true }).click();
  const sheet = page.getByRole('dialog');
  for (const name of ['운동 1', '운동 2', '운동 3']) {
    await sheet.getByRole('checkbox', { name: `${name} 10회 × 3세트`, exact: true }).check();
  }
  await sheet.getByRole('button', { name: '선택 완료 (3)', exact: true }).click();
  const handle = page.getByRole('button', { name: '운동 1 순서 이동', exact: true });
  await handle.focus();
  await page.keyboard.press('Space');
  await expect(handle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeDisabled();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('listitem').locator('strong')).toHaveText([
    '운동 2',
    '운동 1',
    '운동 3',
  ]);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-dnd-dropping]')).toHaveCount(0);
  await expect(handle).toHaveAttribute('aria-pressed', 'false');
  await expect(handle).toBeFocused();
  await expect(page.locator('[data-dnd-dragging]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '저장', exact: true })).toBeEnabled();
  await expect(page.getByRole('listitem').locator('strong')).toHaveText([
    '운동 1',
    '운동 2',
    '운동 3',
  ]);
  await handle.focus();
  await page.keyboard.press('Space');
  await expect(handle).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('listitem').locator('strong')).toHaveText([
    '운동 2',
    '운동 1',
    '운동 3',
  ]);
  await page.keyboard.press('Space');
  await expect(page.locator('[data-dnd-dropping]')).toHaveCount(0);
  await expect(page.getByRole('listitem').locator('strong')).toHaveText([
    '운동 2',
    '운동 1',
    '운동 3',
  ]);
  await expect(handle).toBeFocused();
  await page.getByRole('button', { name: '운동 선택', exact: true }).click();
  await sheet.getByRole('checkbox', { name: '운동 2 10회 × 3세트', exact: true }).uncheck();
  await sheet.getByRole('button', { name: '닫기' }).click();
  await expect(page.locator('[data-dnd-dragging]')).toHaveCount(0);
  await expect(page.getByRole('listitem').locator('strong')).toHaveText([
    '운동 2',
    '운동 1',
    '운동 3',
  ]);
  await page.getByRole('checkbox', { name: '월', exact: true }).check();
  await page.screenshot({ path: '/tmp/health-note-routine-form-refined.png', fullPage: true });
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/routine');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('health-note.routines.v1:test-user')!)[0].exerciseIds,
    ),
  ).toEqual(['1', '0', '2']);
});

test('마우스로 순서를 바꾸고 작은 화면에서도 선택 목록과 완료 버튼을 사용할 수 있다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole('button', { name: '운동 선택', exact: true }).click();
  const sheet = page.getByRole('dialog');
  expect((await sheet.boundingBox())!.height).toBeLessThanOrEqual(568 * 0.8 + 1);
  for (const name of ['운동 1', '운동 2']) {
    await sheet.getByRole('checkbox', { name: `${name} 10회 × 3세트`, exact: true }).check();
  }
  await sheet.getByRole('button', { name: '선택 완료 (2)', exact: true }).click();
  const source = (await page
    .getByRole('button', { name: '운동 1 순서 이동', exact: true })
    .boundingBox())!;
  const target = (await page
    .getByRole('button', { name: '운동 2 순서 이동', exact: true })
    .boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2 + 12, {
    steps: 3,
  });
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 20 });
  await page.mouse.up();
  await expect(page.getByRole('listitem').locator('strong')).toHaveText(['운동 2', '운동 1']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.evaluate(
    (item) => localStorage.setItem('health-note.exercises.v1:test-user', JSON.stringify([item])),
    EXERCISES[0],
  );
  await page.getByRole('button', { name: '운동 선택', exact: true }).click();
  expect((await sheet.boundingBox())!.height).toBeLessThan(568 * 0.6);
  await expect(sheet.getByRole('button', { name: /선택 완료/ })).toBeInViewport();
});
