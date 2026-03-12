import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Goal {
  id: string;
  label: string;
  icon: string;
  target: number;
  current: number;
  pct: number;
  projected?: number;
  type: 'monthly' | 'annual' | 'long_term';
  color: string;
  inverse?: boolean;
  subtitle?: string;
}

export interface GoalsData {
  goals: Goal[];
  summary: {
    monthlyIncome: number;
    monthlyExpenses: number;
    personalExpenses: number;
    netSavings: number;
    ytdIncome: number;
    ytdExpenses: number;
    avgPersonalMonthly: number;
  };
  monthlyBreakdown: { month: string; income: number }[];
}

export function useGoals() {
  return useQuery<GoalsData>({
    queryKey: ['goals'],
    queryFn: () => api.get('/goals'),
    staleTime: 60_000,
  });
}
