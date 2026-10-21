import { expect, test } from './authFixture';

const PLAN = {
  id: 'home-plan',
  start_date: '2026-10-21',
  time_zone: 'Asia/Seoul',
  duration: 14,
  status: 'active',
  target_xp: 9000,
  exercise_day_count: 6,
  assignments: [1, 3, 5].map((weekday) => ({ weekday, routine_id: 'r' })),
};

test('작은 운동이 영역과 오늘 운동을 표시하며 체크는 서버나 기존 기록에 저장하지 않는다', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-21T12:00:00+09:00'));
  await page.goto('/');
  await expect(page.getByRole('link', { name: '플랜 만들기' })).toBeVisible();
  const record = { routineId: 'r', date: '2026-10-20', exerciseId: 'e' };
  await page.evaluate(
    ({ plan, record }) => {
      localStorage.setItem('health-note.plans.v1:test-user', JSON.stringify([plan]));
      localStorage.setItem(
        'health-note.routines.v1:test-user',
        JSON.stringify([
          { id: 'r', name: '생활운동', memo: '', exerciseIds: ['walk', 'squat', 'raise'] },
        ]),
      );
      localStorage.setItem(
        'health-note.exercises.v1:test-user',
        JSON.stringify([
          { id: 'walk', name: '산책', amount: '20분', sets: null },
          { id: 'squat', name: '스쿼트', amount: '20회', sets: null },
          { id: 'raise', name: '뒤꿈치 들기', amount: '30회', sets: null },
        ]),
      );
      localStorage.setItem('health-note.progress.v1:test-user', JSON.stringify([record]));
    },
    { plan: PLAN, record },
  );
  let writes = 0;
  page.on('request', (request) => {
    if (request.url().includes('/rest/v1/') && request.method() !== 'GET') writes++;
  });
  await page.reload();
  const compact = page.getByRole('region', { name: '운동이', exact: true });
  await expect(compact).toHaveCount(1);
  await expect(compact).toBeVisible();
  await expect(page.getByText(/운동이 [12]안/)).toHaveCount(0);
  await expect(page.getByRole('checkbox')).toHaveCount(3);
  await expect(page.getByText('0 / 3 완료')).toBeVisible();
  await page.getByRole('checkbox', { name: /산책/ }).check();
  await expect(page.getByText('1 / 3 완료')).toBeVisible();
  await expect(compact.getByRole('progressbar')).toHaveAttribute('value', '500');
  await page.getByRole('checkbox', { name: /스쿼트/ }).check();
  await expect(compact).toContainText('Lv.2');
  await page.getByRole('checkbox', { name: /뒤꿈치/ }).check();
  await expect(page.getByText('오늘 정한 운동을 모두 해냈어요.')).toBeVisible();
  await page.getByRole('checkbox', { name: /산책/ }).uncheck();
  await expect(page.getByText('2 / 3 완료')).toBeVisible();
  await page.screenshot({ path: '/tmp/health-note-home-compact.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await expect(page.getByText('0 / 3 완료')).toBeVisible();
  expect(writes).toBe(0);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('health-note.progress.v1:test-user')!),
    ),
  ).toEqual([record]);
  await expect(page.getByText('진행 중인 14일 플랜', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /진행 중인 14일 플랜/ })).toHaveCount(0);
});

test('플랜이 없으면 생성 안내, 운동일이 아니면 휴식 안내를 표시한다', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-22T12:00:00+09:00'));
  await page.goto('/');
  await expect(page.getByRole('link', { name: '플랜 만들기' })).toBeVisible();
  await expect(page.getByRole('region', { name: '운동이', exact: true })).toBeVisible();
  await page.evaluate(
    (plan) => localStorage.setItem('health-note.plans.v1:test-user', JSON.stringify([plan])),
    PLAN,
  );
  await page.reload();
  await expect(page.getByText('오늘은 쉬는 날이에요.')).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
});

test('루트 진입은 플랜으로 대체하고 네 개 메뉴와 생성 후 뒤로가기를 연결한다', async ({ page }) => {
  await page.goto('/exercise');
  await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toBeVisible();
  await page.evaluate(() => {
    history.pushState(null, '', '/');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveURL('/plan');
  const navigation = page.getByRole('navigation', { name: '주요 메뉴' });
  await expect(navigation.getByRole('link')).toHaveText(['플랜', '운동', '운동장', '마이']);
  await expect(navigation.getByRole('link', { name: '플랜', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('heading', { name: '헬스노트' })).toBeVisible();
  await page.getByRole('link', { name: '플랜 만들기' }).click();
  await expect(page).toHaveURL('/plan/new');
  await page.goBack();
  await expect(page).toHaveURL('/plan');
  await page.goBack();
  await expect(page).toHaveURL('/exercise');
});
