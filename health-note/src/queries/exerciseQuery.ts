import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from '@/api/exercise';
import type { TExerciseValues } from '@/api/exercise/type';
import { getUserKey } from '@/lib/auth/currentUser';

export const EXERCISES_QUERY_KEY = ['exercises'] as const;

const exerciseQuery = {
  useGetExercises() {
    return useQuery({
      queryKey: [...EXERCISES_QUERY_KEY, getUserKey('owner')],
      queryFn: ({ signal }) => api.getExercises(signal),
    });
  },

  useCreateExercise() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: api.createExercise,
      onSuccess: () => {
        return queryClient.invalidateQueries({ queryKey: EXERCISES_QUERY_KEY });
      },
    });
  },

  useUpdateExercise() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, values }: { id: string; values: TExerciseValues }) =>
        api.updateExercise(id, values),
      onSuccess: () => {
        return queryClient.invalidateQueries({ queryKey: EXERCISES_QUERY_KEY });
      },
    });
  },

  useDeleteExercise() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: api.deleteExercise,
      onSuccess: (result) => {
        if (result === 'in-use') return;
        return queryClient.invalidateQueries({ queryKey: EXERCISES_QUERY_KEY });
      },
    });
  },

  useReorderExercises() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ orderedIds, expectedIds }: { orderedIds: string[]; expectedIds: string[] }) =>
        api.reorderExercises(orderedIds, expectedIds),
      onSuccess: (result) => {
        if (result === 'conflict') return;
        return queryClient.invalidateQueries({ queryKey: EXERCISES_QUERY_KEY });
      },
    });
  },
};

export default exerciseQuery;
