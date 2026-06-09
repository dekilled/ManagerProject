import axios from 'axios';
import type { Product, Inventory, InventoryMovement, Customer, Bot, DashboardStats } from '../types';

const api = axios.create({
  baseURL: '/api',
});

// Products
export const productsApi = {
  list: (params?: { search?: string; category?: string }) =>
    api.get<Product[]>('/products', { params }).then(r => r.data),
  categories: () =>
    api.get<string[]>('/products/categories').then(r => r.data),
  create: (data: Omit<Product, 'id' | 'created_at'>) =>
    api.post<Product>('/products', data).then(r => r.data),
  update: (id: number, data: Partial<Product>) =>
    api.put<Product>(`/products/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/products/${id}`).then(r => r.data),
};

// Inventory
export const inventoryApi = {
  list: () =>
    api.get<Inventory[]>('/inventory').then(r => r.data),
  alerts: () =>
    api.get<Inventory[]>('/inventory/alerts').then(r => r.data),
  movements: (productId: number) =>
    api.get<InventoryMovement[]>(`/inventory/movements/${productId}`).then(r => r.data),
  addMovement: (data: { product_id: number; type: 'entrada' | 'saida'; quantity: number; reason?: string }) =>
    api.post<Inventory>('/inventory/movements', data).then(r => r.data),
  updateMinQty: (productId: number, min_quantity: number) =>
    api.put(`/inventory/${productId}`, { min_quantity }).then(r => r.data),
};

// Customers
export const customersApi = {
  list: (params?: { search?: string }) =>
    api.get<Customer[]>('/customers', { params }).then(r => r.data),
  get: (id: number) =>
    api.get<Customer>(`/customers/${id}`).then(r => r.data),
  create: (data: Omit<Customer, 'id' | 'created_at'>) =>
    api.post<Customer>('/customers', data).then(r => r.data),
  update: (id: number, data: Partial<Customer>) =>
    api.put<Customer>(`/customers/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/customers/${id}`).then(r => r.data),
};

// Bots
export const botsApi = {
  list: () =>
    api.get<Bot[]>('/bots').then(r => r.data),
  get: (id: number) =>
    api.get<Bot>(`/bots/${id}`).then(r => r.data),
  create: (data: { name: string; description?: string }) =>
    api.post<Bot>('/bots', data).then(r => r.data),
  update: (id: number, data: Partial<Bot>) =>
    api.put<Bot>(`/bots/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/bots/${id}`).then(r => r.data),
  toggle: (id: number) =>
    api.post<Bot>(`/bots/${id}/toggle`).then(r => r.data),
};

// Dashboard
export const dashboardApi = {
  stats: () =>
    api.get<DashboardStats>('/dashboard/stats').then(r => r.data),
};
