export type TRoutineSchedule =
  | { type: 'weekdays'; days: number[] }
  | { type: 'interval'; startDate: string; intervalDays: number; postponedDates?: string[] };

export type TRoutineValues = {
  name: string;
  exerciseIds: string[];
  schedule: TRoutineSchedule;
  memo: string;
};

export type TRoutine = TRoutineValues & { id: string; isActive: boolean; version: number };

export type TRoutineRow = {
  id: string;
  name: string;
  schedule: TRoutineSchedule;
  memo: string;
  is_active: boolean;
  version: number;
  routine_exercises: { exercise_id: string; position: number }[];
};

export type TRoutineProgress = { routineId: string; exerciseId: string };
export type TProgressRow = { routine_id: string; exercise_id: string };
