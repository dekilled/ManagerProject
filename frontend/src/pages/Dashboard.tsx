import { useEffect } from 'react';
import { Package, AlertTriangle, Users, Bot, TrendingUp, TrendingDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useStore } from '../store';

function StatCard({
  title, value, icon: Icon, color, subtitle,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { dashboardStats, loadingDashboard, fetchDashboardStats } = useStore();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (loadingDashboard && !dashboardStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = dashboardStats;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Total de Produtos"
          value={stats?.totalProducts ?? 0}
          icon={Package}
          color="bg-blue-500"
          subtitle="produtos cadastrados"
        />
        <StatCard
          title="Alertas de Estoque"
          value={stats?.lowStockAlerts ?? 0}
          icon={AlertTriangle}
          color="bg-yellow-500"
          subtitle="abaixo do mínimo"
        />
        <StatCard
          title="Clientes"
          value={stats?.totalCustomers ?? 0}
          icon={Users}
          color="bg-green-500"
          subtitle="clientes cadastrados"
        />
        <StatCard
          title="Bots Ativos"
          value={stats?.activeBots ?? 0}
          icon={Bot}
          color="bg-purple-500"
          subtitle="bots em execução"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="xl:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Estoque por Categoria</h3>
          {stats?.stockByCategory && stats.stockByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.stockByCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="quantity" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              Sem dados de estoque
            </div>
          )}
        </div>

        {/* Recent movements */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Atividade Recente</h3>
          <div className="space-y-3 overflow-auto max-h-72">
            {stats?.recentMovements?.length ? (
              stats.recentMovements.map((mv) => (
                <div key={mv.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                    ${mv.type === 'entrada' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {mv.type === 'entrada'
                      ? <TrendingUp size={14} className="text-green-600" />
                      : <TrendingDown size={14} className="text-red-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{mv.product_name}</p>
                    <p className="text-xs text-slate-400">
                      {mv.type === 'entrada' ? '+' : '-'}{mv.quantity} unidades
                      {mv.reason && ` · ${mv.reason}`}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    mv.type === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {mv.type}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm">Nenhuma movimentação recente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
