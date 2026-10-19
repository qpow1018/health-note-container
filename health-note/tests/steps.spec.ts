import { test, expect } from './authFixture';

test('일반 브라우저에서는 걸음 카드를 표시하지 않는다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '헬스노트', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '오늘 걸음', exact: true })).toHaveCount(0);
});

test('네이티브 응답으로 권한 안내, 시작, 누적값, 중지와 날짜 변경을 표시한다', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-19T12:00:00') });
  await page.addInitScript(() => {
    let enabled = false;
    let status = 'permission';
    let steps = 0;
    (window as unknown as { ReactNativeWebView: unknown }).ReactNativeWebView = {
      postMessage(raw: string) {
        const message = JSON.parse(raw);
        if (message.type !== 'health-note-steps') return;
        if (message.action === 'start') {
          enabled = true;
          status = 'tracking';
          steps = 1234;
        }
        if (message.action === 'reset') steps = 0;
        if (message.action === 'stop') {
          enabled = false;
          status = 'disabled';
        }
        window.dispatchEvent(
          new CustomEvent('health-note-steps', {
            detail: { date: '2026-10-19', steps, status, enabled },
          }),
        );
      },
    };
  });
  await page.goto('/');
  const card = page.getByRole('region', { name: '오늘 걸음' });
  await expect(card).toContainText('신체 활동 권한을 허용하면');
  await card.getByRole('button', { name: '자동 기록 켜기' }).click();
  await expect(card).toContainText('1,234');
  await expect(card.getByRole('status')).toHaveText('자동으로 기록 중이에요.');
  await page.screenshot({ path: '/tmp/health-note-steps-card.png', fullPage: true });
  await card.getByRole('button', { name: '오늘 기록 초기화' }).click();
  const confirmation = page.getByRole('dialog', { name: '오늘 기록 초기화' });
  await expect(confirmation).toBeVisible();
  await page.screenshot({ path: '/tmp/health-note-steps-reset-confirm.png', fullPage: true });
  await confirmation.getByRole('button', { name: '취소' }).click();
  await expect(card.locator('strong')).toHaveText('1,234');
  await card.getByRole('button', { name: '오늘 기록 초기화' }).click();
  await confirmation.getByRole('button', { name: '초기화', exact: true }).click();
  await expect(confirmation).not.toBeVisible();
  await expect(card.locator('strong')).toHaveText('0');
  await expect(card.getByRole('status')).toHaveText('자동으로 기록 중이에요.');
  await card.getByRole('button', { name: '자동 기록 끄기' }).click();
  await expect(card.locator('strong')).toHaveText('0');
  await expect(card.getByRole('button', { name: '자동 기록 켜기' })).toBeEnabled();
  await page.clock.setSystemTime(new Date('2026-10-20T00:00:01'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(card.locator('strong')).toHaveText('0');
});

test('지원하지 않는 센서와 중단 상태를 구분하고 잘못된 응답을 무시한다', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { ReactNativeWebView: unknown }).ReactNativeWebView = {
      postMessage(raw: string) {
        if (JSON.parse(raw).type === 'health-note-steps')
          document.documentElement.dataset.stepsReady = 'true';
      },
    };
  });
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.stepsReady === 'true');
  const send = (status: string, steps = 0) =>
    page.evaluate(
      ({ status, steps }) => {
        window.dispatchEvent(
          new CustomEvent('health-note-steps', {
            detail: { date: '2026-10-19', steps, status, enabled: true },
          }),
        );
      },
      { status, steps },
    );
  await send('unsupported');
  const card = page.getByRole('region', { name: '오늘 걸음' });
  await expect(card).toContainText('걸음 센서를 지원하지 않아요');
  await expect(card.getByRole('button')).toHaveCount(0);
  await send('stopped');
  await expect(card).toContainText('기록이 중단됐어요');
  await expect(card.getByRole('button', { name: '자동 기록 켜기' })).toBeVisible();
  await send('tracking', -1);
  await expect(card).toContainText('기록이 중단됐어요');
});
