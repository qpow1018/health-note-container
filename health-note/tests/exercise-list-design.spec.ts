import { expect, test } from './authFixture';

test('목록의 버튼 배치와 정보 표현은 빈 값과 긴 이름을 처리한다', async ({ page }) => {
  await page.goto('/exercise');
  await expect(page.getByRole('link', { name: '운동 추가', exact: true })).toHaveCount(1);
  await expect(page.getByRole('link', { name: '순서 변경' })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/health-note-list-empty.png' });
  await page.evaluate(() => {
    localStorage.setItem(
      'health-note.exercises.v1:test-user',
      JSON.stringify([
        { id: 'a', name: '푸시업', amount: '10회', sets: 3, youtubeLinks: [], memo: '' },
        { id: 'b', name: '스쿼트', amount: '', sets: 3, youtubeLinks: [], memo: '' },
        { id: 'c', name: '걷기', amount: '', sets: null, youtubeLinks: [], memo: '' },
        {
          id: 'd',
          name: '아주긴운동이름'.repeat(10),
          amount: '자유로운운동량'.repeat(10),
          sets: null,
          youtubeLinks: [],
          memo: '',
        },
      ]),
    );
  });
  await page.reload();
  await expect(page.getByText('총 4개', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '운동 추가', exact: true })).toHaveCount(1);
  await expect(page.getByRole('link', { name: '순서 변경' })).toBeVisible();
  await expect(page.getByRole('listitem').locator('p')).toHaveText([
    '10회 × 3세트',
    '3세트',
    '-',
    '자유로운운동량'.repeat(10),
  ]);
  await page.screenshot({ path: '/tmp/health-note-list.png' });
  await page.setViewportSize({ width: 320, height: 744 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
