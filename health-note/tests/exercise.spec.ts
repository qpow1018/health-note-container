import { expect, test } from './authFixture';

const STORAGE_KEY = 'health-note.exercises.v1:test-user';
const EXISTING = [{ id: 'existing', name: '걷기', amount: '30분', sets: null }];

test('빈 목록에서 등록하고 새로고침해도 기존 운동과 함께 유지된다', async ({ page }) => {
  await page.goto('/exercise?tab=exercises');
  await expect(page.getByText('아직 등록한 운동이 없어요.')).toBeVisible();
  await page.getByRole('link', { name: '운동 추가' }).click();
  await page.getByLabel('운동 이름').fill('  푸시업  ');
  await page.getByLabel('운동량').fill('  10회  ');
  await page.getByLabel('세트').fill('3');
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page).toHaveURL('/exercise?tab=exercises');
  await expect(page.getByRole('listitem')).toHaveText(['푸시업10회 × 3세트']);
  await page.getByRole('link', { name: '운동 추가' }).click();
  await page.getByLabel('운동 이름').fill('걷기');
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page).toHaveURL('/exercise?tab=exercises');
  await page.reload();
  await expect(page.getByRole('listitem')).toHaveText(['푸시업10회 × 3세트', '걷기-']);
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
  expect(stored).toMatchObject([
    { name: '푸시업', amount: '10회', sets: 3 },
    { name: '걷기', amount: '', sets: null },
  ]);
  expect(new Set(stored.map((item: { id: string }) => item.id)).size).toBe(2);
});

test('빈 이름과 공백 이름은 저장되지 않는다', async ({ page }) => {
  await page.goto('/exercise/new');
  await page.getByRole('button', { name: '저장' }).click();
  expect(
    await page
      .getByLabel('운동 이름')
      .evaluate((input: HTMLInputElement) => input.validity.valueMissing),
  ).toBe(true);
  await page.getByLabel('운동 이름').fill('   ');
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page.getByRole('alert')).toHaveText('운동 이름을 입력해 주세요.');
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  await expect(page.getByLabel('운동 이름')).toHaveAttribute(
    'aria-describedby',
    'exercise-name-error',
  );
  await page.getByLabel('운동 이름').fill('걷기');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByLabel('운동 이름')).toHaveAttribute('aria-invalid', 'false');
});

for (const sets of ['0', '-1', '1.5', '2147483648', '9007199254740992']) {
  test(`잘못된 세트 ${sets}는 저장되지 않는다`, async ({ page }) => {
    await page.goto('/exercise/new');
    await page.getByLabel('운동 이름').fill('스쿼트');
    await page.getByLabel('세트').fill(sets);
    if (sets === '9007199254740992') {
      await page.locator('form').evaluate((form: HTMLFormElement) => {
        form.noValidate = true;
      });
    }
    await page.getByRole('button', { name: '저장' }).click();
    await expect(page).toHaveURL('/exercise/new');
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
    if (sets === '9007199254740992') {
      await expect(page.getByRole('alert')).toContainText('1 이상 2147483647 이하의 정수');
      await expect(page.getByLabel('세트', { exact: false })).toHaveAttribute(
        'aria-describedby',
        'exercise-sets-error',
      );
      await page.getByLabel('세트').fill('3');
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(page.getByLabel('세트')).toHaveAttribute('aria-invalid', 'false');
    } else {
      expect(
        await page.getByLabel('세트').evaluate((input: HTMLInputElement) => input.validity.valid),
      ).toBe(false);
    }
  });
}

test('헤더 뒤로가기는 입력을 저장하지 않는다', async ({ page }) => {
  await page.goto('/exercise?tab=exercises');
  await page.getByRole('link', { name: '운동 추가' }).click();
  await page.getByLabel('운동 이름').fill('저장하지 않을 운동');
  await expect(page.getByRole('link', { name: '취소', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '뒤로가기', exact: true }).click();
  await expect(page.getByText('아직 등록한 운동이 없어요.')).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

test('저장 공간 오류는 입력과 기존 데이터를 보존하고 재시도할 수 있다', async ({ page }) => {
  await page.goto('/exercise/new');
  await page.evaluate(
    ({ key, existing }) => {
      localStorage.setItem(key, JSON.stringify(existing));
      Storage.prototype.setItem = function () {
        throw new DOMException('Full', 'QuotaExceededError');
      };
    },
    { key: STORAGE_KEY, existing: EXISTING },
  );
  await page.getByLabel('운동 이름').fill('스쿼트');
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page.getByRole('alert')).toContainText('저장하지 못했어요.');
  await expect(page.locator('form').getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '토스트 닫기' })).toBeVisible();
  await page.getByRole('button', { name: '토스트 닫기' }).click();
  await expect(page.getByLabel('운동 이름')).toHaveValue('스쿼트');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)).toEqual(
    EXISTING,
  );
  // 새 문서의 기본 Storage 메서드를 복원해 같은 입력으로 재시도한다.
  await page.evaluate(() => {
    const frame = document.createElement('iframe');
    document.body.append(frame);
    Storage.prototype.setItem = (
      frame.contentWindow as Window & typeof globalThis
    ).Storage.prototype.setItem;
    frame.remove();
  });
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page.getByRole('listitem')).toHaveText(['걷기30분', '스쿼트-']);
});

