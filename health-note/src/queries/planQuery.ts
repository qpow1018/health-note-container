import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from '@/api/plan';
import type { TPlanValues } from '@/api/plan/type';
import { getUserKey } from '@/lib/auth/currentUser';

export const PLAN_QUERY_KEY = ['active-plan'] as const;

const planQuery = {
  useGetActivePlan() {
    return useQuery({
      queryKey: [...PLAN_QUERY_KEY, getUserKey('owner')],
      queryFn: ({ signal }) => api.getActivePlan(signal),
    });
  },

  useCreatePlan() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, values }: { id: string; values: TPlanValues }) =>
        api.createPlan(id, values),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEY }),
    });
  },
};

export default planQuery;
