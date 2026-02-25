import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { DashboardStats } from '@/types';

export function useDashboardStats(month?: string) {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats', month ?? 'current'],
    queryFn: () => api.get('/dashboard/stats', { params: month ? { month } : undefined }),
    staleTime: 0,
    refetchInterval: 30_000,
  });
}
