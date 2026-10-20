import { queryClient } from '@/lib/query/queryClient';
import { invalidateRoutines } from '@/queries/routineQuery';
import { getRoutines, updateRoutineSchedule } from '@/api/routine';
import { getNextRoutineDate, getTodayDate } from '@/features/exercise/utils/routineSchedule';

export async function postponeRoutine(id: string, expectedDate: string): Promise<void> {
  const routine = (await getRoutines()).find((item) => item.id === id);
  if (!routine || routine.schedule.type !== 'interval')
    throw new Error('Interval routine required');
  const nextDate = getNextRoutineDate(routine.schedule, getTodayDate());
  if (nextDate === null || nextDate !== expectedDate || nextDate >= '9999-12-31')
    throw new Error('Schedule changed or date out of range');
  const schedule = {
    ...routine.schedule,
    postponedDates: [...(routine.schedule.postponedDates ?? []), nextDate],
  };
  await updateRoutineSchedule(id, schedule, routine.version);
  await invalidateRoutines(queryClient);
}
