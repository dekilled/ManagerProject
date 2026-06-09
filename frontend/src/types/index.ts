export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  description?: string;
  created_at: string;
  stock_quantity?: number;
  min_quantity?: number;
}

export interface Inventory {
  id: number;
  product_id: number;
  quantity: number;
  min_quantity: number;
  updated_at: string;
  product_name: string;
  product_sku: string;
  product_category: string;
  price: number;
}

export interface InventoryMovement {
  id: number;
  product_id: number;
  type: 'entrada' | 'saida';
  quantity: number;
  reason?: string;
  created_at: string;
  product_name?: string;
}

export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at: string;
}

export type BlockType = 'start' | 'message' | 'question' | 'condition' | 'action' | 'menu' | 'end';

export interface BotBlock {
  id: string;
  type: BlockType;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

export interface Connection {
  id: string;
  fromBlockId: string;
  fromOutput: string;
  toBlockId: string;
}

export interface Bot {
  id: number;
  name: string;
  description?: string;
  active: boolean;
  blocks: BotBlock[];
  connections: Connection[];
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalProducts: number;
  lowStockAlerts: number;
  totalCustomers: number;
  activeBots: number;
  recentMovements: InventoryMovement[];
  stockByCategory: { category: string; quantity: number }[];
}
