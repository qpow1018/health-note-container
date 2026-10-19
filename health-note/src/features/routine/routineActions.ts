import { queryClient } from '@/lib/query/queryClient';
import { invalidateRoutines } from '@/queries/routineQuery';
import { getRoutines, updateRoutineSchedule } from '@/api/routine';
import type { TRoutine, TRoutineValues } from '@/api/routine/type';
import { getNextRoutineDate, getTodayDate } from './routineSchedule';

export function prepareRoutineValues(values: TRoutineValues, expectedRoutine: TRoutine) {
  const previousSchedule = expectedRoutine.schedule;
  let schedule = values.schedule;
  if (schedule.type === 'interval') {
    const isSameSchedule =
      previousSchedule.type === 'interval' &&
      previousSchedule.startDate === schedule.startDate &&
      previousSchedule.intervalDays === schedule.intervalDays;
    schedule = {
      type: 'interval',
      startDate: schedule.startDate,
      intervalDays: schedule.intervalDays,
      postponedDates: isSameSchedule ? previousSchedule.postponedDates : undefined,
    };
  }
  return { ...values, schedule };
}

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
