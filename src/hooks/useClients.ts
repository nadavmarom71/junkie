import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Client, CreateClientInput, ClientProfitability } from '@/types';

export const CLIENTS_KEY = 'clients';

export function useClients(sort?: string) {
  return useQuery<Client[]>({
    queryKey: [CLIENTS_KEY, sort],
    queryFn: () => api.get('/clients', { params: { sort } }),
  });
}

export function useClient(id: string) {
  return useQuery<Client & { transactions: unknown[]; retainers: unknown[] }>({
    queryKey: [CLIENTS_KEY, id],
    queryFn: () => api.get(`/clients/${id}`),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation<Client, Error, CreateClientInput>({
    mutationFn: (data) => api.post('/clients', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLIENTS_KEY] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation<Client, Error, { id: string; data: Partial<CreateClientInput> }>({
    mutationFn: ({ id, data }) => api.put(`/clients/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLIENTS_KEY] }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete(`/clients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLIENTS_KEY] }),
  });
}

export function useClientProfitability(id: string) {
  return useQuery<ClientProfitability>({
    queryKey: [CLIENTS_KEY, id, 'profitability'],
    queryFn: () => api.get(`/clients/${id}/profitability`),
    enabled: !!id,
  });
}

export function useClientAiRecommendation() {
  return useMutation<{ recommendation: string }, Error, string>({
    mutationFn: (id) => api.post(`/clients/${id}/ai-recommendation`),
  });
}
