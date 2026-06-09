import { Router, Request, Response } from 'express';
import db from '../database';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', (_req: Request, res: Response) => {
  const totalProducts = (db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }).count;
  const totalCustomers = (db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number }).count;
  const activeBots = (db.prepare('SELECT COUNT(*) as count FROM bots WHERE active = 1').get() as { count: number }).count;
  const lowStockAlerts = (db.prepare('SELECT COUNT(*) as count FROM inventory WHERE quantity <= min_quantity').get() as { count: number }).count;

  const recentMovements = db.prepare(`
    SELECT m.*, p.name as product_name
    FROM inventory_movements m
    JOIN products p ON p.id = m.product_id
    ORDER BY m.created_at DESC
    LIMIT 10
  `).all();

  const stockByCategory = db.prepare(`
    SELECT p.category, SUM(i.quantity) as quantity
    FROM inventory i
    JOIN products p ON p.id = i.product_id
    GROUP BY p.category
    ORDER BY quantity DESC
  `).all();

  res.json({
    totalProducts,
    lowStockAlerts,
    totalCustomers,
    activeBots,
    recentMovements,
    stockByCategory,
  });
});

export default router;
