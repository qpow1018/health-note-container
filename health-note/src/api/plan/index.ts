import { getSupabase } from '@/lib/supabase';
import type { TPlan, TPlanRow, TPlanValues } from './type';

export async function getActivePlan(signal?: AbortSignal): Promise<TPlan | null> {
  let query = getSupabase()
    .from('plans')
    .select(
      'id,start_date,time_zone,duration,status,target_xp,exercise_day_count,plan_weekdays(weekday,routine_id,routines(name))',
    )
    .eq('status', 'active')
    .retry(false);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle<TPlanRow>();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    startDate: data.start_date,
    timeZone: data.time_zone,
    duration: data.duration,
    status: data.status,
    targetXp: data.target_xp,
    exerciseDayCount: data.exercise_day_count,
    assignments: data.plan_weekdays.map((day) => ({
      weekday: day.weekday,
      routineId: day.routine_id,
      routineName: day.routines?.name ?? null,
    })),
  };
}

export async function createPlan(
  id: string,
  values: TPlanValues,
): Promise<'created' | 'already-active'> {
  const { data, error } = await getSupabase().rpc('create_plan', {
    plan_id: id,
    plan_start_date: values.startDate,
    plan_time_zone: values.timeZone,
    plan_duration: values.duration,
    scheduled_weekdays: values.assignments.map((day) => day.weekday),
    routine_ids: values.assignments.map((day) => day.routineId),
  });
  if (error) throw error;
  return data ? 'created' : 'already-active';
}
