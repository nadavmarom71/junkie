import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: () => api.get('/collections'),
    staleTime: 1000 * 60 * 2,
  });
}

export function useRemindCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/collections/remind/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  });
}
