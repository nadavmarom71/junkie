import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// Every request stays on the existing authenticated Express API. No browser database credentials.
export const financeGet = <T,>(path: string) => api.get<never, T>(`/finance${path}`);
export const financePost = <T,>(path: string, body: unknown) => api.post<never, T>(`/finance${path}`, body, {timeout: 90000});
export const financePut = <T,>(path: string, body: unknown) => api.put<never, T>(`/finance${path}`, body);
export function useFinance<T>(path: string, enabled = true) {
  return useQuery<T, Error>({queryKey: ['finance', path], queryFn: () => financeGet<T>(path), enabled, staleTime: 30000, retry: 1});
}
export function useFinanceSave<T = unknown>() {
  const client = useQueryClient();
  return useMutation<T, Error, {path: string; body: unknown; method?: 'post' | 'put'}>({
    mutationFn: ({path, body, method}) => method === 'post' ? financePost<T>(path, body) : financePut<T>(path, body),
    onSuccess: () => client.invalidateQueries({queryKey: ['finance']}),
  });
}
export function useFinanceFilePreview<T = unknown>(path: string) {
  return useMutation<T, Error, File>({
    mutationFn: async file => {
      const body = new FormData();
      body.append('file', file);
      return api.post<never, T>(`/finance${path}`, body, {
        timeout: 90000,
        headers: {'Content-Type': undefined},
      });
    },
  });
}
export function useFinanceBankPreview<T = unknown>() {
  return useMutation<T, Error, {file: File; period: 'recent90' | 'all'}>({
    mutationFn: async ({file, period}) => {
      const body = new FormData();
      body.append('file', file);
      return api.post<never, T>(`/finance/import/bank-statement/preview?period=${period}`, body, {
        timeout: 90000,
        headers: {'Content-Type': undefined},
      });
    },
  });
}
export function useFinanceFileCommit<T = unknown>(path: string) {
  const client = useQueryClient();
  return useMutation<T, Error, {file: File; confirmationDigest: string; period?: 'recent90' | 'all'}>({
    mutationFn: async ({file, confirmationDigest, period}) => {
      const body = new FormData();
      body.append('file', file);
      body.append('confirmationDigest', confirmationDigest);
      if(period) body.append('period', period);
      return api.post<never, T>(`/finance${path}`, body, {
        timeout: 90000,
        headers: {'Content-Type': undefined},
      });
    },
    onSuccess: () => client.invalidateQueries({queryKey: ['finance']}),
  });
}
