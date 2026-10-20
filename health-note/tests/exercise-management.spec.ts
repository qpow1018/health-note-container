import { expect, test } from './authFixture';

test('운동 메뉴는 루틴을 기본 표시하고 등록한 운동 탭과 생성 후 복귀를 지원한다', async ({
  page,
}) => {
  await page.goto('/');
  const menu = page.getByRole('navigation', { name: '주요 메뉴' });
  await expect(menu.getByRole('link')).toHaveText(['홈', '운동', '마이']);
  await menu.getByRole('link', { name: '운동', exact: true }).click();
  await expect(page).toHaveURL('/exercise');
  const tabs = page.getByRole('navigation', { name: '운동 관리', exact: true });
  await expect(tabs.getByRole('link', { name: '루틴', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.locator('header').getByRole('link')).toHaveCount(0);
  await tabs.getByRole('link', { name: '등록한 운동' }).click();
  await expect(page).toHaveURL('/exercise?tab=exercises');
  await expect(page.locator('header').getByRole('link')).toHaveCount(0);
  await page.goto('/exercise/new');
  await page.getByLabel('운동 이름').fill('생활 스쿼트');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/exercise?tab=exercises');
  await expect(page.getByRole('heading', { name: '생활 스쿼트' })).toBeVisible();
  await page.reload();
  await expect(tabs.getByRole('link', { name: '등록한 운동' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.screenshot({ path: '/tmp/health-note-exercise-management.png' });
  await page.goto('/exercise');
  await expect(menu.getByRole('link', { name: '운동', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.locator('header').getByRole('link')).toHaveCount(0);
});
