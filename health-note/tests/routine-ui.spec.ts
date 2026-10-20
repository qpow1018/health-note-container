import { expect, test } from './authFixture';

const ROUTINES = ['상체 루틴', '하체 루틴'].map((name, index) => ({
  id: String(index),
  name,
  exerciseIds: ['walk'],
  schedule: { type: 'weekdays', days: [1, 3, 5] },
  memo: '천천히 진행해요.',
}));

test.beforeEach(async ({ page }) => {
  await page.goto('/exercise');
  await page.evaluate((routines) => {
    localStorage.setItem('health-note.routines.v1:test-user', JSON.stringify(routines));
    localStorage.setItem(
      'health-note.exercises.v1:test-user',
      JSON.stringify([{ id: 'walk', name: '걷기', amount: '30분', sets: null }]),
    );
  }, ROUTINES);
});

test('필드 오류를 입력과 연결하고 수정하면 해제하며 저장 버튼은 화면 아래에 유지한다', async ({
  page,
}) => {
  await page.goto('/routine/new');
  await page.getByLabel('루틴 이름').fill('   ');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByLabel('루틴 이름')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('루틴 이름')).toHaveAccessibleDescription(
    '루틴 이름을 입력해 주세요.',
  );
  await page.getByLabel('루틴 이름').fill('새 루틴');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /^(운동 선택|선택 변경)$/ }),
  ).toHaveAccessibleDescription('운동을 하나 이상 선택해 주세요.');
  await page.getByRole('button', { name: /^(운동 선택|선택 변경)$/ }).click();
  await page.getByRole('dialog').getByRole('checkbox', { name: /걷기/ }).check();
  await page.getByRole('button', { name: /선택 완료/ }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('group', { name: /반복 일정/ })).toHaveAccessibleDescription(
    '반복할 요일을 하나 이상 선택해 주세요.',
  );
  await page.getByRole('checkbox', { name: '월', exact: true }).check();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByLabel('메모').scrollIntoViewIfNeeded();
  const save = (await page.getByRole('button', { name: '저장', exact: true }).boundingBox())!;
  expect(save.y + save.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.screenshot({ path: '/tmp/health-note-routine-form.png', fullPage: true });
});

test('모바일 목록·정렬·상세·삭제 모달과 좁은 화면의 긴 이름을 확인한다', async ({ page }) => {
  await page.goto('/exercise');
  await expect(page.getByText('총 2개')).toBeVisible();
  await page.screenshot({ path: '/tmp/health-note-routine-list.png' });
  await page.getByRole('link', { name: '순서 변경' }).click();
  await expect(page.getByRole('heading', { name: '루틴 순서 변경', exact: true })).toBeVisible();
  await page.screenshot({ path: '/tmp/health-note-routine-order.png' });
  await page.getByRole('button', { name: '뒤로가기' }).click();
  await page.getByRole('link', { name: /상체 루틴/ }).click();
  await expect(page.getByRole('heading', { name: '반복 일정' })).toBeVisible();
  await page.screenshot({ path: '/tmp/health-note-routine-detail.png' });
  await page.getByRole('button', { name: '더보기' }).click();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '루틴 삭제' })).toBeVisible();
  await page.screenshot({ path: '/tmp/health-note-routine-confirm.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: '더보기' })).toBeFocused();
  await page.evaluate(
    (routines) =>
      localStorage.setItem(
        'health-note.routines.v1:test-user',
        JSON.stringify(routines.map((item) => ({ ...item, name: '긴루틴이름'.repeat(20) }))),
      ),
    ROUTINES,
  );
  await page.setViewportSize({ width: 320, height: 640 });
  for (const route of ['/exercise', '/routine/order', '/routine/0/edit']) {
    await page.goto(route);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
});

for (const closeMethod of ['취소', 'Escape']) {
  test(`삭제 확인을 ${closeMethod}로 닫으면 더보기 버튼으로 포커스가 복귀한다`, async ({
    page,
  }) => {
    await page.goto('/routine/0');
    const opener = page.getByRole('button', { name: '더보기' });
    await opener.click();
    await page.getByRole('button', { name: '삭제', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '루틴 삭제' });
    await expect(dialog).toBeVisible();
    if (closeMethod === 'Escape') {
      await page.keyboard.press('Escape');
    } else {
      await dialog.getByRole('button', { name: '취소', exact: true }).click();
    }
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
  });
}
