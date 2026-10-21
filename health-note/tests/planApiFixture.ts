import type { Page } from '@playwright/test';

// Test-only server state; product code never reads these storage keys.
export async function mockPlanApi(page: Page) {
  await page.route('http://127.0.0.1:55321/rest/v1/**', async (route) => {
    const request = route.request();
    const resource = new URL(request.url()).pathname.split('/').at(-1);
    if (resource !== 'plans' && resource !== 'create_plan') return route.fallback();
    const owner = JSON.parse(
      Buffer.from((request.headers().authorization ?? '').split('.')[1], 'base64url').toString(),
    ).sub;
    const result = await page.evaluate(
      ({ owner, resource, body }) => {
        type TRoutine = { id: string; name: string; exerciseIds: string[] };
        type TPlan = {
          id: string;
          start_date: string;
          time_zone: string;
          duration: number;
          status: string;
          target_xp: number;
          exercise_day_count: number;
          assignments: { weekday: number; routine_id: string }[];
        };
        const key = `health-note.plans.v1:${owner}`;
        const plans: TPlan[] = JSON.parse(localStorage.getItem(key) ?? '[]');
        const routines: TRoutine[] = JSON.parse(
          localStorage.getItem(`health-note.routines.v1:${owner}`) ?? '[]',
        );
        const active = plans.find((plan) => plan.status === 'active');
        if (resource === 'plans') {
          return {
            status: 200,
            data: plans
              .filter((plan) => plan.status === 'active')
              .map(({ assignments, ...plan }) => ({
                ...plan,
                plan_weekdays: assignments.map((day) => ({
                  ...day,
                  routines: routines.find((routine) => routine.id === day.routine_id) ?? null,
                })),
              })),
          };
        }
        if (active) return { status: 200, data: active.id === body.plan_id ? active.id : null };
        const days: number[] = body.scheduled_weekdays;
        const ids: string[] = body.routine_ids;
        if (
          ![14, 30, 100].includes(body.plan_duration) ||
          !Array.isArray(days) ||
          days.length < 1 ||
          days.length > 7 ||
          new Set(days).size !== days.length ||
          days.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
          !Array.isArray(ids) ||
          ids.length !== days.length
        ) {
          return { status: 400, data: { code: '23514', message: 'Invalid plan settings' } };
        }
        if (
          ids.some(
            (id) =>
              !routines.some((routine) => routine.id === id && routine.exerciseIds.length > 0),
          )
        ) {
          return { status: 409, data: { code: '23503', message: 'Routine unavailable' } };
        }
        let exerciseDays = 0;
        for (let i = 0; i < body.plan_duration; i++) {
          const date = new Date(body.plan_start_date + 'T00:00:00Z');
          date.setUTCDate(date.getUTCDate() + i);
          if (days.includes(date.getUTCDay())) exerciseDays++;
        }
        plans.push({
          id: body.plan_id,
          start_date: body.plan_start_date,
          time_zone: body.plan_time_zone,
          duration: body.plan_duration,
          status: 'active',
          target_xp: 9000,
          exercise_day_count: exerciseDays,
          assignments: days.map((weekday, i) => ({ weekday, routine_id: ids[i] })),
        });
        localStorage.setItem(key, JSON.stringify(plans));
        return { status: 200, data: body.plan_id };
      },
      { owner, resource, body: request.postDataJSON() },
    );
    const data = result.data;
    if (resource === 'plans' && request.headers().accept?.includes('vnd.pgrst.object')) {
      const rows = data as unknown[];
      if (rows.length === 0)
        await route.fulfill({
          status: 406,
          json: { code: 'PGRST116', details: 'The result contains 0 rows', message: 'No rows' },
        });
      else await route.fulfill({ json: rows[0] });
    } else await route.fulfill({ status: result.status, json: data });
  });
}
