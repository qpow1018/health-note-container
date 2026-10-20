import type { TRoutine, TRoutineValues } from '@/api/routine/type';

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