for (const raw of ['{broken', '{}', '[{"id":"x","name":"걷기","amount":"30분","sets":0}]']) {
  test(`손상 데이터 ${raw}는 오류를 표시하고 덮어쓰지 않는다`, async ({ page }) => {
    await page.goto('/exercise?tab=exercises');
    await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), {
      key: STORAGE_KEY,
      raw,
    });
    await page.reload();
    await expect(page.getByRole('alert')).toContainText('운동 목록을 불러오지 못했어요.');
    await expect(page.getByText('아직 등록한 운동이 없어요.')).toHaveCount(0);
    await page.getByRole('link', { name: '운동 추가' }).click();
    await page.getByLabel('운동 이름').fill('푸시업');
    await page.getByRole('button', { name: '저장' }).click();
    await expect(page.getByRole('alert')).toContainText('저장하지 못했어요.');
    await expect(page.locator('form').getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '토스트 닫기' })).toBeVisible();
    await page.getByRole('button', { name: '토스트 닫기' }).click();
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(raw);
  });
}

test('운동 저장소 읽기 차단 시 목록 오류를 표시한다', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      if (key.startsWith('health-note.')) throw new DOMException('Blocked', 'SecurityError');
      return original.call(this, key);
    };
  });
  await page.goto('/exercise?tab=exercises');
  await expect(page.getByRole('alert')).toContainText('운동 목록을 불러오지 못했어요.');
});

test('좁은 화면과 긴 운동 이름에서 가로 넘침이 없다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/exercise/new');
  await page.getByLabel('운동 이름').fill('아주긴운동이름'.repeat(30));
  await page.getByLabel('운동량').fill('30분'.repeat(30));
  await page.screenshot({ path: 'test-results/exercise-form-mobile.png' });
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page.getByRole('listitem')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: 'test-results/exercise-list-mobile.png' });
});

test('여러 유튜브 링크와 메모를 저장하고 기존 기록을 유지한다', async ({ page }) => {
  await page.goto('/exercise/new');
  await page.evaluate(({ key, existing }) => localStorage.setItem(key, JSON.stringify(existing)), {
    key: STORAGE_KEY,
    existing: EXISTING,
  });
  await page.getByLabel('운동 이름', { exact: false }).fill('브릿지');
  await page.getByLabel('유튜브 링크 1', { exact: true }).fill(' https://youtu.be/abcdefghijk ');
  await page.getByRole('button', { name: '링크 추가', exact: true }).click();
  await page
    .getByLabel('유튜브 링크 2', { exact: true })
    .fill('https://www.youtube.com/watch?v=abcdefghijk');
  await page.getByRole('button', { name: '링크 추가', exact: true }).click();
  await page.getByLabel('유튜브 링크 3', { exact: true }).fill('https://example.com/remove');
  await page.getByRole('button', { name: '유튜브 링크 3 삭제', exact: true }).click();
  await page.getByRole('button', { name: '링크 추가', exact: true }).click();
  await page.getByLabel('메모').fill('허리를 과하게 꺾지 않기\n천천히 진행');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/exercise?tab=exercises');
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
  expect(stored[0]).toMatchObject(EXISTING[0]);
  expect(stored[1]).toMatchObject({
    name: '브릿지',
    sets: null,
    youtubeLinks: ['https://youtu.be/abcdefghijk', 'https://www.youtube.com/watch?v=abcdefghijk'],
    memo: '허리를 과하게 꺾지 않기\n천천히 진행',
  });
  await page.reload();
  await expect(page.getByRole('listitem')).toHaveCount(2);
});

