import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function useSettings() {
  return useQuery<Record<string, unknown>>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation<Record<string, unknown>, Error, Record<string, unknown>>({
    mutationFn: (data) => api.put('/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
