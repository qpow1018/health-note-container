import type { TRoutineSchedule } from '@/api/routine/type';

export { isDateString as isRoutineDate } from '@/utils/date';

const DAY_MS = 24 * 60 * 60 * 1000;

export function getTodayDate(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export function moveRoutineDate(value: string, offset: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function isRoutineScheduled(schedule: TRoutineSchedule, date: string): boolean {
  const selected = new Date(`${date}T00:00:00Z`);
  if (schedule.type === 'weekdays') return schedule.days.includes(selected.getUTCDay());

  let anchor = schedule.startDate;
  for (const postponedDate of schedule.postponedDates ?? []) {
    if (date < postponedDate) break;
    anchor = moveRoutineDate(postponedDate, 1);
  }
  const start = new Date(`${anchor}T00:00:00Z`);
  const elapsedDays = (selected.getTime() - start.getTime()) / DAY_MS;
  return elapsedDays >= 0 && elapsedDays % schedule.intervalDays === 0;
}

export function getNextRoutineDate(schedule: TRoutineSchedule, fromDate: string): string | null {
  if (schedule.type === 'weekdays') {
    let date = fromDate;
    for (let offset = 0; offset < 7; offset += 1) {
      if (isRoutineScheduled(schedule, date)) return date;
      if (date === '9999-12-31') return null;
      date = moveRoutineDate(date, 1);
    }
    return null;
  }
  let anchor = schedule.startDate;
  for (const postponedDate of schedule.postponedDates ?? []) {
    const next = getNextIntervalDate(anchor, schedule.intervalDays, fromDate);
    if (next === null || next < postponedDate) return next;
    anchor = moveRoutineDate(postponedDate, 1);
  }
  return getNextIntervalDate(anchor, schedule.intervalDays, fromDate);
}

function getNextIntervalDate(
  anchor: string,
  intervalDays: number,
  fromDate: string,
): string | null {
  const start = new Date(`${anchor}T00:00:00Z`).getTime();
  const from = new Date(`${fromDate}T00:00:00Z`).getTime();
  const elapsedDays = Math.max(0, (from - start) / DAY_MS);
  const nextTime = start + Math.ceil(elapsedDays / intervalDays) * intervalDays * DAY_MS;
  if (!Number.isFinite(nextTime) || nextTime > new Date('9999-12-31T00:00:00Z').getTime())
    return null;
  return new Date(nextTime).toISOString().slice(0, 10);
}