test('유튜브 호스트 위장 주소를 거부하고 삭제 후 남은 입력값을 보존한다', async ({ page }) => {
  await page.goto('/exercise/new');
  await page.getByLabel('운동 이름').fill('푸시업');
  await page
    .getByLabel('유튜브 링크 1', { exact: true })
    .fill('https://youtube.com.evil.example/watch?v=abcdefghijk');
  await page.getByRole('button', { name: '링크 추가', exact: true }).click();
  await page.getByLabel('유튜브 링크 2', { exact: true }).fill('https://youtu.be/abcdefghijk');
  await page.getByLabel('메모').fill('입력 유지');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('유튜브 링크를 확인');
  await expect(page.getByLabel('메모')).toHaveValue('입력 유지');
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  await page.getByRole('button', { name: '유튜브 링크 1 삭제', exact: true }).click();
  await expect(page.getByLabel('유튜브 링크 1', { exact: true })).toHaveValue(
    'https://youtu.be/abcdefghijk',
  );
  await expect(page.getByRole('button', { name: /유튜브 링크 .* 삭제/ })).toHaveCount(0);
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/exercise?tab=exercises');
});

test('목록에서 상세로 이동하고 링크와 여러 줄 메모를 표시한다', async ({ page }) => {
  const exercise = {
    ...EXISTING[0],
    youtubeLinks: ['https://youtu.be/abcdefghijk', 'https://www.youtube.com/watch?v=abcdefghijk'],
    memo: '첫 줄\n둘째 줄',
  };
  await page.goto('/exercise?tab=exercises');
  await page.evaluate(
    ({ key, exercise }) => localStorage.setItem(key, JSON.stringify([exercise])),
    { key: STORAGE_KEY, exercise },
  );
  await page.reload();
  await page.getByRole('link', { name: /걷기\s*30분/ }).click();
  await expect(page).toHaveURL('/exercise/existing');
  await expect(page.getByRole('heading', { name: '걷기', exact: true })).toBeVisible();
  await expect(page.getByText('첫 줄\n둘째 줄')).toBeVisible();
  await page.setViewportSize({ width: 360, height: 780 });
  await page.screenshot({ path: 'test-results/exercise-detail-mobile.png', fullPage: true });
  await expect(page.getByRole('link', { name: /영상 1/ })).toHaveAttribute(
    'href',
    exercise.youtubeLinks[0],
  );
  await expect(page.getByRole('link', { name: /영상 2/ })).toHaveAttribute('target', '_blank');
  await page.reload();
  await expect(page.getByRole('heading', { name: '걷기', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '뒤로가기' }).click();
  await expect(page).toHaveURL('/exercise?tab=exercises');
});

test('상세에서 기존 데이터의 빈 항목, 없는 운동, 손상 데이터를 구분한다', async ({ page }) => {
  await page.goto('/exercise/existing');
  await page.evaluate(({ key, existing }) => localStorage.setItem(key, JSON.stringify(existing)), {
    key: STORAGE_KEY,
    existing: EXISTING,
  });
  await page.reload();
  await expect(page.locator('dd').filter({ hasText: '-' })).toHaveCount(1);
  await expect(
    page
      .getByRole('heading', { name: '유튜브 링크', exact: true })
      .locator('..')
      .getByText('-', { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('heading', { name: '메모', exact: true })
      .locator('..')
      .getByText('-', { exact: true }),
  ).toBeVisible();
  await page.goto('/exercise/missing');
  await expect(page.getByRole('heading', { name: '운동 상세', exact: true })).toBeVisible();
  await expect(page.getByText('운동을 찾을 수 없어요.', { exact: true })).toBeVisible();
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), STORAGE_KEY);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('운동을 불러오지 못했어요.');
});

const EDIT_TARGET = {
  id: 'edit-target',
  name: '푸시업',
  amount: '10회',
  sets: 3,
  youtubeLinks: ['https://youtu.be/abcdefghijk', 'https://www.youtube.com/watch?v=abcdefghijk'],
  memo: '첫 줄\n둘째 줄',
};

async function seedEditExercises(page: import('@playwright/test').Page) {
  await page.goto('/exercise?tab=exercises');
  await page.evaluate(
    ({ key, exercises }) => localStorage.setItem(key, JSON.stringify(exercises)),
    {
      key: STORAGE_KEY,
      exercises: [EXISTING[0], EDIT_TARGET],
    },
  );
  await page.goto('/exercise/edit-target');
}

test('상세에서 수정하고 모든 필드와 ID 및 다른 운동을 유지한다', async ({ page }) => {
  await seedEditExercises(page);
  await page.getByRole('button', { name: '더보기', exact: true }).click();
  await page.getByRole('link', { name: '수정', exact: true }).click();
  await expect(page).toHaveURL('/exercise/edit-target/edit');
  await expect(page.getByLabel('운동 이름')).toHaveValue('푸시업');
  await expect(page.getByLabel('운동량')).toHaveValue('10회');
  await expect(page.getByLabel('세트')).toHaveValue('3');
  await expect(page.getByLabel('메모')).toHaveValue('첫 줄\n둘째 줄');
  await expect(page.getByLabel('유튜브 링크 2', { exact: true })).toHaveValue(
    EDIT_TARGET.youtubeLinks[1],
  );
  await page.getByLabel('운동 이름').fill('수정한 푸시업');
  await page.getByLabel('운동량').fill('8회');
  await page.getByLabel('세트').fill('2');
  await page.getByRole('button', { name: '유튜브 링크 1 삭제', exact: true }).click();
  await page.getByLabel('메모').fill('수정한 메모\n줄바꿈 유지');
  await page.screenshot({ path: 'test-results/exercise-edit-mobile.png', fullPage: true });
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page).toHaveURL('/exercise/edit-target');
  await expect(page.getByRole('status').filter({ hasText: '운동을 수정했어요.' })).toHaveText(
    '운동을 수정했어요.',
  );
  await expect(page.getByRole('heading', { name: '수정한 푸시업', exact: true })).toBeVisible();
  await page.reload();
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
  expect(stored).toHaveLength(2);
  expect(stored[0]).toMatchObject(EXISTING[0]);
  expect(stored[1]).toEqual({
    ...EDIT_TARGET,
    name: '수정한 푸시업',
    amount: '8회',
    sets: 2,
    youtubeLinks: [EDIT_TARGET.youtubeLinks[1]],
    memo: '수정한 메모\n줄바꿈 유지',
  });
});

