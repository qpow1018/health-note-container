import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { mockExerciseApi } from './exerciseApiFixture';
import { mockRoutineApi } from './routineApiFixture';
import { mockProgressApi } from './progressApiFixture';

export const AUTH_STORAGE_KEY = 'sb-127-auth-token';
export const TEST_USER_ID = 'test-user';

export function createSession(userId = TEST_USER_ID) {
  const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: expiresAt })).toString(
    'base64url',
  );
  return {
    access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.test-signature`,
    refresh_token: 'test-refresh-token',
    token_type: 'bearer',
    expires_in: 365 * 24 * 60 * 60,
    expires_at: expiresAt,
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: `${userId}@example.test`,
      app_metadata: { provider: 'google', providers: ['google'] },
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    },
  };
}

export async function mockAuth(page: Page) {
  await mockExerciseApi(page);
  await mockRoutineApi(page);
  await mockProgressApi(page);
  await page.route('http://127.0.0.1:55321/auth/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/settings')) {
      await route.fulfill({ json: { external: { google: true } } });
    } else if (url.pathname.endsWith('/logout')) {
      await route.fulfill({ status: 204 });
    } else if (url.pathname.endsWith('/user')) {
      await route.fulfill({ json: createSession().user });
    } else if (url.pathname.endsWith('/token')) {
      await route.fulfill({ json: createSession() });
    } else {
      await route.fulfill({ status: 400, json: { message: 'Unexpected auth request' } });
    }
  });
}

export async function seedSession(page: Page, userId = TEST_USER_ID) {
  await page.addInitScript(
    ({ key, session }) => {
      if (sessionStorage.getItem('test-auth-initialized')) return;
      localStorage.setItem(key, JSON.stringify(session));
      sessionStorage.setItem('test-auth-initialized', 'true');
    },
    { key: AUTH_STORAGE_KEY, session: createSession(userId) },
  );
}

export const test = base.extend({
  page: async ({ page }, runTest) => {
    await mockAuth(page);
    await seedSession(page);
    await runTest(page);
  },
});

export { expect };
