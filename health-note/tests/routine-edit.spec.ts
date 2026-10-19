import { expect, test } from './authFixture';

const KEY = 'health-note.routines.v1:test-user';
const ROUTINE = {
  id: 'r1',
  name: '기존 루틴',
  isActive: false,
  exerciseIds: ['walk', 'squat'],
  schedule: { type: 'weekdays', days: [1, 5] },
  memo: '기존 메모',
};
const OTHER = { ...ROUTINE, id: 'r2', name: '다른 루틴' };
const EXERCISES = [
  { id: 'squat', name: '스쿼트', amount: '10회', sets: 3 },
  { id: 'walk', name: '걷기', amount: '30분', sets: null },
];

test.beforeEach(async ({ page }) => {
  await page.goto('/routine');
  await page.evaluate(
    ({ routines, exercises }) => {
      localStorage.setItem('health-note.routines.v1:test-user', JSON.stringify(routines));
      localStorage.setItem('health-note.exercises.v1:test-user', JSON.stringify(exercises));
    },
    { routines: [ROUTINE, OTHER], exercises: EXERCISES },
  );
  await page.goto('/routine/r1');
});

test('상세에서 수정해 모든 입력과 ID·다른 루틴을 유지하고 상세로 돌아온다', async ({ page }) => {
  await page.getByRole('button', { name: '더보기', exact: true }).click();
  await page.getByRole('link', { name: '수정', exact: true }).click();
  await expect(page.getByLabel('루틴 이름')).toHaveValue('기존 루틴');
  await expect(page.getByLabel('메모')).toHaveValue('기존 메모');
  await expect(page.getByRole('listitem')).toHaveText(['걷기30분', '스쿼트10회 × 3세트']);
  await expect(page.getByRole('checkbox', { name: '월', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: '금', exact: true })).toBeChecked();
  await page.getByLabel('루틴 이름').fill('수정 루틴');
  await page.getByRole('button', { name: '스쿼트 순서 이동', exact: true }).focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await expect(page.locator('[data-dnd-dropping]')).toHaveCount(0);
  await page.getByRole('radio', { name: '간격 반복' }).check();
  await page.getByLabel('시작일').fill('2026-10-14');
  await page.getByLabel('반복 간격').fill('3');
  await page.getByLabel('메모').fill('바뀐 메모');
  await expect(page.getByLabel('메모')).toHaveValue('바뀐 메모');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/routine/r1');
  await expect(page.getByText('3일 간격', { exact: true })).toBeVisible();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    {
      ...ROUTINE,
      name: '수정 루틴',
      exerciseIds: ['squat', 'walk'],
      schedule: { type: 'interval', startDate: '2026-10-14', intervalDays: 3 },
      memo: '바뀐 메모',
    },
    OTHER,
  ]);
  await page.getByRole('button', { name: '더보기', exact: true }).click();
  await page.getByRole('link', { name: '수정', exact: true }).click();
  await expect(page.getByRole('radio', { name: '간격 반복' })).toBeChecked();
  await expect(page.getByLabel('시작일')).toHaveValue('2026-10-14');
  await expect(page.getByLabel('반복 간격')).toHaveValue('3');
  await page.getByRole('radio', { name: '요일 반복' }).check();
  await page.getByRole('checkbox', { name: '수', exact: true }).check();
  await page.getByRole('button', { name: /^(운동 선택|선택 변경)$/ }).click();
  await page.getByRole('dialog').getByRole('checkbox', { name: /걷기/ }).uncheck();
  await page.getByRole('button', { name: /선택 완료/ }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/routine/r1');
  await expect(page.getByText('매주 수', { exact: true })).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveText(['스쿼트10회 × 3세트']);
});

test('수정 취소와 뒤로가기는 저장 없이 상세로 이동한다', async ({ page }) => {
  await page.getByRole('button', { name: '더보기', exact: true }).click();
  await page.getByRole('link', { name: '수정', exact: true }).click();
  await page.getByLabel('루틴 이름').fill('저장 안 함');
  await page.getByRole('button', { name: '뒤로가기' }).click();
  await expect(page).toHaveURL('/routine/r1');
  await page.goto('/routine/r1/edit');
  await page.getByLabel('메모').fill('취소할 메모');
  await page.getByRole('button', { name: '뒤로가기' }).click();
  await expect(page).toHaveURL('/routine/r1');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    ROUTINE,
    OTHER,
  ]);
});

