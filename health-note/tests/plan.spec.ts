import { expect, test } from './authFixture';

const ROUTINES = [
  { id: 'a', name: 'A루틴', exerciseIds: ['squat'], memo: '' },
  { id: 'b', name: 'B루틴', exerciseIds: ['squat'], memo: '' },
];

test('첫 화면 플랜 메뉴에서 빈 상태를 안내하고 루틴 생성 후 복귀한다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link')).toHaveText([
    '플랜',
    '운동',
    '운동장',
    '마이',
  ]);
  await expect(page.getByRole('link', { name: '플랜', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('link', { name: '루틴 만들기' })).toHaveCount(0);
  await page.getByRole('link', { name: '플랜 만들기' }).click();
  await expect(page).toHaveURL('/plan/new');
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.evaluate(() =>
    localStorage.setItem(
      'health-note.exercises.v1:test-user',
      JSON.stringify([{ id: 'squat', name: '스쿼트', amount: '50회', sets: null }]),
    ),
  );
  await page.getByRole('link', { name: '루틴 만들기' }).click();
  await expect(page).toHaveURL('/routine/new');
  await page.getByRole('button', { name: '뒤로가기' }).click();
  await expect(page).toHaveURL('/plan/new');
  await page.getByRole('link', { name: '루틴 만들기' }).click();
  await page.getByLabel('루틴 이름').fill('A루틴');
  await page.getByRole('button', { name: '운동 선택', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('checkbox', { name: /스쿼트/ })
    .check();
  await page.getByRole('button', { name: /선택 완료/ }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/plan/new');
  await expect(page.getByRole('radio', { name: '14일', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '루틴 만들기' })).toHaveCount(0);
  await page.getByRole('button', { name: '뒤로가기' }).click();
  await expect(page).toHaveURL('/plan');
});

test('요일별 루틴과 기간으로 운동일·경험치를 계산하고 휴식으로 변경한다', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-21T12:00:00+09:00'));
  await page.goto('/plan');
  await expect(page.getByRole('link', { name: '플랜 만들기' })).toBeVisible();
  await page.evaluate(
    (items) => localStorage.setItem('health-note.routines.v1:test-user', JSON.stringify(items)),
    ROUTINES,
  );
  await page.evaluate(() =>
    localStorage.setItem(
      'health-note.exercises.v1:test-user',
      JSON.stringify([{ id: 'squat', name: '스쿼트', amount: '50회', sets: null }]),
    ),
  );
  await page.reload();
  await page.getByRole('link', { name: '플랜 만들기' }).click();
  await expect(page.locator('button[aria-haspopup="dialog"]')).toHaveCount(7);
  for (const row of await page.locator('button[aria-haspopup="dialog"]').all())
    await expect(row).toContainText('휴식');
  await expect(page.getByText('최소 하루에 루틴을 배정해 주세요.')).toBeVisible();
  await page.getByText('아직 운동이 낯설다면, 작은 실천부터 습관을 만들어봐요.').click();
  await expect(page.getByRole('radio', { name: '14일', exact: true })).toBeChecked();
  const summary = page.getByRole('region', { name: '시작 전 확인' });
  await expect(summary).toContainText('최종 성장 목표9,000 XP');
  await expect(summary).toContainText('하루 전체 완료 몫운동할 요일을 선택해 주세요');
  for (const day of ['월요일', '수요일', '금요일']) {
    await page.getByRole('button', { name: new RegExp('^' + day) }).click();
    await expect(page.getByRole('dialog').getByText('스쿼트', { exact: true })).toHaveCount(2);
    await page
      .getByRole('dialog')
      .getByRole('radio', { name: /^A루틴/ })
      .click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: day + ' A루틴' })).toBeFocused();
  }
  await expect(summary).toContainText('총 운동일6일');
  await expect(summary).toContainText('하루 전체 완료 몫1,500 XP');
  for (const day of ['화요일', '목요일', '토요일']) {
    await page.getByRole('button', { name: new RegExp('^' + day) }).click();
    await page
      .getByRole('dialog')
      .getByRole('radio', { name: /^B루틴/ })
      .click();
  }
  await page.getByRole('button', { name: '월요일 A루틴' }).click();
  await expect(page.getByRole('dialog').getByRole('radio', { name: /^A루틴/ })).toBeChecked();
  await page.screenshot({ path: '/tmp/health-note-plan-routine-picker.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '월요일 A루틴' })).toBeFocused();
  await page.getByRole('button', { name: '월요일 A루틴' }).click();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(page.getByRole('button', { name: '월요일 A루틴' })).toBeVisible();
  await expect(summary).toContainText('2026-10-21');
  await expect(summary).toContainText('2026-11-03');
  await expect(summary).toContainText('총 운동일12일');
  await expect(summary).toContainText('최종 성장 목표9,000 XP');
  await expect(summary).toContainText('하루 전체 완료 몫750 XP');
  await expect(page.getByText('최소 하루에 루틴을 배정해 주세요.')).toHaveCount(0);
  const startButton = page.getByRole('button', { name: '플랜 시작', exact: true });
  const initialButtonBox = await startButton.boundingBox();
  expect(initialButtonBox!.y + initialButtonBox!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height,
  );
  const notice = summary.getByText(
    '기간은 성장과 보상의 기준이에요. 기간이 지나도 계속 이어갈 수 있어요.',
  );
  await notice.scrollIntoViewIfNeeded();
  const noticeBox = await notice.boundingBox();
  const buttonBox = await startButton.boundingBox();
  expect(buttonBox!.y).toBe(initialButtonBox!.y);
  expect(noticeBox!.y + noticeBox!.height).toBeLessThan(buttonBox!.y);
  await page.screenshot({ path: '/tmp/health-note-plan-form.png' });
  await page.getByRole('radio', { name: '30일', exact: true }).check();
  await expect(summary).toContainText('2026-11-19');
  await expect(summary).toContainText('총 운동일26일');
  await expect(summary).toContainText('최종 성장 목표9,000 XP');
  await expect(summary).toContainText('하루 전체 완료 몫약 346.15 XP');
  await page.getByRole('radio', { name: '30일', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: '100일', exact: true })).toBeChecked();
  await expect(summary).toContainText('2027-01-28');
  await expect(summary).toContainText('총 운동일86일');
  await expect(summary).toContainText('최종 성장 목표9,000 XP');
  await expect(summary).toContainText('하루 전체 완료 몫약 104.65 XP');
  await page.getByRole('button', { name: '수요일 A루틴' }).click();
  await page.getByRole('dialog').getByRole('radio', { name: /^휴식/ }).click();
  await expect(page.getByRole('button', { name: '수요일 휴식' })).toBeVisible();
  await expect(summary).toContainText('총 운동일71일');
  await expect(summary).toContainText('최종 성장 목표9,000 XP');
  await expect(summary).toContainText('하루 전체 완료 몫약 126.76 XP');
  await expect(page.getByRole('button', { name: '플랜 시작', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: '뒤로가기' }).click();
  await expect(page).toHaveURL('/plan');
});

test('조회 실패를 빈 목록으로 표시하지 않고 재시도한다', async ({ page }) => {
  let isFailing = true;
  let releaseRequest!: () => void;
  const responseReady = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  await page.route('**/rest/v1/routines?*', async (route) => {
    if (!isFailing) return route.fallback();
    await responseReady;
    await route.fulfill({ status: 500, json: { message: 'Test failure' } });
  });
  await page.goto('/plan/new');
  await expect(page.getByRole('status', { name: '불러오고 있어요.' })).toBeVisible();
  await expect(page.getByRole('link', { name: '루틴 만들기' })).toHaveCount(0);
  releaseRequest();
  await expect(page.getByRole('alert')).toContainText('루틴을 불러오지 못했어요.', {
    timeout: 15000,
  });
  await expect(page.getByRole('link', { name: '루틴 만들기' })).toHaveCount(0);
  isFailing = false;
  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.getByRole('link', { name: '루틴 만들기' })).toBeVisible();
});