test('수정 취소는 기존 데이터를 바꾸지 않는다', async ({ page }) => {
  await seedEditExercises(page);
  const before = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  await page.getByRole('button', { name: '더보기', exact: true }).click();
  await page.getByRole('link', { name: '수정', exact: true }).click();
  await page.getByLabel('운동 이름').fill('취소할 이름');
  await page.getByLabel('메모').fill('취소할 메모');
  await page.getByRole('button', { name: '뒤로가기', exact: true }).click();
  await expect(page).toHaveURL('/exercise/edit-target');
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(before);
});

test('삭제 취소는 유지하고 확인하면 선택한 운동만 삭제한다', async ({ page }) => {
  await seedEditExercises(page);
  const deleteButton = page.getByRole('button', { name: '삭제', exact: true });
  await page.getByRole('button', { name: '더보기', exact: true }).click();
  await deleteButton.click();
  const confirm = page.getByRole('dialog', { name: '운동 삭제' });
  await expect(confirm).toContainText('푸시업');
  await expect(confirm).toContainText('복구할 수 없어요');
  await expect(confirm.getByRole('button', { name: '취소' })).toBeFocused();
  await confirm.getByRole('button', { name: '취소' }).click();
  await expect(confirm).not.toBeVisible();
  await expect(page.getByRole('button', { name: '더보기' })).toBeFocused();
  await expect(page.getByRole('heading', { name: '푸시업', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '더보기', exact: true }).click();
  await deleteButton.click();
  await page.keyboard.press('Escape');
  await expect(confirm).not.toBeVisible();
  await expect(page.getByRole('button', { name: '더보기' })).toBeFocused();
  await page.getByRole('button', { name: '더보기', exact: true }).click();
  await deleteButton.click();
  await confirm.getByRole('button', { name: '삭제', exact: true }).click();
  await expect(page).toHaveURL('/exercise?tab=exercises');
  await expect(page.getByRole('status').filter({ hasText: '운동을 삭제했어요.' })).toHaveText(
    '운동을 삭제했어요.',
  );
  await expect(page.getByRole('listitem')).toHaveCount(1);
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
  expect(stored[0]).toMatchObject(EXISTING[0]);
  await page.goto('/exercise/edit-target');
  await expect(page.getByRole('heading', { name: '운동 상세', exact: true })).toBeVisible();
  await expect(page.getByText('운동을 찾을 수 없어요.', { exact: true })).toBeVisible();
});

test('수정 저장과 삭제 실패는 기존 데이터를 유지한다', async ({ page }) => {
  await seedEditExercises(page);
  await page.getByRole('button', { name: '더보기', exact: true }).click();
  await page.getByRole('link', { name: '수정', exact: true }).click();
  await page.getByLabel('운동 이름').fill('저장 실패 이름');
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('저장하지 못했어요');
  await expect(page.locator('form').getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '토스트 닫기' })).toBeVisible();
  await page.getByRole('button', { name: '토스트 닫기' }).click();
  await expect(page.getByLabel('운동 이름')).toHaveValue('저장 실패 이름');
  await expect(page.getByLabel('메모')).toHaveValue(EDIT_TARGET.memo);
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!)[1], STORAGE_KEY),
  ).toEqual(EDIT_TARGET);
  await page.getByRole('button', { name: '뒤로가기', exact: true }).click();
  await page.getByRole('button', { name: '더보기', exact: true }).click();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page
    .getByRole('dialog', { name: '운동 삭제' })
    .getByRole('button', { name: '삭제', exact: true })
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('alert')).toContainText('삭제하지 못했어요');
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: '토스트 닫기' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page).toHaveURL('/exercise/edit-target');
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!)[1], STORAGE_KEY),
  ).toEqual(EDIT_TARGET);
});

