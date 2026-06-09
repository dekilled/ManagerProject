import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react';
import { useStore } from '../store';
import { productsApi } from '../api';
import type { Product } from '../types';

interface ProductFormData {
  name: string;
  sku: string;
  category: string;
  price: string;
  description: string;
}

function ProductModal({
  product,
  onClose,
  onSave,
}: {
  product?: Product;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState<ProductFormData>({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    category: product?.category ?? '',
    price: product?.price?.toString() ?? '',
    description: product?.description ?? '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.sku || !form.category || !form.price) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }
    setLoading(true);
    try {
      const data = {
        name: form.name,
        sku: form.sku,
        category: form.category,
        price: parseFloat(form.price),
        description: form.description,
      };
      if (product) {
        await productsApi.update(product.id, data);
      } else {
        await productsApi.create(data);
      }
      onSave();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">
            {product ? 'Editar Produto' : 'Novo Produto'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome do produto"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SKU *</label>
              <input
                type="text"
                value={form.sku}
                onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="EX: PROD-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoria *</label>
              <input
                type="text"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Categoria"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Preço *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Descrição do produto"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Products() {
  const { products, loadingProducts, fetchProducts } = useStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [modal, setModal] = useState<{ open: boolean; product?: Product }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    fetchProducts();
    productsApi.categories().then(setCategories);
  }, []);

  const handleSearch = () => {
    fetchProducts({ search: search || undefined, category: category || undefined });
  };

  useEffect(() => {
    fetchProducts({ search: search || undefined, category: category || undefined });
  }, [category]);

  const handleDelete = async (id: number) => {
    await productsApi.delete(id);
    fetchProducts({ search: search || undefined, category: category || undefined });
    setDeleteConfirm(null);
  };

  const getStockBadge = (qty?: number, min?: number) => {
    if (qty === undefined) return null;
    if (qty === 0) return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">Sem estoque</span>;
    if (qty <= (min ?? 5)) return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Baixo estoque</span>;
    return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">Em estoque</span>;
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Pesquisar produtos..."
            />
          </div>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as categorias</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={handleSearch}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Buscar
          </button>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          <Plus size={16} />
          Novo Produto
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loadingProducts ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">SKU</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Categoria</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Preço</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Estoque</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      Nenhum produto encontrado
                    </td>
                  </tr>
                ) : products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-800">{p.name}</p>
                        {p.description && (
                          <p className="text-xs text-slate-400 truncate max-w-xs">{p.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{p.sku}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      R$ {p.price.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-700">
                      {p.stock_quantity ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStockBadge(p.stock_quantity, p.min_quantity)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setModal({ open: true, product: p })}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Pencil size={15} />
                        </button>
                        {deleteConfirm === p.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="px-2 py-1 text-xs text-white bg-red-600 hover:bg-red-700 rounded"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(p.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal.open && (
        <ProductModal
          product={modal.product}
          onClose={() => setModal({ open: false })}
          onSave={() => {
            setModal({ open: false });
            fetchProducts({ search: search || undefined, category: category || undefined });
          }}
        />
      )}
    </div>
  );
}
