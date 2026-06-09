import { Menu, Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Produtos',
  '/inventory': 'Estoque',
  '/customers': 'Clientes',
  '/bots': 'BOT Builder',
};

export default function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'ManagerProject';

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          className="lg:hidden text-slate-500 hover:text-slate-700"
          onClick={onMenuClick}
        >
          <Menu size={24} />
        </button>
        <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
          <Bell size={20} />
        </button>
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
          A
        </div>
      </div>
    </header>
  );
}
