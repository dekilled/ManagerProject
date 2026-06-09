import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useStore } from '../store';

export default function Layout() {
  const { sidebarOpen, toggleSidebar } = useStore();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar open={sidebarOpen} onClose={toggleSidebar} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={toggleSidebar} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
