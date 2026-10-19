export const MAX_EXERCISE_SETS = 2_147_483_647;

export type TExercise = {
  version: number;
  id: string;
  name: string;
  amount: string;
  sets: number | null;
  youtubeLinks: string[];
  memo: string;
};

export type TExerciseValues = Omit<TExercise, 'id' | 'version'>;

export type TExerciseRow = {
  id: string;
  name: string;
  amount: string;
  sets: number | null;
  youtube_links: string[];
  memo: string;
  version: number;
};
