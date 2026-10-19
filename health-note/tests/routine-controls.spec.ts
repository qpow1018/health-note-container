import { expect, test } from './authFixture';

const EXERCISES = [
  { id: 'walk', name: '걷기', amount: '30분', sets: null },
  { id: 'squat', name: '스쿼트', amount: '10회', sets: 3 },
];

test('공용 입력과 요일 타일은 키보드로 선택하고 활성 일정 값만 제출한다', async ({ page }) => {
  await page.goto('/routine/new');
  await page.evaluate(
    (items) => localStorage.setItem('health-note.exercises.v1:test-user', JSON.stringify(items)),
    EXERCISES,
  );
  await page.reload();
  await page.getByLabel('루틴 이름').fill('반복 운동');
  await page.getByRole('button', { name: '운동 선택', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: '운동 선택' });
  const exercise = sheet.getByRole('checkbox', { name: /걷기/ });
  await exercise.focus();
  await page.keyboard.press('Space');
  await expect(exercise).toBeChecked();
  await expect(sheet.getByRole('button', { name: '선택 완료 (1)', exact: true })).toBeVisible();
  await page.screenshot({ path: '/tmp/health-note-checkbox.png' });
  await sheet.getByRole('button', { name: '선택 완료 (1)', exact: true }).click();
  const monday = page.getByRole('checkbox', { name: '월', exact: true });
  await monday.focus();
  await page.keyboard.press('Space');
  await expect(monday).toBeChecked();
  await page.getByRole('checkbox', { name: '금', exact: true }).check();
  await page.screenshot({ path: '/tmp/health-note-radio-weekdays.png', fullPage: true });
  const weekdays = page.getByRole('radio', { name: '요일 반복' });
  await weekdays.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: '간격 반복' })).toBeChecked();
  await expect(weekdays).not.toBeChecked();
  await expect(page.locator('input[name="days"]:enabled')).toHaveCount(0);
  await expect(page.getByLabel('시작일')).toBeEnabled();
  await page.keyboard.press('ArrowLeft');
  await expect(weekdays).toBeChecked();
  await expect(monday).toBeChecked();
  await expect(page.locator('input[name="startDate"]')).toBeDisabled();
  await expect(page.locator('input[name="intervalDays"]')).toBeDisabled();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/routine');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('health-note.routines.v1:test-user')!)[0],
    ),
  ).toMatchObject({
    exerciseIds: ['walk'],
    schedule: { type: 'weekdays', days: [1, 5] },
  });
});

test('좁은 화면에서 요일 라벨을 눌러 여러 요일을 선택하고 해제한다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/routine/new');
  const monday = page.getByRole('checkbox', { name: '월', exact: true });
  await page.locator('label').filter({ has: monday }).click();
  await expect(monday).toBeChecked();
  await page
    .locator('label')
    .filter({ has: page.getByRole('checkbox', { name: '수', exact: true }) })
    .click();
  await expect(page.getByRole('checkbox', { name: '수', exact: true })).toBeChecked();
  await page.locator('label').filter({ has: monday }).click();
  await expect(monday).not.toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
