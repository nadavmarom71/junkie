import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/pages/LoginPage';
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
import GoalsPage from '@/pages/GoalsPage';
import CollectionsPage from '@/pages/CollectionsPage';
import PartnershipPage from '@/pages/PartnershipPage';
import ReceiptsInboxPage from '@/pages/ReceiptsInboxPage';
import AccountsPage from '@/pages/AccountsPage';
import Onboarding from '@/pages/Onboarding';

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
      { path: 'goals', element: <GoalsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'collections', element: <CollectionsPage /> },
      { path: 'receipts', element: <ReceiptsInboxPage /> },
      { path: 'accounts', element: <AccountsPage /> },
      { path: 'partnership', element: <PartnershipPage /> },
    ],
  },
  { path: '/onboarding', element: <Onboarding /> },
]);

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080B14' }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontFamily: 'Arial, sans-serif' }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <Toaster richColors position="bottom-left" />
      </>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster richColors position="bottom-left" />
    </>
  );
}
