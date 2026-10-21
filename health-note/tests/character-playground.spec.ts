import { test, expect } from './authFixture';

test('운동장은 이미지 없이 SVG 운동이 5마리를 표시하고 일시정지를 지원한다', async ({ page }) => {
  const images: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/characters/') && request.url().endsWith('.png'))
      images.push(request.url());
  });
  await page.goto('/playground');
  const playground = page.getByRole('region', { name: '운동이 운동장', exact: true });
  const residents = playground.getByRole('listitem');
  await expect(residents).toHaveCount(5);
  await expect(residents.locator('svg')).toHaveCount(5);
  await expect(residents.locator('img')).toHaveCount(0);
  const ids = await residents
    .locator('radialGradient')
    .evaluateAll((elements) => elements.map((element) => element.id));
  expect(new Set(ids).size).toBe(5);
  const moving = await playground.screenshot();
  await expect.poll(async () => (await playground.screenshot()).equals(moving)).toBe(false);
  await playground.getByRole('button', { name: '일시정지', exact: true }).click();
  const still = await playground.screenshot();
  await page.evaluate(async () => {
    for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);
  });
  expect((await playground.screenshot()).equals(still)).toBe(true);
  await page.screenshot({
    path: 'test-results/character-playground-svg-mobile.png',
    fullPage: true,
  });
  expect(images).toEqual([]);
  await playground.getByRole('button', { name: '다시 재생', exact: true }).click();
  await expect(playground.getByRole('button', { name: '일시정지', exact: true })).toBeVisible();
});

test('SVG 운동장도 320px·동작 줄이기를 지원한다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/playground');
  const residents = page.getByRole('list', { name: '함께 있는 운동이' });
  await expect(residents.locator('svg')).toHaveCount(5);
  await expect
    .poll(() => residents.evaluate((element) => element.getAnimations({ subtree: true }).length))
    .toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
