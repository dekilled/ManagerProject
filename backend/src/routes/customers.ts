import { Router, Request, Response } from 'express';
import db from '../database';

const router = Router();

// GET /api/customers
router.get('/', (req: Request, res: Response) => {
  const { search } = req.query;
  let query = 'SELECT * FROM customers WHERE 1=1';
  const params: unknown[] = [];

  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  query += ' ORDER BY created_at DESC';

  const customers = db.prepare(query).all(...params);
  res.json(customers);
});

// GET /api/customers/:id
router.get('/:id', (req: Request, res: Response) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  return res.json(customer);
});

// POST /api/customers
router.post('/', (req: Request, res: Response) => {
  const { name, email, phone, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const result = db.prepare(`
    INSERT INTO customers (name, email, phone, notes) VALUES (?, ?, ?, ?)
  `).run(name, email || null, phone || null, notes || null);

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json(customer);
});

// PUT /api/customers/:id
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, notes } = req.body;

  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Customer not found' });

  db.prepare(`
    UPDATE customers SET name=?, email=?, phone=?, notes=? WHERE id=?
  `).run(name, email || null, phone || null, notes || null, id);

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  return res.json(customer);
});

// DELETE /api/customers/:id
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Customer not found' });

  db.prepare('DELETE FROM customers WHERE id = ?').run(id);
  return res.json({ success: true });
});

export default router;
