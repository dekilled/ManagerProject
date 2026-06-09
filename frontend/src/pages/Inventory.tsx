import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, History, X } from 'lucide-react';
import { useStore } from '../store';
import { inventoryApi } from '../api';
import type { Inventory as InventoryType, InventoryMovement, Product } from '../types';
import { productsApi } from '../api';

function MovementModal({
  products,
  onClose,
  onSave,
}: {
  products: Product[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    product_id: '',
    type: 'entrada' as 'entrada' | 'saida',
    quantity: '',
    reason: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_id || !form.quantity) {
      setError('Produto e quantidade são obrigatórios');
      return;
    }
    setLoading(true);
    try {
      await inventoryApi.addMovement({
        product_id: parseInt(form.product_id),
        type: form.type,
        quantity: parseInt(form.quantity),
        reason: form.reason || undefined,
      });
      onSave();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Erro ao registrar movimentação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">Nova Movimentação</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Produto *</label>
            <select
              value={form.product_id}
              onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um produto</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo *</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, type: 'entrada' }))}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors
                  ${form.type === 'entrada' ? 'bg-green-600 text-white border-green-600' : 'border-slate-300 text-slate-600 hover:border-green-400'}`}
              >
                <TrendingUp size={16} /> Entrada
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, type: 'saida' }))}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors
                  ${form.type === 'saida' ? 'bg-red-600 text-white border-red-600' : 'border-slate-300 text-slate-600 hover:border-red-400'}`}
              >
                <TrendingDown size={16} /> Saída
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade *</label>
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
            <input
              type="text"
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Venda #001, Reposição..."
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
              {loading ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HistoryModal({
  item,
  onClose,
}: {
  item: InventoryType;
  onClose: () => void;
}) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inventoryApi.movements(item.product_id).then(m => {
      setMovements(m);
      setLoading(false);
    });
  }, [item.product_id]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Histórico de Movimentações</h3>
            <p className="text-sm text-slate-500">{item.product_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-6 max-h-96 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : movements.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Nenhuma movimentação encontrada</p>
          ) : (
            <div className="space-y-2">
              {movements.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                    ${m.type === 'entrada' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {m.type === 'entrada'
                      ? <TrendingUp size={14} className="text-green-600" />
                      : <TrendingDown size={14} className="text-red-600" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${m.type === 'entrada' ? 'text-green-700' : 'text-red-700'}`}>
                        {m.type === 'entrada' ? '+' : '-'}{m.quantity} unidades
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(m.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {m.reason && <p className="text-xs text-slate-500 mt-0.5">{m.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Inventory() {
  const { inventory, loadingInventory, fetchInventory } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [movModal, setMovModal] = useState(false);
  const [historyItem, setHistoryItem] = useState<InventoryType | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    fetchInventory();
    productsApi.list().then(setProducts);
  }, []);

  const alerts = inventory.filter(i => i.quantity <= i.min_quantity);
  const displayed = showAlerts ? alerts : inventory;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setShowAlerts(false)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors
              ${!showAlerts ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setShowAlerts(true)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors
              ${showAlerts ? 'bg-yellow-500 text-white' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'}`}
          >
            <AlertTriangle size={15} />
            Alertas ({alerts.length})
          </button>
        </div>
        <button
          onClick={() => setMovModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          <TrendingUp size={16} />
          Nova Movimentação
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loadingInventory ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Produto</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">SKU</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Categoria</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Qtd Atual</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Qtd Mínima</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      {showAlerts ? 'Nenhum alerta de estoque' : 'Nenhum item de estoque'}
                    </td>
                  </tr>
                ) : displayed.map(item => {
                  const isLow = item.quantity <= item.min_quantity;
                  const isEmpty = item.quantity === 0;
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 ${isLow ? 'bg-yellow-50/30' : ''}`}>
                      <td className="px-4 py-3 font-medium text-slate-800">{item.product_name}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{item.product_sku}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          {item.product_category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold text-lg ${isEmpty ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-green-600'}`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">{item.min_quantity}</td>
                      <td className="px-4 py-3 text-center">
                        {isEmpty ? (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">Sem estoque</span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-1 w-fit mx-auto">
                            <AlertTriangle size={11} /> Baixo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">Normal</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => setHistoryItem(item)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                          >
                            <History size={13} /> Histórico
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {movModal && (
        <MovementModal
          products={products}
          onClose={() => setMovModal(false)}
          onSave={() => {
            setMovModal(false);
            fetchInventory();
          }}
        />
      )}

      {historyItem && (
        <HistoryModal
          item={historyItem}
          onClose={() => setHistoryItem(null)}
        />
      )}
    </div>
  );
}
