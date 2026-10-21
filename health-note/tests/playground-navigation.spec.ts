import { test, expect } from './authFixture';

test('바텀 메뉴에서 운동장으로 이동하고 새로고침·뒤로가기를 지원한다', async ({ page }) => {
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: '주요 메뉴' });
  await expect(navigation.getByRole('link')).toHaveText(['홈', '운동', '운동장', '마이']);
  await navigation.getByRole('link', { name: '운동장', exact: true }).click();
  await expect(page).toHaveURL('/playground');
  await expect(navigation.getByRole('link', { name: '운동장', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('heading', { name: '운동장', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: '표현 방식 선택' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '운동이와 인사하기' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('listitem')).toHaveCount(5);
  await page.goBack();
  await expect(page).toHaveURL('/');
});

test('이전 캐릭터 페이지는 제거하고 홈에 실험 UI를 추가하지 않는다', async ({ page }) => {
  await page.goto('/character');
  await expect(page.getByRole('heading', { name: '페이지를 찾을 수 없어요.' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('button', { name: '운동이와 인사하기' })).toHaveCount(0);
});
