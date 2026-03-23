import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: () => api.get('/collections'),
    staleTime: 0,
  });
}

export function useRemindCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/collections/remind/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  });
}

export function useMarkCollectionPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/collections/paid/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
