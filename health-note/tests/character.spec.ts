import type { Locator } from '@playwright/test';

import { test, expect } from './authFixture';

async function readPose(button: Locator) {
  return button.evaluate((element) => {
    const style = getComputedStyle(element);
    const matrix = new DOMMatrixReadOnly(style.transform === 'none' ? undefined : style.transform);
    return { x: matrix.a, y: matrix.d, height: matrix.m42, opacity: Number(style.opacity) };
  });
}

test(`새싹: 대기·반복 터치·키보드 반응 후 기본 표정으로 돌아온다`, async ({ page }) => {
  await page.goto('/character');
  const character = page.getByRole('button', { name: '운동이와 인사하기' });
  await expect(character.locator('svg')).toBeVisible();
  await expect(page.getByRole('button', { name: '걷기', exact: true })).toHaveCount(0);
  await character.hover({ force: true });
  await page.mouse.down();
  await expect.poll(async () => (await readPose(character)).y).toBeLessThan(0.95);
  await page.mouse.up();
  await expect.poll(async () => (await readPose(character)).height).toBeLessThan(-5);
  for (let i = 0; i < 4; i++) await character.click({ force: true });
  await expect(character.locator('svg')).toHaveAttribute('data-reacting', 'false');
  await character.focus();
  await page.keyboard.down('Enter');
  await expect.poll(async () => (await readPose(character)).y).toBeLessThan(0.95);
  await page.keyboard.up('Enter');
  await expect.poll(async () => (await readPose(character)).height).toBeLessThan(-5);
  await expect(character.locator('svg')).toHaveAttribute('data-reacting', 'false');
  await page.getByRole('heading', { name: '운동이', exact: true }).click();
  await page.screenshot({
    path: 'test-results/character-sprout-mobile.png',
    fullPage: true,
  });
  await page.getByRole('link', { name: '마이', exact: true }).click();
  await expect(character).toHaveCount(0);
});

test(`새싹: 동작 줄이기와 320px 화면에서도 운동이와 메뉴가 표시된다`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/character');
  const character = page.getByRole('button', { name: '운동이와 인사하기' });
  await expect(character).toBeVisible();
  await expect
    .poll(() => character.evaluate((element) => element.getAnimations({ subtree: true }).length))
    .toBe(0);
  await character.hover({ force: true });
  await page.mouse.down();
  await expect.poll(async () => (await readPose(character)).opacity).toBeLessThan(0.9);
  expect(await readPose(character)).toMatchObject({ x: 1, y: 1, height: 0 });
  await page.mouse.up();
  await expect.poll(async () => (await readPose(character)).opacity).toBe(1);
  await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('바텀 메뉴에서 운동이로 이동하고 새로고침과 뒤로가기를 지원한다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '운동이와 인사하기' })).toHaveCount(0);
  const navigation = page.getByRole('navigation', { name: '주요 메뉴' });
  await expect(navigation.getByRole('link')).toHaveText(['홈', '운동', '운동이', '마이']);
  await navigation.getByRole('link', { name: '운동이', exact: true }).click();
  await expect(page).toHaveURL('/character');
  await expect(navigation.getByRole('link', { name: '운동이', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.reload();
  await expect(page.getByRole('button', { name: '운동이와 인사하기' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL('/');
});

test('새싹을 표시하고 후보 선택 메뉴는 노출하지 않는다', async ({ page }) => {
  await page.goto('/character');
  await expect(
    page.getByRole('button', { name: '운동이와 인사하기' }).locator('svg'),
  ).toHaveAttribute('data-appearance', 'sprout');
  await expect(page.getByRole('heading', { name: '새싹', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: '운동이 외형 선택' })).toHaveCount(0);
});

test('여섯 성장 모습을 선택해 비교하고 각 단계에서 인사할 수 있다', async ({ page }) => {
  await page.goto('/character');
  const choices = page.getByRole('group', { name: '성장 모습 선택' });
  await expect(choices.getByRole('button')).toHaveCount(6);
  const character = page.getByRole('button', { name: '운동이와 인사하기' });
  for (let stage = 1; stage <= 6; stage++) {
    const choice = choices.getByRole('button', { name: new RegExp(`^${stage}단계`) });
    await choice.click();
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    await expect(character.locator('svg')).toHaveAttribute('data-stage', String(stage));
    await expect(character.locator('svg')).toHaveAttribute('data-reacting', 'false');
    await character.click();
    await expect(character.locator('svg')).toHaveAttribute('data-reacting', 'false');
  }
  await page.getByRole('heading', { name: '운동이', exact: true }).click();
  await page.screenshot({ path: 'test-results/character-stage-six.png', fullPage: true });
  await page.reload();
  await expect(character.locator('svg')).toHaveAttribute('data-stage', '1');
});
