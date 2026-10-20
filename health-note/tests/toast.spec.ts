import { expect, test } from './authFixture';

test('성공·안내는 3초, 오류는 5초 후 닫히며 개별 duration을 우선한다', async ({ page }) => {
  await page.clock.install();
  await page.goto('/exercise?tab=exercises');
  await expect(page.getByText('아직 등록한 운동이 없어요.')).toBeVisible();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.evaluate(async () => {
    const modulePath = '/src/utils/toast.ts';
    const { default: toast } = await import(modulePath);
    toast.success('성공');
    toast.info('안내');
    toast.error('오류');
  });
  await expect(page.getByRole('status')).toHaveCount(2);
  await expect(page.getByRole('alert')).toHaveText('오류');
  await page.clock.runFor(2999);
  await expect(page.getByRole('status')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('alert')).toBeVisible();
  await page.clock.runFor(1999);
  await expect(page.getByRole('alert')).toBeVisible();
  await page.clock.runFor(1);
  await expect(page.getByRole('alert')).toHaveCount(0);

  await page.evaluate(async () => {
    const modulePath = '/src/utils/toast.ts';
    const { default: toast } = await import(modulePath);
    toast.error('개별 시간', { duration: 1000 });
  });
  await expect(page.getByRole('alert')).toBeVisible();
  await page.clock.runFor(1000);
  await expect(page.getByRole('alert')).toHaveCount(0);
});
