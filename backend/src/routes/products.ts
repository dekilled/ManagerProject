import { Router, Request, Response } from 'express';
import db from '../database';

const router = Router();

// GET /api/products
router.get('/', (req: Request, res: Response) => {
  const { search, category } = req.query;
  let query = `
    SELECT p.*, COALESCE(i.quantity, 0) as stock_quantity, COALESCE(i.min_quantity, 5) as min_quantity
    FROM products p
    LEFT JOIN inventory i ON i.product_id = p.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (search) {
    query += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (category) {
    query += ` AND p.category = ?`;
    params.push(category);
  }
  query += ` ORDER BY p.created_at DESC`;

  const products = db.prepare(query).all(...params);
  res.json(products);
});

// GET /api/products/categories
router.get('/categories', (_req: Request, res: Response) => {
  const categories = db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all();
  res.json(categories.map((c: unknown) => (c as { category: string }).category));
});

// POST /api/products
router.post('/', (req: Request, res: Response) => {
  const { name, sku, category, price, description } = req.body;
  if (!name || !sku || !category || price === undefined) {
    return res.status(400).json({ error: 'name, sku, category, price are required' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO products (name, sku, category, price, description) VALUES (?, ?, ?, ?, ?)
    `).run(name, sku, category, price, description || null);

    // Create inventory entry
    db.prepare(`INSERT INTO inventory (product_id, quantity, min_quantity) VALUES (?, 0, 5)`).run(result.lastInsertRowid);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json(product);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'SKU already exists' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/products/:id
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, sku, category, price, description } = req.body;

  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  try {
    db.prepare(`
      UPDATE products SET name=?, sku=?, category=?, price=?, description=? WHERE id=?
    `).run(name, sku, category, price, description || null, id);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return res.json(product);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'SKU already exists' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return res.json({ success: true });
});

export default router;