test('포함 운동 조회 실패 시 재시도하고 배정은 유지한다', async ({ page }) => {
  await page.goto('/plan');
  await expect(page.getByRole('link', { name: '플랜 만들기' })).toBeVisible();
  await page.evaluate(
    (items) => localStorage.setItem('health-note.routines.v1:test-user', JSON.stringify(items)),
    ROUTINES,
  );
  let isFailing = true;
  await page.route('**/rest/v1/exercises?*', async (route) => {
    if (!isFailing) return route.fallback();
    await route.fulfill({ status: 500, json: { message: 'Test failure' } });
  });
  await page.getByRole('link', { name: '플랜 만들기' }).click();
  await page.getByRole('button', { name: '월요일 휴식' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    '포함 운동을 불러오지 못했어요.',
  );
  await page
    .getByRole('dialog')
    .getByRole('radio', { name: /^A루틴/ })
    .click();
  await expect(page.getByRole('button', { name: '월요일 A루틴' })).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem(
      'health-note.exercises.v1:test-user',
      JSON.stringify([{ id: 'squat', name: '스쿼트', amount: '50회', sets: null }]),
    ),
  );
  await page.getByRole('button', { name: '월요일 A루틴' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  isFailing = false;
  await page.getByRole('dialog').getByRole('button', { name: '다시 시도' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('dialog').getByRole('radio', { name: /^A루틴/ })).toBeChecked();
  await expect(page.getByRole('dialog').getByText('스쿼트', { exact: true })).toHaveCount(2);
  await page
    .getByRole('dialog')
    .getByRole('radio', { name: /^A루틴/ })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
