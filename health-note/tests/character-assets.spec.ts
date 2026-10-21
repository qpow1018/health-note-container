import type { Locator } from '@playwright/test';

import { test, expect } from './authFixture';

async function readAsset(asset: Locator) {
  return asset.evaluate((root) =>
    [...root.querySelectorAll('*')].map((element) => ({
      tag: element.tagName,
      attributes: [...element.attributes]
        .filter((attribute) => attribute.name !== 'id')
        .map((attribute) => [
          attribute.name,
          attribute.name === 'href'
            ? '#asset'
            : attribute.value.replace(/url\(#[^)]+\)/g, 'url(#asset)'),
        ]),
    })),
  );
}

test('운동장의 모든 운동이는 같은 1단계 정면 에셋을 사용한다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/playground');
  const assets = page.getByRole('listitem').locator('[data-asset="sprout-stage-1-front"]');
  const expected = await readAsset(assets.first());
  await expect(assets).toHaveCount(5);
  for (const asset of await assets.all()) expect(await readAsset(asset)).toEqual(expected);
  const characters = page.getByRole('listitem').locator('svg');
  for (const character of await characters.all()) {
    await expect(character).toHaveAttribute('data-stage', '1');
    await expect(character).toHaveAttribute('data-direction', 'front');
  }
});
