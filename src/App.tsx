import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import AppLayout from '@/components/layout/AppLayout';
import DashboardPage from '@/pages/DashboardPage';
import TransactionsPage from '@/pages/TransactionsPage';
import InsightsPage from '@/pages/InsightsPage';
import ClientsPage from '@/pages/ClientsPage';
import ClientDetailPage from '@/pages/ClientDetailPage';
import ForecastPage from '@/pages/ForecastPage';
import ReportsPage from '@/pages/ReportsPage';
import RetainersPage from '@/pages/RetainersPage';
import RetainerDetailPage from '@/pages/RetainerDetailPage';
import SettingsPage from '@/pages/SettingsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'insights', element: <InsightsPage /> },
      { path: 'clients', element: <ClientsPage /> },
      { path: 'clients/:id', element: <ClientDetailPage /> },
      { path: 'forecast', element: <ForecastPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'retainers', element: <RetainersPage /> },
      { path: 'retainers/:id', element: <RetainerDetailPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster richColors position="bottom-left" />
    </>
  );
}
