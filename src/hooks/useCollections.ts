import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { CollectionsResponse } from '@/types';

export function useCollections(enabled = true) {
  return useQuery({
    queryKey: ['collections'],
    queryFn: () => api.get('/collections') as unknown as Promise<CollectionsResponse>,
    staleTime: 0,
    enabled,
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
    mutationFn: ({ id, ...receipt }: { id: string; idempotency_key: string; amount: number; date: string; installment_id?: string | null; document_link?: string | null }) => api.post(`/collections/paid/${id}`, receipt) as unknown as Promise<{ok: boolean; skipped?: 'duplicate' | 'already_collected'; received?: number; remaining?: number}>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}
