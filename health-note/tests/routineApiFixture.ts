import type { Page } from '@playwright/test';

// Simulated server state lives in fixture-only storage, never read by product code.
export async function mockRoutineApi(page: Page) {
  await page.route('http://127.0.0.1:55321/rest/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const resource = url.pathname.split('/').at(-1);
    if (!['routines', 'save_routine_bundle', 'reorder_routines'].includes(resource ?? ''))
      return route.fallback();
    const owner = JSON.parse(
      Buffer.from((request.headers().authorization ?? '').split('.')[1], 'base64url').toString(),
    ).sub;
    const input = {
      key: `health-note.routines.v1:${owner}`,
      exerciseKey: `health-note.exercises.v1:${owner}`,
      resource,
      method: request.method(),
      id: url.searchParams.get('id')?.replace(/^eq\./, ''),
      expectedVersion: url.searchParams.get('version')?.replace(/^eq\./, ''),
      expectedActive: url.searchParams.get('is_active')?.replace(/^eq\./, ''),
      body: request.postDataJSON(),
    };
    try {
      const result = await page.evaluate((input) => {
        type TRoutine = {
          id: string;
          name: string;
          memo: string;
          exerciseIds: string[];
          schedule: {
            type: string;
            days?: number[];
            startDate?: string;
            intervalDays?: number;
            postponedDates?: string[];
          };
          isActive?: boolean;
        };
        function version(item: TRoutine) {
          const value = JSON.stringify([
            item.name,
            item.memo,
            item.exerciseIds,
            item.schedule,
            item.isActive ?? false,
          ]);
          let hash = 0;
          for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0;
          return ((hash >>> 0) % 2147483646) + 1;
        }
        function row(item: TRoutine) {
          return {
            id: item.id,
            name: item.name,
            memo: item.memo,
            schedule: item.schedule,
            is_active: item.isActive ?? false,
            version: version(item),
            routine_exercises: item.exerciseIds.map((id, index) => ({
              exercise_id: id,
              position: index + 1,
            })),
          };
        }
        const raw = localStorage.getItem(input.key);
        let items: TRoutine[] = raw === null ? [] : JSON.parse(raw);
        if (
          !Array.isArray(items) ||
          items.some((item) => {
            if (
              !item ||
              typeof item.name !== 'string' ||
              !item.name.trim() ||
              typeof item.memo !== 'string' ||
              (item.isActive !== undefined && typeof item.isActive !== 'boolean') ||
              !Array.isArray(item.exerciseIds) ||
              !item.exerciseIds.length ||
              new Set(item.exerciseIds).size !== item.exerciseIds.length
            )
              return true;
            return false;
          })
        )
          throw new Error('Invalid API fixture');
        if (input.resource === 'reorder_routines') {
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
        if (input.resource === 'save_routine_bundle') {
          const b = input.body;
          const index = items.findIndex((item) => item.id === b.routine_id);
          if (
            b.expected_version !== null &&
            (index < 0 || version(items[index]) !== b.expected_version)
          )
            return { data: null };
          const exercises: { id: string }[] = JSON.parse(
            localStorage.getItem(input.exerciseKey) ?? '[]',
          );
          if (
            !b.exercise_ids.length ||
            new Set(b.exercise_ids).size !== b.exercise_ids.length ||
            b.exercise_ids.some((id: string) => !exercises.some((item) => item.id === id))
          )
            throw new Error('Invalid exercises');
          const item = {
            id: b.routine_id,
            name: b.routine_name,
            memo: b.routine_memo,
            schedule: index < 0 ? undefined : items[index].schedule,
            exerciseIds: b.exercise_ids,
            isActive: index < 0 ? false : (items[index].isActive ?? false),
          };
          if (index < 0) items.push(item);
          else items[index] = item;
          localStorage.setItem(input.key, JSON.stringify(items));
          return { data: item.id };
        }
        if (input.method === 'GET')
          return { data: items.filter((item) => !input.id || item.id === input.id).map(row) };
        const changed: TRoutine[] = [];
        items = items.flatMap((item) => {
          if (
            item.id !== input.id ||
            (input.expectedVersion && version(item) !== Number(input.expectedVersion)) ||
            (input.expectedActive && (item.isActive ?? false) !== (input.expectedActive === 'true'))
          )
            return [item];
          const next =
            input.method === 'DELETE'
              ? item
              : {
                  ...item,
                  ...(input.body.is_active === undefined ? {} : { isActive: input.body.is_active }),
                  ...(input.body.schedule === undefined ? {} : { schedule: input.body.schedule }),
                };
          changed.push(next);
          return input.method === 'DELETE' ? [] : [next];
        });
        localStorage.setItem(input.key, JSON.stringify(items));
        return { data: changed.map(row) };
      }, input);
      if (Array.isArray(result.data) && request.headers().accept?.includes('vnd.pgrst.object')) {
        if (result.data.length !== 1)
          await route.fulfill({
            status: 406,
            json: { code: 'PGRST116', details: 'The result contains 0 rows', message: 'No rows' },
          });
        else await route.fulfill({ json: result.data[0] });
      } else await route.fulfill({ json: result.data });
    } catch {
      await route.fulfill({
        status: 500,
        json: { code: 'TEST_API_FAILURE', message: 'Controlled API failure' },
      });
    }
  });
}
