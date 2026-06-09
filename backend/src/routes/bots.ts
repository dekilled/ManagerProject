import { Router, Request, Response } from 'express';
import db from '../database';

const router = Router();

function parseBot(row: Record<string, unknown>) {
  return {
    ...row,
    active: row.active === 1,
    blocks: JSON.parse((row.blocks_json as string) || '[]'),
    connections: JSON.parse((row.connections_json as string) || '[]'),
  };
}

// GET /api/bots
router.get('/', (_req: Request, res: Response) => {
  const bots = db.prepare('SELECT * FROM bots ORDER BY created_at DESC').all() as Record<string, unknown>[];
  res.json(bots.map(parseBot));
});

// GET /api/bots/:id
router.get('/:id', (req: Request, res: Response) => {
  const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  return res.json(parseBot(bot));
});

// POST /api/bots
router.post('/', (req: Request, res: Response) => {
  const { name, description, blocks, connections } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const result = db.prepare(`
    INSERT INTO bots (name, description, blocks_json, connections_json) VALUES (?, ?, ?, ?)
  `).run(
    name,
    description || null,
    JSON.stringify(blocks || []),
    JSON.stringify(connections || [])
  );

  const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>;
  return res.status(201).json(parseBot(bot));
});

// PUT /api/bots/:id
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, active, blocks, connections } = req.body;

  const existing = db.prepare('SELECT * FROM bots WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Bot not found' });

  db.prepare(`
    UPDATE bots SET name=?, description=?, active=?, blocks_json=?, connections_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(
    name,
    description || null,
    active ? 1 : 0,
    JSON.stringify(blocks || []),
    JSON.stringify(connections || []),
    id
  );

  const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(id) as Record<string, unknown>;
  return res.json(parseBot(bot));
});

// DELETE /api/bots/:id
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM bots WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Bot not found' });

  db.prepare('DELETE FROM bots WHERE id = ?').run(id);
  return res.json({ success: true });
});

// POST /api/bots/:id/toggle
router.post('/:id/toggle', (req: Request, res: Response) => {
  const { id } = req.params;
  const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const newActive = bot.active === 1 ? 0 : 1;
  db.prepare('UPDATE bots SET active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(newActive, id);

  const updated = db.prepare('SELECT * FROM bots WHERE id = ?').get(id) as Record<string, unknown>;
  return res.json(parseBot(updated));
});

export default router;
