import type { Page } from '@playwright/test';

// Controlled API state for browser tests. Product code never reads these keys.
export async function mockExerciseApi(page: Page) {
  await page.route('http://127.0.0.1:55321/rest/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const authorization = request.headers().authorization ?? '';
    const encodedPayload = authorization.split('.')[1];
    const owner = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString()).sub;
    const body = request.postDataJSON();
    const input = {
      key: `health-note.exercises.v1:${owner}`,
      method: request.method(),
      isReorder: url.pathname.endsWith('/rpc/reorder_exercises'),
      id: url.searchParams.get('id')?.replace(/^eq\./, ''),
      expectedVersion: url.searchParams.get('version')?.replace(/^eq\./, ''),
      body,
    };
    try {
      const result = await page.evaluate((input) => {
        type TItem = {
          id: string;
          name: string;
          amount: string;
          sets: number | null;
          youtubeLinks?: string[];
          memo?: string;
        };
        function version(item: TItem) {
          const value = JSON.stringify([
            item.name,
            item.amount,
            item.sets,
            item.youtubeLinks ?? [],
            item.memo ?? '',
          ]);
          let hash = 0;
          for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0;
          return ((hash >>> 0) % 2147483646) + 1;
        }
        function row(item: TItem) {
          return {
            id: item.id,
            name: item.name,
            amount: item.amount,
            sets: item.sets,
            youtube_links: item.youtubeLinks ?? [],
            memo: item.memo ?? '',
            version: version(item),
          };
        }
        const raw = localStorage.getItem(input.key);
        let items: TItem[] = raw === null ? [] : JSON.parse(raw);
        if (
          !Array.isArray(items) ||
          items.some(
            (item) =>
              !item ||
              typeof item.name !== 'string' ||
              typeof item.amount !== 'string' ||
              (item.sets !== null && (!Number.isInteger(item.sets) || item.sets < 1)),
          )
        )
          throw new Error('Invalid API fixture');
        if (input.isReorder) {
          const ids = items.map((item) => item.id);
          if (JSON.stringify(ids) !== JSON.stringify(input.body.expected_ids))
            return { data: false };
          const ordered: string[] = input.body.ordered_ids;
          if (
            ordered.length !== ids.length ||
            new Set(ordered).size !== ids.length ||
            ordered.some((id) => !ids.includes(id))
          )
            throw new Error('Invalid order');
          items = ordered.map((id) => items.find((item) => item.id === id)!);
          localStorage.setItem(input.key, JSON.stringify(items));
          return { data: true };
        }
        if (input.method === 'GET')
          return { data: items.filter((item) => !input.id || item.id === input.id).map(row) };
        const values = {
          name: input.body?.name,
          amount: input.body?.amount,
          sets: input.body?.sets,
          youtubeLinks: input.body?.youtube_links,
          memo: input.body?.memo,
        };
        let changed: TItem[] = [];
        if (input.method === 'POST') {
          const item = { ...values, id: crypto.randomUUID() };
          items.push(item);
          changed = [item];
        } else {
          items = items.flatMap((item) => {
            if (
              item.id !== input.id ||
              (input.expectedVersion && version(item) !== Number(input.expectedVersion))
            )
              return [item];
            const next = input.method === 'PATCH' ? { ...item, ...values } : item;
            changed.push(next);
            return input.method === 'DELETE' ? [] : [next];
          });
        }
        if (input.method === 'DELETE' && changed.length) {
          const owner = input.key.slice('health-note.exercises.v1:'.length);
          const routines = JSON.parse(
            localStorage.getItem(`health-note.routines.v1:${owner}`) ?? '[]',
          );
          if (
            routines.some((routine: { exerciseIds: string[] }) =>
              changed.some((item) => routine.exerciseIds.includes(item.id)),
            )
          )
            return { data: [], isInUse: true };
        }
        localStorage.setItem(input.key, JSON.stringify(items));
        return { data: changed.map(row) };
      }, input);
      if ('isInUse' in result && result.isInUse) {
        await route.fulfill({
          status: 409,
          json: { code: '23503', message: 'Exercise is in use' },
        });
        return;
      }
      if (Array.isArray(result.data) && request.headers().accept?.includes('vnd.pgrst.object')) {
        if (result.data.length !== 1) {
          await route.fulfill({
            status: 406,
            json: { code: 'PGRST116', details: 'The result contains 0 rows', message: 'No rows' },
          });
        } else await route.fulfill({ json: result.data[0] });
      } else await route.fulfill({ json: result.data });
    } catch {
      await route.fulfill({
        status: 500,
        json: { code: 'TEST_API_FAILURE', message: 'Controlled API failure' },
      });
    }
  });
}
