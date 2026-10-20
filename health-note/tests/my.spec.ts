import { test, expect, AUTH_STORAGE_KEY, createSession } from './authFixture';

test('닉네임 기본값·입력 제한·저장 실패 복구와 새로고침 후 유지를 확인한다', async ({ page }) => {
  const user = { ...createSession().user, user_metadata: { nickname: '운동이' } };
  let shouldFail = true;
  let updates = 0;
  await page.route('**/auth/v1/user', async (route) => {
    if (route.request().method() === 'PUT') {
      updates += 1;
      if (shouldFail) {
        await route.fulfill({ status: 500, json: { message: 'Save failed' } });
        return;
      }
      const body = route.request().postDataJSON();
      expect(Object.keys(body.data)).toEqual(['nickname']);
      user.user_metadata.nickname = body.data.nickname;
    }
    await route.fulfill({ json: user });
  });
  await page.goto('/my');
  await page.getByRole('button', { name: '닉네임 변경', exact: true }).click();
  const input = page.getByRole('textbox', { name: '닉네임' });
  const save = page.getByRole('button', { name: '저장', exact: true });
  await expect(input).toHaveValue('회원');
  for (const value of [
    '',
    '가나다라마바사아자차카',
    '운동 이',
    ' 운동이',
    '운동이 ',
    '운동!',
    '💪',
  ]) {
    await input.fill(value);
    await save.click();
    await expect(page.getByRole('alert')).toHaveText(
      '공백 없이 한글·영문·숫자 1~10자로 입력해 주세요.',
    );
  }
  expect(updates).toBe(0);
  await input.fill('가나다라마바사Ab1');
  await save.click();
  await expect(page.getByRole('alert')).toHaveText(
    '닉네임을 저장하지 못했어요. 다시 시도해 주세요.',
  );
  await expect(input).toHaveValue('가나다라마바사Ab1');
  shouldFail = false;
  await save.click();
  await expect(page.getByText('닉네임을 저장했어요.', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('link', { name: '홈', exact: true }).click();
  await expect(page.getByRole('heading', { name: '가나다라마바사Ab1', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '가나다라마바사Ab1', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '마이', exact: true }).click();
  await page.getByRole('button', { name: '닉네임 변경', exact: true }).click();
  await expect(input).toHaveValue('가나다라마바사Ab1');
  await input.fill('가');
  await save.click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '닉네임 변경', exact: true }).click();
  await expect(input).toHaveValue('가');
});

test('홈에서 마이로 이동해 계정을 확인하고 새로고침해도 유지한다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '헬스노트' })).toBeVisible();
  await expect(page.getByRole('button', { name: '로그아웃', exact: true })).toHaveCount(0);
  const links = page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link');
  await expect(links).toHaveText(['홈', '운동', '운동이', '마이']);
  await links.last().click();
  await expect(page).toHaveURL('/my');
  await expect(links.last()).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: '마이페이지' })).toBeVisible();
  await expect(page.getByText('test-user@example.test', { exact: true })).toBeVisible();
  await expect(page.getByText('Google', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '닉네임' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '닉네임 변경', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('test-user@example.test', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/my-mobile.png', fullPage: true });
  await page.getByRole('link', { name: '홈', exact: true }).click();
  await expect(page.getByRole('heading', { name: '헬스노트' })).toBeVisible();
});

test('좁은 화면에서도 긴 이메일이 가로 넘침 없이 표시된다', async ({ page }) => {
  const session = createSession();
  session.user.email = `${'long-email-'.repeat(12)}@example.test`;
  await page.addInitScript(
    ({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
    { key: AUTH_STORAGE_KEY, session },
  );
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/my');
  await expect(page.getByRole('heading', { name: '마이페이지' })).toBeVisible();
  await expect(page.getByText(session.user.email, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('닉네임 취소·Escape는 초안을 버리고 다음 편집은 저장된 이름으로 시작한다', async ({
  page,
}) => {
  await page.goto('/my');
  const open = page.getByRole('button', { name: '닉네임 변경', exact: true });
  const input = page.getByRole('textbox', { name: '닉네임' });
  await open.click();
  await expect(input).toBeFocused();
  await input.fill('취소할이름');
  await page.getByRole('button', { name: '취소', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(open).toBeFocused();
  await open.click();
  await expect(input).toHaveValue('회원');
  await input.fill('임시이름');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await open.click();
  await expect(input).toHaveValue('회원');
  await page.screenshot({ path: 'test-results/nickname-modal-mobile.png', fullPage: true });
});

test('저장 중 중복 제출과 팝업 닫기를 막고 성공 후 닫는다', async ({ page }) => {
  let finishSave: () => void = () => {};
  const pendingSave = new Promise<void>((resolve) => {
    finishSave = resolve;
  });
  await page.route('**/auth/v1/user', async (route) => {
    if (route.request().method() === 'PUT') await pendingSave;
    await route.fulfill({
      json: { ...createSession().user, user_metadata: { nickname: '새운동이' } },
    });
  });
  await page.goto('/my');
  await page.getByRole('button', { name: '닉네임 변경', exact: true }).click();
  await page.getByRole('textbox', { name: '닉네임' }).fill('새운동이');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장 중…' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '취소', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  finishSave();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('직접 저장한 운동이 닉네임은 기본값 변경 후에도 유지한다', async ({ page }) => {
  const session = createSession();
  session.user.user_metadata = { nickname: '운동이' };
  await page.addInitScript(
    ({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
    { key: AUTH_STORAGE_KEY, session },
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '운동이', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '마이', exact: true }).click();
  await page.getByRole('button', { name: '닉네임 변경', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '닉네임' })).toHaveValue('운동이');
});
