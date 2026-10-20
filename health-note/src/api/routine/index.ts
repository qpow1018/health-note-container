import { getCurrentUserId } from '@/lib/auth/currentUser';
import { getSupabase } from '@/lib/supabase';
import type { TRoutine, TRoutineValues, TRoutineRow } from './type';

export async function getRoutines(signal?: AbortSignal): Promise<TRoutine[]> {
  let query = getSupabase()
    .from('routines')
    .select('id,name,memo,version,routine_exercises(exercise_id,position)')
    .order('position')
    .order('id')
    .retry(false);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.returns<TRoutineRow[]>();
  if (error) throw error;
  return data.map(({ routine_exercises, ...routine }) => ({
    ...routine,
    exerciseIds: [...routine_exercises]
      .sort((a, b) => a.position - b.position)
      .map((item) => item.exercise_id),
  }));
}

async function saveRoutine(id: string, values: TRoutineValues, expectedVersion: number | null) {
  const { data, error } = await getSupabase().rpc('save_routine_bundle', {
    routine_id: id,
    owner_id: getCurrentUserId(),
    routine_name: values.name,
    routine_memo: values.memo,
    exercise_ids: values.exerciseIds,
    expected_version: expectedVersion,
  });
  if (error) throw error;
  if (!data) return 'conflict';
  return 'updated';
}

export async function createRoutine(values: TRoutineValues): Promise<void> {
  await saveRoutine(crypto.randomUUID(), values, null);
}

export async function updateRoutine(
  id: string,
  values: TRoutineValues,
  expectedVersion: number,
): Promise<'updated' | 'conflict'> {
  const result = await saveRoutine(id, values, expectedVersion);
  if (result === 'conflict' && !(await getRoutines()).some((item) => item.id === id))
    throw new Error('Routine not found');
  return result;
}

export async function deleteRoutine(id: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from('routines')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Routine not found');
}

export async function reorderRoutines(
  orderedIds: string[],
  expectedIds: string[],
): Promise<'updated' | 'conflict'> {
  const { data, error } = await getSupabase().rpc('reorder_routines', {
    ordered_ids: orderedIds,
    expected_ids: expectedIds,
  });
  if (error) throw error;
  if (!data) return 'conflict';
  return 'updated';
}
