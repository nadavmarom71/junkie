import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ReportData } from '@/types';

export interface ReportParams {
  from: string;
  to: string;
  format?: 'json' | 'pdf';
  send_telegram?: boolean;
}

export function useGenerateReport() {
  return useMutation<ReportData, Error, ReportParams>({
    mutationFn: async (params) => {
      if (params.format === 'pdf') {
        // PDF: trigger browser download
        const url = `/api/v1/reports/generate?from=${params.from}&to=${params.to}&format=pdf&send_telegram=${params.send_telegram || false}`;
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${params.from}-${params.to}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return {} as ReportData;
      }
      return api.get('/reports/generate', { params });
    },
  });
}
