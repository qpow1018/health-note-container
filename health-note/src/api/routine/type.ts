export type TRoutineValues = {
  name: string;
  exerciseIds: string[];
  memo: string;
};

export type TRoutine = TRoutineValues & { id: string; version: number };

export type TRoutineRow = {
  id: string;
  name: string;
  memo: string;
  version: number;
  routine_exercises: { exercise_id: string; position: number }[];
};
