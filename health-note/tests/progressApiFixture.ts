import type { Page } from '@playwright/test';

// Browser tests control server responses with fixture-only storage.
export async function mockProgressApi(page: Page) {
  await page.route('http://127.0.0.1:55321/rest/v1/routine_progress?**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const owner = JSON.parse(
      Buffer.from((request.headers().authorization ?? '').split('.')[1], 'base64url').toString(),
    ).sub;
    const input = {
      key: `health-note.routine-progress.v1:${owner}`,
      routinesKey: `health-note.routines.v1:${owner}`,
      method: request.method(),
      date: url.searchParams.get('date')?.replace(/^eq\./, ''),
      routineId: url.searchParams.get('routine_id')?.replace(/^eq\./, ''),
      exerciseId: url.searchParams.get('exercise_id')?.replace(/^eq\./, ''),
      body: request.postDataJSON(),
    };
    try {
      const data = await page.evaluate((input) => {
        type TProgress = { routineId: string; date: string; exerciseIds: string[] };
        const raw = localStorage.getItem(input.key);
        const entries: TProgress[] = raw === null ? [] : JSON.parse(raw);
        if (
          !Array.isArray(entries) ||
          entries.some(
            (entry) =>
              !entry ||
              typeof entry.routineId !== 'string' ||
              typeof entry.date !== 'string' ||
              !Array.isArray(entry.exerciseIds),
          )
        )
          throw new Error('Invalid fixture');
        if (input.method === 'GET')
          return entries
            .filter((entry) => entry.date === input.date)
            .flatMap((entry) =>
              entry.exerciseIds.map((id) => ({ routine_id: entry.routineId, exercise_id: id })),
            );
        const routineId = input.body?.routine_id ?? input.routineId;
        const date = input.body?.date ?? input.date;
        const exerciseId = input.body?.exercise_id ?? input.exerciseId;
        let entry = entries.find((entry) => entry.routineId === routineId && entry.date === date);
        if (input.method === 'POST') {
          const routines: { id: string; exerciseIds: string[] }[] = JSON.parse(
            localStorage.getItem(input.routinesKey) ?? '[]',
          );
          if (
            !routines.some(
              (routine) => routine.id === routineId && routine.exerciseIds.includes(exerciseId),
            )
          )
            throw new Error('Exercise not in routine');
          if (!entry) {
            entry = { routineId, date, exerciseIds: [] };
            entries.push(entry);
          }
          if (!entry.exerciseIds.includes(exerciseId)) entry.exerciseIds.push(exerciseId);
        } else if (input.method === 'DELETE' && entry) {
          entry.exerciseIds = entry.exerciseIds.filter((id) => id !== exerciseId);
        }
        localStorage.setItem(input.key, JSON.stringify(entries));
        return [];
      }, input);
      await route.fulfill({ json: data });
    } catch {
      await route.fulfill({ status: 500, json: { message: 'Controlled progress API failure' } });
    }
  });
}
