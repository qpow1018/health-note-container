export type TPlanValues = {
  startDate: string;
  timeZone: string;
  duration: number;
  assignments: { weekday: number; routineId: string }[];
};

export type TPlan = {
  id: string;
  startDate: string;
  timeZone: string;
  duration: number;
  status: 'active' | 'completed' | 'stopped';
  targetXp: number;
  exerciseDayCount: number;
  assignments: { weekday: number; routineId: string | null; routineName: string | null }[];
};

export type TPlanRow = {
  id: string;
  start_date: string;
  time_zone: string;
  duration: number;
  status: TPlan['status'];
  target_xp: number;
  exercise_day_count: number;
  plan_weekdays: {
    weekday: number;
    routine_id: string | null;
    routines: { name: string } | null;
  }[];
};
