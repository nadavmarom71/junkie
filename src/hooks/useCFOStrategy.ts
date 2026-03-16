import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { CFOStrategy } from '@/types';

export function useCFOStrategy() {
  return useQuery<{ data: CFOStrategy | null; updated_at: string | null }>({
    queryKey: ['cfo_strategy'],
    queryFn: () => api.get('/goals/strategy'),
    staleTime: 10 * 60_000,
  });
}

export function useRefreshStrategy() {
  const qc = useQueryClient();
  return useMutation<{ data: CFOStrategy }, Error, void>({
    mutationFn: () => api.post('/goals/strategy/refresh', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cfo_strategy'] });
      qc.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}
