import type { Locator } from '@playwright/test';

import { test, expect } from './authFixture';

async function readPose(button: Locator) {
  return button.evaluate((element) => {
    const style = getComputedStyle(element);
    const matrix = new DOMMatrixReadOnly(style.transform === 'none' ? undefined : style.transform);
    return { x: matrix.a, y: matrix.d, height: matrix.m42, opacity: Number(style.opacity) };
  });
}

test('홈 아바타는 대기·반복 터치·키보드 반응 후 기본 표정으로 돌아온다', async ({ page }) => {
  await page.goto('/');
  const avatar = page.getByRole('button', { name: '운동이와 인사하기' });
  await expect(avatar.locator('svg')).toBeVisible();
  await expect(page.getByRole('heading', { name: '운동이', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '걷기', exact: true })).toHaveCount(0);
  await avatar.hover({ force: true });
  await page.mouse.down();
  await expect.poll(async () => (await readPose(avatar)).y).toBeLessThan(0.95);
  await page.mouse.up();
  await expect.poll(async () => (await readPose(avatar)).height).toBeLessThan(-5);
  for (let i = 0; i < 4; i++) await avatar.click({ force: true });
  await expect(avatar.locator('svg')).toHaveAttribute('data-reacting', 'false');
  await avatar.focus();
  await page.keyboard.down('Enter');
  await expect.poll(async () => (await readPose(avatar)).y).toBeLessThan(0.95);
  await page.keyboard.up('Enter');
  await expect.poll(async () => (await readPose(avatar)).height).toBeLessThan(-5);
  await expect(avatar.locator('svg')).toHaveAttribute('data-reacting', 'false');
  await page.getByRole('heading', { name: '헬스노트', exact: true }).click();
  await page.screenshot({ path: 'test-results/home-avatar-mobile.png', fullPage: true });
  await page.getByRole('link', { name: '마이', exact: true }).click();
  await expect(avatar).toHaveCount(0);
});

test('동작 줄이기와 320px 화면에서도 아바타와 기존 활동·루틴이 함께 표시된다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  const avatar = page.getByRole('button', { name: '운동이와 인사하기' });
  await expect(avatar).toBeVisible();
  await expect
    .poll(() => avatar.evaluate((element) => element.getAnimations({ subtree: true }).length))
    .toBe(0);
  await avatar.hover({ force: true });
  await page.mouse.down();
  await expect.poll(async () => (await readPose(avatar)).opacity).toBeLessThan(0.9);
  expect(await readPose(avatar)).toMatchObject({ x: 1, y: 1, height: 0 });
  await page.mouse.up();
  await expect.poll(async () => (await readPose(avatar)).opacity).toBe(1);
  await expect(page.getByRole('region', { name: '오늘 활동' })).toBeVisible();
  await expect(page.getByRole('region', { name: '오늘의 루틴' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
