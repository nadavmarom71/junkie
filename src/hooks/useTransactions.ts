import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  BusinessTransaction,
  PersonalExpense,
  CreateBusinessTransactionInput,
  CreatePersonalExpenseInput,
  PaginatedResponse,
} from '@/types';

export const TRANSACTIONS_KEY = 'transactions';

export interface TransactionFilters {
  tab?: 'business' | 'personal';
  type?: 'income' | 'expense' | 'all';
  category?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery<PaginatedResponse<BusinessTransaction | PersonalExpense>>({
    queryKey: [TRANSACTIONS_KEY, filters],
    queryFn: () =>
      api.get('/transactions', {
        params: { ...filters, page: filters.page || 1, limit: filters.limit || 25 },
      }),
  });
}

export function useCategories(tab: 'business' | 'personal' = 'business') {
  return useQuery<string[]>({
    queryKey: ['categories', tab],
    queryFn: () => api.get('/transactions/meta/categories', { params: { tab } }),
    staleTime: 1000 * 60 * 10,
  });
}

function invalidateDashboard(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['dashboard'] });
  qc.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
  qc.invalidateQueries({ queryKey: ['categories'] });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation<BusinessTransaction, Error, CreateBusinessTransactionInput>({
    mutationFn: (data) => api.post('/transactions', data),
    onSuccess: () => invalidateDashboard(qc),
  });
}

export function useCreatePersonalExpense() {
  const qc = useQueryClient();
  return useMutation<PersonalExpense, Error, CreatePersonalExpenseInput>({
    mutationFn: (data) => api.post('/transactions/personal', data),
    onSuccess: () => invalidateDashboard(qc),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation<
    BusinessTransaction,
    Error,
    { id: string; data: Partial<CreateBusinessTransactionInput> }
  >({
    mutationFn: ({ id, data }) => api.put(`/transactions/${id}`, data),
    onSuccess: () => invalidateDashboard(qc),
  });
}

export function useUpdatePersonalExpense() {
  const qc = useQueryClient();
  return useMutation<
    PersonalExpense,
    Error,
    { id: string; data: Partial<CreatePersonalExpenseInput> }
  >({
    mutationFn: ({ id, data }) => api.put(`/transactions/personal/${id}`, data),
    onSuccess: () => invalidateDashboard(qc),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete(`/transactions/${id}`),
    onSuccess: () => invalidateDashboard(qc),
  });
}

export function useDeletePersonalExpense() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete(`/transactions/personal/${id}`),
    onSuccess: () => invalidateDashboard(qc),
  });
}