test('수정 진입 시 없는 운동과 손상 데이터에 폼을 제공하지 않는다', async ({ page }) => {
  await page.goto('/exercise/missing/edit');
  await expect(page.getByText('운동을 찾을 수 없어요.')).toBeVisible();
  await expect(page.getByRole('button', { name: '저장', exact: true })).toHaveCount(0);
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), STORAGE_KEY);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('운동을 불러오지 못했어요');
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe('{broken');
});

test('수정 중 대상이 삭제되면 다시 생성하지 않는다', async ({ page }) => {
  await seedEditExercises(page);
  await page.getByRole('button', { name: '더보기', exact: true }).click();
  await page.getByRole('link', { name: '수정', exact: true }).click();
  await page.getByLabel('운동 이름').fill('다시 만들지 않을 운동');
  await page.evaluate(({ key, existing }) => localStorage.setItem(key, JSON.stringify(existing)), {
    key: STORAGE_KEY,
    existing: EXISTING,
  });
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('저장하지 못했어요');
  await expect(page.locator('form').getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '토스트 닫기' })).toBeVisible();
  await page.getByRole('button', { name: '토스트 닫기' }).click();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)).toEqual(
    EXISTING,
  );
});

test('헤더는 목록에서 뒤로 버튼을 숨기고 등록에서 이전 화면으로 돌아간다', async ({ page }) => {
  await page.goto('/exercise?tab=exercises');
  await expect(page.getByRole('button', { name: '뒤로가기', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: '운동 추가', exact: true }).click();
  await expect(page.getByRole('heading', { name: '운동 등록', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '뒤로가기', exact: true }).click();
  await expect(page).toHaveURL('/exercise?tab=exercises');
});

test('수정 주소 직접 접속 시 헤더 뒤로가기는 상세로 대체 이동한다', async ({ page }) => {
  await seedEditExercises(page);
  await page.goto('/exercise/edit-target/edit');
  await page.getByRole('button', { name: '뒤로가기', exact: true }).click();
  await expect(page).toHaveURL('/exercise/edit-target');
  await expect(page.getByRole('heading', { name: '푸시업', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/exercise-header-mobile.png', fullPage: true });
});

test('상세 직접 접속에서 긴 제목이 헤더를 가로로 넘치지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/exercise/edit-target');
  await page.evaluate(
    ({ key, exercise }) => localStorage.setItem(key, JSON.stringify([exercise])),
    {
      key: STORAGE_KEY,
      exercise: { ...EDIT_TARGET, name: '매우긴운동이름'.repeat(30) },
    },
  );
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByRole('button', { name: '뒤로가기', exact: true }).click();
  await expect(page).toHaveURL('/exercise?tab=exercises');
});

test('등록 성공 토스트는 이동 후 표시되고 최대 3개이며 자동으로 닫힌다', async ({ page }) => {
  await page.clock.install();
  await page.goto('/exercise?tab=exercises');
  await expect(page.getByRole('link', { name: '운동 추가', exact: true })).toBeVisible();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  for (let index = 0; index < 4; index++) {
    await page.getByRole('link', { name: '운동 추가', exact: true }).click();
    await page.getByLabel('운동 이름').fill(`토스트 확인 ${index + 1}`);
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await expect
      .poll(async () => {
        await page.clock.runFor(10);
        return page.getByRole('link', { name: '운동 추가', exact: true }).count();
      })
      .toBe(1);
    await expect(page).toHaveURL('/exercise?tab=exercises');
  }
  await expect(page.getByRole('status')).toHaveCount(3);
  await expect(
    page.getByRole('status').filter({ hasText: '운동을 등록했어요.' }).first(),
  ).toHaveText('운동을 등록했어요.');
  await page.screenshot({ path: 'test-results/exercise-toast-mobile.png', fullPage: true });
  await page.clock.runFor(3000);
  await expect(page.getByRole('status')).toHaveCount(0);
});