test('삭제 취소는 보존하고 확인하면 해당 루틴만 삭제한다', async ({ page }) => {
  await page.getByRole('button', { name: '더보기' }).click();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page
    .getByRole('dialog', { name: '루틴 삭제' })
    .getByRole('button', { name: '취소' })
    .click();
  await expect(page).toHaveURL('/routine/r1');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    ROUTINE,
    OTHER,
  ]);
  await page.getByRole('button', { name: '더보기' }).click();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page
    .getByRole('dialog', { name: '루틴 삭제' })
    .getByRole('button', { name: '삭제', exact: true })
    .click();
  await expect(page).toHaveURL('/routine');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    OTHER,
  ]);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('health-note.exercises.v1:test-user')!),
    ),
  ).toEqual(EXERCISES);
});

test('삭제된 운동은 직접 제거한 뒤 저장할 수 있다', async ({ page }) => {
  await page.evaluate(
    (exercises) =>
      localStorage.setItem('health-note.exercises.v1:test-user', JSON.stringify([exercises[0]])),
    EXERCISES,
  );
  await page.getByRole('button', { name: '더보기', exact: true }).click();
  await page.getByRole('link', { name: '수정', exact: true }).click();
  await expect(page.getByText('삭제된 운동', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('저장하지 못했어요.');
  await page.getByRole('button', { name: '삭제된 운동 제거' }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/routine/r1');
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!)[0].exerciseIds, KEY),
  ).toEqual(['squat']);
});

for (const operation of ['edit', 'delete']) {
  test(`${operation} 저장 공간 오류는 기존 데이터를 보존한다`, async ({ page }) => {
    if (operation === 'edit') {
      await page.getByRole('button', { name: '더보기', exact: true }).click();
      await page.getByRole('link', { name: '수정', exact: true }).click();
      await page.getByLabel('루틴 이름').fill('실패한 수정');
    }
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('Full', 'QuotaExceededError');
      };
    });
    if (operation === 'edit') {
      await page.getByRole('button', { name: '저장', exact: true }).click();
      await expect(page.getByLabel('루틴 이름')).toHaveValue('실패한 수정');
    } else {
      await page.getByRole('button', { name: '더보기' }).click();
      await page.getByRole('button', { name: '삭제', exact: true }).click();
      await page
        .getByRole('dialog', { name: '루틴 삭제' })
        .getByRole('button', { name: '삭제', exact: true })
        .click();
    }
    await expect(page.getByRole('alert')).toContainText('못했어요.');
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
      ROUTINE,
      OTHER,
    ]);
  });
}

test('없는 루틴·손상 데이터는 폼을 제공하지 않으며 수정 중 삭제된 루틴을 다시 만들지 않는다', async ({
  page,
}) => {
  await page.goto('/routine/missing/edit');
  await expect(page.getByText('루틴을 찾을 수 없어요.')).toBeVisible();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toHaveCount(0);
  await page.goto('/routine/r1/edit');
  await expect(page.getByLabel('루틴 이름')).toHaveValue(ROUTINE.name);
  await page.evaluate(({ key, other }) => localStorage.setItem(key, JSON.stringify([other])), {
    key: KEY,
    other: OTHER,
  });
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('저장하지 못했어요.');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toEqual([
    OTHER,
  ]);
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), KEY);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('루틴을 불러오지 못했어요.');
  await expect(page.getByRole('button', { name: '저장', exact: true })).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe('{broken');
});

test('키보드 정렬 직후 메모에 입력한 내용과 포커스를 유지해 저장한다', async ({ page }) => {
  await page.getByRole('button', { name: '더보기', exact: true }).click();
  await page.getByRole('link', { name: '수정', exact: true }).click();
  const memo = page.getByRole('textbox', { name: '메모', exact: true });
  await expect(memo).toHaveValue('기존 메모');
  await memo.fill('');
  const handle = page.getByRole('button', { name: '스쿼트 순서 이동', exact: true });
  await handle.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await memo.focus();
  await memo.pressSequentially('정렬 직후 작성한 메모', { delay: 40 });
  await expect(memo).toBeFocused();
  await expect(memo).toHaveValue('정렬 직후 작성한 메모');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/routine/r1');
  await expect(page.getByText('정렬 직후 작성한 메모', { exact: true })).toBeVisible();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!)[0].memo, KEY)).toBe(
    '정렬 직후 작성한 메모',
  );
});
