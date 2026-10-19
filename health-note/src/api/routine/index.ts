import { isDateString } from '@/utils/date';
import { getCurrentUserId } from '@/lib/auth/currentUser';
import { getSupabase } from '@/lib/supabase';
import type {
  TRoutine,
  TRoutineValues,
  TRoutineSchedule,
  TRoutineRow,
  TRoutineProgress,
  TProgressRow,
} from './type';

export async function getRoutines(signal?: AbortSignal): Promise<TRoutine[]> {
  let query = getSupabase()
    .from('routines')
    .select('id,name,schedule,memo,is_active,version,routine_exercises(exercise_id,position)')
    .order('position')
    .order('id')
    .retry(false);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.returns<TRoutineRow[]>();
  if (error) throw error;
  return data.map(({ is_active, routine_exercises, ...routine }) => ({
    ...routine,
    isActive: is_active,
    exerciseIds: [...routine_exercises]
      .sort((a, b) => a.position - b.position)
      .map((item) => item.exercise_id),
  }));
}

async function saveRoutine(id: string, values: TRoutineValues, expectedVersion: number | null) {
  const { data, error } = await getSupabase().rpc('save_routine', {
    routine_id: id,
    owner_id: getCurrentUserId(),
    routine_name: values.name,
    routine_schedule: values.schedule,
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
  expectedRoutine: TRoutine,
): Promise<'updated' | 'conflict'> {
  const result = await saveRoutine(id, values, expectedRoutine.version);
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

export async function updateRoutineSchedule(
  id: string,
  schedule: TRoutineSchedule,
  expectedVersion: number,
): Promise<void> {
  const { data, error } = await getSupabase()
    .from('routines')
    .update({ schedule })
    .eq('id', id)
    .eq('version', expectedVersion)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Schedule changed');
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

export async function setRoutineActive(
  id: string,
  isActive: boolean,
  expectedIsActive: boolean,
): Promise<'updated' | 'conflict'> {
  const { data, error } = await getSupabase()
    .from('routines')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('is_active', expectedIsActive)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    if (!(await getRoutines()).some((item) => item.id === id)) throw new Error('Routine not found');
    return 'conflict';
  }
  return 'updated';
}

export async function getRoutineProgress(
  date: string,
  signal?: AbortSignal,
): Promise<TRoutineProgress[]> {
  if (!isDateString(date)) throw new Error('Invalid date');
  let query = getSupabase()
    .from('routine_progress')
    .select('routine_id,exercise_id')
    .eq('date', date)
    .retry(false);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.returns<TProgressRow[]>();
  if (error) throw error;
  return data.map((row) => ({ routineId: row.routine_id, exerciseId: row.exercise_id }));
}

export async function setExerciseCompleted(
  routineId: string,
  date: string,
  exerciseId: string,
  isCompleted: boolean,
): Promise<void> {
  if (!isDateString(date)) throw new Error('Invalid date');
  const userId = getCurrentUserId();
  const table = getSupabase().from('routine_progress');
  const { error } = isCompleted
    ? await table.upsert(
        { user_id: userId, routine_id: routineId, date, exercise_id: exerciseId },
        { onConflict: 'user_id,routine_id,date,exercise_id', ignoreDuplicates: true },
      )
    : await table
        .delete()
        .eq('user_id', userId)
        .eq('routine_id', routineId)
        .eq('date', date)
        .eq('exercise_id', exerciseId);
  if (error) throw error;
}
