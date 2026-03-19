import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PendingReceipt, ReceiptsSummary, ApproveReceiptInput } from '@/types';

export const RECEIPTS_KEY = 'receipts';

interface ReceiptsResponse {
  data: PendingReceipt[];
  pagination: { page: number; limit: number; total: number; pages: number };
  summary: ReceiptsSummary;
}

export function useReceipts(status: 'pending' | 'processed' | 'ignored' | 'all' = 'pending') {
  return useQuery<ReceiptsResponse>({
    queryKey: [RECEIPTS_KEY, status],
    queryFn: () => api.get('/receipts', { params: { status, limit: 50 } }),
  });
}

export function useApproveReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApproveReceiptInput }) =>
      api.post(`/receipts/${id}/approve`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECEIPTS_KEY] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useIgnoreReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/receipts/${id}/ignore`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECEIPTS_KEY] });
    },
  });
}

export function useReopenReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/receipts/${id}/reopen`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RECEIPTS_KEY] });
    },
  });
}
