const TOTAL_GROWTH_XP = 9_000;

export function getPlanSchedule(startDate: string, duration: number, weekdays: number[]) {
  const start = new Date(`${startDate}T00:00:00Z`);
  let exerciseDays = 0;
  const date = new Date(start);
  for (let index = 0; index < duration; index++) {
    date.setTime(start.getTime());
    date.setUTCDate(start.getUTCDate() + index);
    if (weekdays.includes(date.getUTCDay())) exerciseDays++;
  }
  return {
    endDate: date.toISOString().slice(0, 10),
    exerciseDays,
    targetXp: TOTAL_GROWTH_XP,
    dailyXp: exerciseDays > 0 ? TOTAL_GROWTH_XP / exerciseDays : null,
  };
}
