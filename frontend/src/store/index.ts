import { create } from 'zustand';
import type { Product, Inventory, Customer, Bot, DashboardStats } from '../types';
import { productsApi, inventoryApi, customersApi, botsApi, dashboardApi } from '../api';

interface AppState {
  // Products
  products: Product[];
  loadingProducts: boolean;
  fetchProducts: (params?: { search?: string; category?: string }) => Promise<void>;

  // Inventory
  inventory: Inventory[];
  loadingInventory: boolean;
  fetchInventory: () => Promise<void>;

  // Customers
  customers: Customer[];
  loadingCustomers: boolean;
  fetchCustomers: (params?: { search?: string }) => Promise<void>;

  // Bots
  bots: Bot[];
  loadingBots: boolean;
  currentBot: Bot | null;
  fetchBots: () => Promise<void>;
  setCurrentBot: (bot: Bot | null) => void;

  // Dashboard
  dashboardStats: DashboardStats | null;
  loadingDashboard: boolean;
  fetchDashboardStats: () => Promise<void>;

  // UI
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useStore = create<AppState>((set) => ({
  // Products
  products: [],
  loadingProducts: false,
  fetchProducts: async (params) => {
    set({ loadingProducts: true });
    try {
      const products = await productsApi.list(params);
      set({ products });
    } finally {
      set({ loadingProducts: false });
    }
  },

  // Inventory
  inventory: [],
  loadingInventory: false,
  fetchInventory: async () => {
    set({ loadingInventory: true });
    try {
      const inventory = await inventoryApi.list();
      set({ inventory });
    } finally {
      set({ loadingInventory: false });
    }
  },

  // Customers
  customers: [],
  loadingCustomers: false,
  fetchCustomers: async (params) => {
    set({ loadingCustomers: true });
    try {
      const customers = await customersApi.list(params);
      set({ customers });
    } finally {
      set({ loadingCustomers: false });
    }
  },

  // Bots
  bots: [],
  loadingBots: false,
  currentBot: null,
  fetchBots: async () => {
    set({ loadingBots: true });
    try {
      const bots = await botsApi.list();
      set({ bots });
    } finally {
      set({ loadingBots: false });
    }
  },
  setCurrentBot: (bot) => set({ currentBot: bot }),

  // Dashboard
  dashboardStats: null,
  loadingDashboard: false,
  fetchDashboardStats: async () => {
    set({ loadingDashboard: true });
    try {
      const stats = await dashboardApi.stats();
      set({ dashboardStats: stats });
    } finally {
      set({ loadingDashboard: false });
    }
  },

  // UI
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
