import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import * as api from '@/api/routine';
import type { TRoutineValues } from '@/api/routine/type';
import { PLAN_QUERY_KEY } from './planQuery';
import { getUserKey } from '@/lib/auth/currentUser';

export const ROUTINES_QUERY_KEY = ['routines'] as const;

function invalidateRoutines(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: ROUTINES_QUERY_KEY });
}

const routineQuery = {
  useGetRoutines() {
    return useQuery({
      queryKey: [...ROUTINES_QUERY_KEY, getUserKey('owner')],
      queryFn: ({ signal }) => api.getRoutines(signal),
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
        expectedVersion,
      }: {
        id: string;
        values: TRoutineValues;
        expectedVersion: number;
      }) => api.updateRoutine(id, values, expectedVersion),
      onSuccess: (result) => {
        if (result === 'conflict') return;
        return Promise.all([
          invalidateRoutines(queryClient),
          queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEY }),
        ]);
      },
    });
  },

  useDeleteRoutine() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: api.deleteRoutine,
      onSuccess: (result) => {
        if (result === 'in-use') return;
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
};

export default routineQuery;
