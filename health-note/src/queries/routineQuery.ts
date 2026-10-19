import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import * as api from '@/api/routine';
import type { TRoutine, TRoutineValues } from '@/api/routine/type';
import { getUserKey } from '@/lib/auth/currentUser';

export const ROUTINES_QUERY_KEY = ['routines'] as const;
export const ROUTINE_PROGRESS_QUERY_KEY = ['routine-progress'] as const;

export function invalidateRoutines(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: ROUTINES_QUERY_KEY });
}

const routineQuery = {
  useGetRoutines() {
    return useQuery({
      queryKey: [...ROUTINES_QUERY_KEY, getUserKey('owner')],
      queryFn: ({ signal }) => api.getRoutines(signal),
    });
  },

  useGetRoutineProgress(date: string) {
    return useQuery({
      queryKey: [...ROUTINE_PROGRESS_QUERY_KEY, getUserKey('owner'), date],
      queryFn: ({ signal }) => api.getRoutineProgress(date, signal),
    });
  },

  useCreateRoutine() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: api.createRoutine,
      onSuccess: () => {
        return invalidateRoutines(queryClient);
      },
    });
  },

  useUpdateRoutine() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({
        id,
        values,
        expectedRoutine,
      }: {
        id: string;
        values: TRoutineValues;
        expectedRoutine: TRoutine;
      }) => api.updateRoutine(id, values, expectedRoutine),
      onSuccess: (result) => {
        if (result === 'conflict') return;
        return invalidateRoutines(queryClient);
      },
    });
  },

  useDeleteRoutine() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: api.deleteRoutine,
      onSuccess: () => {
        return invalidateRoutines(queryClient);
      },
    });
  },

  useReorderRoutines() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ orderedIds, expectedIds }: { orderedIds: string[]; expectedIds: string[] }) =>
        api.reorderRoutines(orderedIds, expectedIds),
      onSuccess: (result) => {
        if (result === 'conflict') return;
        return invalidateRoutines(queryClient);
      },
    });
  },

  useSetRoutineActive() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({
        id,
        isActive,
        expectedIsActive,
      }: {
        id: string;
        isActive: boolean;
        expectedIsActive: boolean;
      }) => api.setRoutineActive(id, isActive, expectedIsActive),
      onSuccess: (result) => {
        if (result === 'conflict') return;
        return invalidateRoutines(queryClient);
      },
    });
  },

  useSetExerciseCompleted() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({
        routineId,
        date,
        exerciseId,
        isCompleted,
      }: {
        routineId: string;
        date: string;
        exerciseId: string;
        isCompleted: boolean;
      }) => api.setExerciseCompleted(routineId, date, exerciseId, isCompleted),
      onSuccess: () => {
        return queryClient.invalidateQueries({
          queryKey: ROUTINE_PROGRESS_QUERY_KEY,
        });
      },
    });
  },
};

export default routineQuery;
