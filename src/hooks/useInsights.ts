import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { AiInsight, PaginatedResponse } from '@/types';

export const INSIGHTS_KEY = 'insights';

export interface InsightFilters {
  unread?: boolean;
  severity?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export function useInsights(filters: InsightFilters = {}) {
  return useQuery<PaginatedResponse<AiInsight>>({
    queryKey: [INSIGHTS_KEY, filters],
    queryFn: () =>
      api.get('/insights', {
        params: {
          ...filters,
          unread: filters.unread ? 'true' : undefined,
        },
      }),
  });
}

export function useMarkInsightRead() {
  const qc = useQueryClient();
  return useMutation<AiInsight, Error, string>({
    mutationFn: (id) => api.post(`/insights/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INSIGHTS_KEY] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useMarkAllInsightsRead() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, void>({
    mutationFn: () => api.post('/insights/mark-all-read'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INSIGHTS_KEY] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useGenerateInsight() {
  const qc = useQueryClient();
  return useMutation<AiInsight, Error, void>({
    mutationFn: () => api.post('/insights/generate'),
    onSuccess: () => qc.invalidateQueries({ queryKey: [INSIGHTS_KEY] }),
  });
}
