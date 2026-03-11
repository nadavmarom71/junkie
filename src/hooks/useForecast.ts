import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { RetainerForecastMonth, RevenueForecastMonth, CashFlowForecastMonth } from '@/types';

interface RetainerForecastResponse {
  months: RetainerForecastMonth[];
  summary: { monthly_total: number; annual_projection: number; retainer_count: number };
}

interface RevenueForecastBasis {
  avg_monthly: number;
  total_past_3_months: number;
  monthly_trend: number;
  trend_direction: 'growing' | 'declining' | 'stable';
  retainer_base: number;
  volatility: number;
}

interface HistoryMonth {
  month: string;
  income: number;
  expenses: number;
}

interface RevenueForecastResponse {
  months: RevenueForecastMonth[];
  basis: RevenueForecastBasis;
  history: HistoryMonth[];
}

export function useRetainerForecast() {
  return useQuery<RetainerForecastResponse>({
    queryKey: ['forecast', 'retainers'],
    queryFn: () => api.get('/forecast/retainers'),
    staleTime: 1000 * 60 * 10,
  });
}

export function useRevenueForecast() {
  return useQuery<RevenueForecastResponse>({
    queryKey: ['forecast', 'revenue'],
    queryFn: () => api.get('/forecast/revenue'),
    staleTime: 1000 * 60 * 10,
  });
}

export function useCashFlowForecast() {
  return useQuery<{ months: CashFlowForecastMonth[] }>({
    queryKey: ['forecast', 'cashflow'],
    queryFn: () => api.get('/forecast/cashflow'),
    staleTime: 1000 * 60 * 10,
  });
}
