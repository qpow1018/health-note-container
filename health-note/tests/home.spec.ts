import { test, expect } from './authFixture';

const exercises = [
  { id: 'push', name: '푸시업', amount: '10회', sets: 3, youtubeLinks: [], memo: '' },
  { id: 'row', name: '로우', amount: '12회', sets: 2, youtubeLinks: [], memo: '' },
];

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-16T12:00:00') });
  await page.addInitScript(
    ({ exercises }) => {
      if (localStorage.getItem('health-note.exercises.v1:test-user')) return;
      localStorage.setItem('health-note.exercises.v1:test-user', JSON.stringify(exercises));
      localStorage.setItem(
        'health-note.routines.v1:test-user',
        JSON.stringify([
          {
            id: 'upper',
            name: '상체 루틴',
            exerciseIds: ['push', 'row'],
            schedule: { type: 'weekdays', days: [5, 6] },
            memo: '천천히 자세에 집중하세요.',
            isActive: true,
          },
          {
            id: 'inactive',
            name: '비활성 루틴',
            exerciseIds: ['push'],
            schedule: { type: 'weekdays', days: [5] },
            memo: '',
            isActive: false,
          },
        ]),
      );
    },
    { exercises },
  );
});

test('완료 API 저장 실패와 조회 실패에서 기존 상태를 보존', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error('quota');
    };
  });
  await page.getByRole('checkbox', { name: '푸시업 완료' }).click();
  await expect(page.getByRole('checkbox', { name: '푸시업 완료' })).not.toBeChecked();
  await expect(page.getByText(/완료 상태를 저장하지 못했어요/)).toBeVisible();
  await page.reload();
  await page.evaluate(() =>
    localStorage.setItem('health-note.routine-progress.v1:test-user', '{broken'),
  );
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('완료 상태를 불러오지 못했어요');
  expect(
    await page.evaluate(() => localStorage.getItem('health-note.routine-progress.v1:test-user')),
  ).toBe('{broken');
});

test('빈 상태, 다음 일정, 삭제된 운동', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('health-note.exercises.v1:test-user', '[]'));
  await page.reload();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByText('삭제된 운동이에요. 완료 대상에서 제외됩니다.')).toHaveCount(2);
  await expect(page.getByText('완료', { exact: true })).toHaveCount(0);
  await page.clock.setSystemTime(new Date('2026-10-18T12:00:00'));
  await page.goto('/');
  await expect(page.getByText('오늘 예정된 루틴이 없어요.')).toBeVisible();
  await expect(page.getByText(/다음 예정/)).toContainText('2026-10-23');
  await page.evaluate(() => localStorage.setItem('health-note.routines.v1:test-user', '[]'));
  await page.reload();
  await expect(page.getByText('아직 등록한 루틴이 없어요.')).toBeVisible();
});

test('홈 완료 체크, 관리 상세 이동, 새 날짜', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '헬스노트', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '오늘의 루틴' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '전체 루틴' })).toHaveCount(0);
  const date = page.locator('time[datetime="2026-10-16"]');
  await expect(date).toHaveText('10월 16일 금요일');
  expect((await date.locator('..').boundingBox())?.height).toBe(28);
  const logo = page.locator('header img');
  await expect(logo).toHaveJSProperty('complete', true);
  expect(await logo.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(
    0,
  );
  const manifest = await page.request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  for (const icon of (await manifest.json()).icons) {
    expect((await page.request.get(icon.src)).ok()).toBe(true);
  }
  expect((await page.request.get('/brand/apple-touch-icon.png')).ok()).toBe(true);
  await page.screenshot({ path: '/tmp/health-note-date-bar.png' });
  await expect(page.getByText('10회 × 3세트')).toBeVisible();
  await page.getByRole('checkbox', { name: '푸시업 완료' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('progressbar', { name: '상체 루틴 진행 상태' })).toHaveAttribute(
    'aria-valuetext',
    '운동 2개 중 1개 완료',
  );
  await expect(page.getByText('운동 2개 중 1개 완료', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('checkbox', { name: '푸시업 완료' })).toBeChecked();
  await page.getByRole('checkbox', { name: '로우 완료' }).click();
  await expect(
    page
      .getByRole('heading', { name: '상체 루틴' })
      .locator('..')
      .getByText('완료', { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: '/tmp/health-note-compact.png' });
  await page.getByRole('checkbox', { name: '로우 완료' }).click();
  await expect(page.getByRole('progressbar', { name: '상체 루틴 진행 상태' })).toHaveAttribute(
    'aria-valuetext',
    '운동 2개 중 1개 완료',
  );
  await expect(page.getByText('운동 2개 중 1개 완료', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/health-note-home-redesign.png' });
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('link', { name: '상체 루틴 관리' }).click();
  await expect(page).toHaveURL('/routine/upper');
  await expect(page.getByRole('switch', { name: '루틴 활성화' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('checkbox', { name: '푸시업 완료' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: '로우 완료' })).not.toBeChecked();
  await page.clock.setSystemTime(new Date('2026-10-17T12:00:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('checkbox', { name: '푸시업 완료' })).not.toBeChecked();
});

test('긴 운동 이름과 여러 루틴, 행 클릭과 키보드 체크', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const exercises = JSON.parse(localStorage.getItem('health-note.exercises.v1:test-user')!);
    exercises[0].name = '아주 긴 운동 이름과 운동량이 들어가도 읽을 수 있는 덤벨 숄더 프레스';
    exercises[0].amount = '천천히 15회, 마지막 반복에서 3초 유지';
    localStorage.setItem('health-note.exercises.v1:test-user', JSON.stringify(exercises));
    const routines = JSON.parse(localStorage.getItem('health-note.routines.v1:test-user')!);
    routines[1].isActive = true;
    localStorage.setItem('health-note.routines.v1:test-user', JSON.stringify(routines));
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.reload();
  const firstRoutine = page.getByRole('list').first().locator(':scope > li').first();
  await firstRoutine
    .getByText('아주 긴 운동 이름과 운동량이 들어가도 읽을 수 있는 덤벨 숄더 프레스', {
      exact: true,
    })
    .click();
  const checkbox = firstRoutine.getByRole('checkbox').first();
  await expect(checkbox).toBeChecked();
  await expect(checkbox).toBeEnabled();
  await checkbox.focus();
  await page.keyboard.press('Space');
  await expect(checkbox).not.toBeChecked();
  await expect(page.getByText('시작 전', { exact: true })).toHaveCount(0);
  await expect(page.getByText('진행 중', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/health-note-home-long.png', fullPage: true });
});
