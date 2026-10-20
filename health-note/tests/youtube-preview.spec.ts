import { expect, test } from './authFixture';
import { getYoutubeVideoId } from '../src/features/exercise/utils/youtubeUrl';

const ID = 'M7lc1UVf-VE';

for (const url of [
  `https://youtu.be/${ID}?t=10`,
  `https://www.youtube.com/watch?v=${ID}&t=20`,
  `http://m.youtube.com/watch?v=${ID}`,
  `https://youtube.com/shorts/${ID}`,
  `https://youtube.com/embed/${ID}`,
  `https://youtube.com/live/${ID}`,
]) {
  test(`영상 ID: ${url}`, () => {
    expect(getYoutubeVideoId(url)).toBe(ID);
  });
}

for (const url of [
  'https://youtube.com/@channel',
  'https://youtube.com/playlist?list=example',
  'https://youtube.com/watch?v=short',
  `https://youtube.com.evil.example/watch?v=${ID}`,
  'not a url',
]) {
  test(`임베드하지 않는 주소: ${url}`, () => {
    expect(getYoutubeVideoId(url)).toBeNull();
  });
}

test('영상 주소는 플레이어와 원본 링크를, 채널 주소는 링크만 표시한다', async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body>Test player boundary</body></html>',
    }),
  );
  await page.goto('/exercise?tab=exercises');
  const urls = [`https://youtu.be/${ID}`, 'https://youtube.com/@channel'];
  await page.evaluate(
    (urls) =>
      localStorage.setItem(
        'health-note.exercises.v1:test-user',
        JSON.stringify([
          { id: 'embed', name: '푸시업', amount: '', sets: null, youtubeLinks: urls, memo: '' },
        ]),
      ),
    urls,
  );
  await page.goto('/exercise/embed');
  await expect(page.locator('iframe')).toHaveCount(1);
  await expect(page.getByTitle('유튜브 영상 1')).toHaveAttribute(
    'src',
    `https://www.youtube-nocookie.com/embed/${ID}?playsinline=1`,
  );
  for (let i = 0; i < urls.length; i++) {
    await expect(page.getByRole('link', { name: `영상 ${i + 1} (새 탭)` })).toHaveAttribute(
      'href',
      urls[i],
    );
  }
  await expect(page.getByText('영상 1', { exact: true })).toHaveCount(0);
});
