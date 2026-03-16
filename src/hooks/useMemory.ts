import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { CFOMemory } from '@/types';

export function useMemory() {
  return useQuery<{ data: CFOMemory; updated_at: string | null }>({
    queryKey: ['cfo_memory'],
    queryFn: () => api.get('/memory'),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateMemory() {
  const qc = useQueryClient();
  return useMutation<{ data: CFOMemory }, Error, Partial<CFOMemory>>({
    mutationFn: (body) => api.put('/memory', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cfo_memory'] }),
  });
}
