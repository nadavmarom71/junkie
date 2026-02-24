import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Retainer, CreateRetainerInput } from '@/types';

export const RETAINERS_KEY = 'retainers';

interface RetainersResponse {
  retainers: Retainer[];
  summary: {
    active_count: number;
    monthly_total: number;
    annual_projection: number;
  };
}

export function useRetainers(status?: string) {
  return useQuery<RetainersResponse>({
    queryKey: [RETAINERS_KEY, status],
    queryFn: () => api.get('/retainers', { params: { status } }),
  });
}

export function useRetainer(id: string) {
  return useQuery<Retainer>({
    queryKey: [RETAINERS_KEY, id],
    queryFn: () => api.get(`/retainers/${id}`),
    enabled: !!id,
  });
}

export function useCreateRetainer() {
  const qc = useQueryClient();
  return useMutation<Retainer, Error, CreateRetainerInput>({
    mutationFn: (data) => api.post('/retainers', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RETAINERS_KEY] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateRetainer() {
  const qc = useQueryClient();
  return useMutation<Retainer, Error, { id: string; data: Partial<CreateRetainerInput> }>({
    mutationFn: ({ id, data }) => api.put(`/retainers/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RETAINERS_KEY] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteRetainer() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete(`/retainers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RETAINERS_KEY] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
