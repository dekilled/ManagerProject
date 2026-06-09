import { Router, Request, Response } from 'express';
import db from '../database';

const router = Router();

// GET /api/inventory
router.get('/', (_req: Request, res: Response) => {
  const items = db.prepare(`
    SELECT i.*, p.name as product_name, p.sku as product_sku, p.category as product_category, p.price
    FROM inventory i
    JOIN products p ON p.id = i.product_id
    ORDER BY p.name
  `).all();
  res.json(items);
});

// GET /api/inventory/alerts
router.get('/alerts', (_req: Request, res: Response) => {
  const alerts = db.prepare(`
    SELECT i.*, p.name as product_name, p.sku as product_sku, p.category
    FROM inventory i
    JOIN products p ON p.id = i.product_id
    WHERE i.quantity <= i.min_quantity
    ORDER BY i.quantity ASC
  `).all();
  res.json(alerts);
});

// GET /api/inventory/movements/:productId
router.get('/movements/:productId', (req: Request, res: Response) => {
  const { productId } = req.params;
  const movements = db.prepare(`
    SELECT m.*, p.name as product_name
    FROM inventory_movements m
    JOIN products p ON p.id = m.product_id
    WHERE m.product_id = ?
    ORDER BY m.created_at DESC
  `).all(productId);
  res.json(movements);
});

// POST /api/inventory/movements
router.post('/movements', (req: Request, res: Response) => {
  const { product_id, type, quantity, reason } = req.body;
  if (!product_id || !type || !quantity) {
    return res.status(400).json({ error: 'product_id, type, quantity are required' });
  }
  if (!['entrada', 'saida'].includes(type)) {
    return res.status(400).json({ error: 'type must be entrada or saida' });
  }

  const inventory = db.prepare('SELECT * FROM inventory WHERE product_id = ?').get(product_id) as { quantity: number } | undefined;
  if (!inventory) {
    return res.status(404).json({ error: 'Inventory not found for product' });
  }

  if (type === 'saida' && inventory.quantity < quantity) {
    return res.status(400).json({ error: 'Insufficient stock' });
  }

  const doMovement = db.transaction(() => {
    db.prepare(`
      INSERT INTO inventory_movements (product_id, type, quantity, reason) VALUES (?, ?, ?, ?)
    `).run(product_id, type, quantity, reason || null);

    const delta = type === 'entrada' ? quantity : -quantity;
    db.prepare(`
      UPDATE inventory SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?
    `).run(delta, product_id);
  });

  doMovement();

  const updated = db.prepare(`
    SELECT i.*, p.name as product_name FROM inventory i JOIN products p ON p.id = i.product_id WHERE i.product_id = ?
  `).get(product_id);
  return res.status(201).json(updated);
});

// PUT /api/inventory/:productId - update min_quantity
router.put('/:productId', (req: Request, res: Response) => {
  const { productId } = req.params;
  const { min_quantity } = req.body;

  db.prepare('UPDATE inventory SET min_quantity = ? WHERE product_id = ?').run(min_quantity, productId);
  const updated = db.prepare('SELECT * FROM inventory WHERE product_id = ?').get(productId);
  return res.json(updated);
});

export default router;
