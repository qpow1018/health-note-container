import { expect, test } from './authFixture';

const KEY = 'health-note.routines.v1:test-user';
const EXERCISES = [
  { id: 'squat', name: '스쿼트', amount: '10회', sets: 3 },
  { id: 'walk', name: '걷기', amount: '30분', sets: null },
];

test.beforeEach(async ({ page }) => {
  await page.goto('/exercise');
  await page.evaluate(
    (exercises) =>
      localStorage.setItem('health-note.exercises.v1:test-user', JSON.stringify(exercises)),
    EXERCISES,
  );
  await page.getByRole('link', { name: '루틴 생성' }).click();
});

test('요일 루틴에 운동을 선택하고 정렬해 저장하며 새로고침 후 유지한다', async ({ page }) => {
  await page.getByLabel('루틴 이름').fill('  기본 루틴  ');
  await page.getByRole('button', { name: /^(운동 선택|선택 변경)$/ }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('checkbox', { name: /스쿼트/ }).check();
  await sheet.getByRole('checkbox', { name: /걷기/ }).check();
  await sheet.getByRole('button', { name: /선택 완료/ }).click();
  await page.getByRole('button', { name: '걷기 순서 이동', exact: true }).focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await expect(page.locator('[data-dnd-dropping]')).toHaveCount(0);
  await page.getByRole('checkbox', { name: '월', exact: true }).check();
  await page.getByRole('checkbox', { name: '금', exact: true }).check();
  await page.getByLabel('메모').fill('  천천히  ');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/exercise');
  await page.reload();
  await expect(page.getByRole('heading', { name: '기본 루틴' })).toBeVisible();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toMatchObject([
    {
      name: '기본 루틴',
      isActive: false,
      exerciseIds: ['walk', 'squat'],
      schedule: { type: 'weekdays', days: [1, 5] },
      memo: '천천히',
    },
  ]);
});

test('간격 반복은 시작일과 간격만 저장한다', async ({ page }) => {
  await page.getByLabel('루틴 이름').fill('격일 운동');
  await page.getByRole('button', { name: /^(운동 선택|선택 변경)$/ }).click();
  await page.getByRole('dialog').getByRole('checkbox', { name: /걷기/ }).check();
  await page.getByRole('button', { name: /선택 완료/ }).click();
  await page.getByRole('checkbox', { name: '월', exact: true }).check();
  await page.getByRole('radio', { name: '간격 반복' }).check();
  await page.getByLabel('시작일').fill('2026-10-14');
  await page.getByLabel('반복 간격').fill('3');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/exercise');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY)).toMatchObject([
    { schedule: { type: 'interval', startDate: '2026-10-14', intervalDays: 3 } },
  ]);
});

test('미선택과 공백 이름을 거부하고 시트 취소는 선택을 변경하지 않는다', async ({ page }) => {
  await page.getByLabel('루틴 이름').fill('   ');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('루틴 이름을 입력해 주세요.');
  await page.getByLabel('루틴 이름').fill('루틴');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('운동을 하나 이상 선택해 주세요.');
  await page.getByRole('button', { name: /^(운동 선택|선택 변경)$/ }).click();
  await page.getByRole('dialog').getByRole('checkbox', { name: /걷기/ }).check();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(page.getByRole('listitem')).toHaveCount(0);
  await page.getByRole('button', { name: /^(운동 선택|선택 변경)$/ }).click();
  await expect(page.getByRole('dialog').getByRole('checkbox', { name: /걷기/ })).not.toBeChecked();
  await page.getByRole('dialog').getByRole('checkbox', { name: /걷기/ }).check();
  await page.getByRole('button', { name: /선택 완료/ }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('반복할 요일을 하나 이상 선택해 주세요.');
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull();
});

for (const failure of ['quota', 'corrupt', 'deleted']) {
  test(`저장 실패 ${failure}에서 입력과 기존 데이터를 유지한다`, async ({ page }) => {
    await page.getByLabel('루틴 이름').fill('저장할 루틴');
    await page.getByRole('button', { name: /^(운동 선택|선택 변경)$/ }).click();
    await page.getByRole('dialog').getByRole('checkbox', { name: /걷기/ }).check();
    await page.getByRole('button', { name: /선택 완료/ }).click();
    await page.getByRole('checkbox', { name: '월', exact: true }).check();
    await page.evaluate(
      ({ key, failure }) => {
        if (failure === 'quota')
          Storage.prototype.setItem = () => {
            throw new DOMException('Full', 'QuotaExceededError');
          };
        if (failure === 'corrupt') localStorage.setItem(key, '{broken');
        if (failure === 'deleted') localStorage.setItem('health-note.exercises.v1:test-user', '[]');
      },
      { key: KEY, failure },
    );
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('저장하지 못했어요.');
    await expect(page.getByLabel('루틴 이름')).toHaveValue('저장할 루틴');
    await expect(page.getByRole('listitem')).toHaveCount(1);
    if (failure === 'deleted') {
      await expect(page.getByRole('listitem')).toContainText('삭제된 운동');
      await expect(page.getByRole('button', { name: '삭제된 운동 제거' })).toBeVisible();
    } else {
      await expect(page.getByRole('listitem')).toContainText('걷기');
    }
    expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(
      failure === 'corrupt' ? '{broken' : null,
    );
  });
}
