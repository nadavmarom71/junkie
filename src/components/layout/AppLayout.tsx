import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useUIStore } from '@/store/uiStore';

export default function AppLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }} dir="rtl">
      <Sidebar />
      <div
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300 relative"
        style={{ marginRight: sidebarOpen ? '240px' : '0', zIndex: 1 }}
      >
        <TopBar />
        <main className="flex-1 overflow-y-auto p-5 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
