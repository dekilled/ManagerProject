import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data/manager.db');

import fs from 'fs';
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 0,
      min_quantity INTEGER NOT NULL DEFAULT 5,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('entrada', 'saida')),
      quantity INTEGER NOT NULL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      active INTEGER DEFAULT 0,
      blocks_json TEXT DEFAULT '[]',
      connections_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedData();
}

function seedData() {
  const productCount = (db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }).count;
  if (productCount > 0) return;

  // Insert products
  const insertProduct = db.prepare(`
    INSERT INTO products (name, sku, category, price, description) VALUES (?, ?, ?, ?, ?)
  `);

  const products = [
    ['Notebook Dell Inspiron 15', 'NOTE-DELL-001', 'Computadores', 3499.99, 'Notebook Dell Inspiron 15, Intel Core i5, 8GB RAM, 512GB SSD'],
    ['Mouse Logitech MX Master 3', 'MOUS-LOG-001', 'Periféricos', 349.90, 'Mouse sem fio avançado com rolagem MagSpeed'],
    ['Teclado Mecânico Redragon', 'TECL-RED-001', 'Periféricos', 289.90, 'Teclado mecânico RGB com switches Blue'],
    ['Monitor Samsung 24" FHD', 'MONI-SAM-001', 'Monitores', 1199.90, 'Monitor 24 polegadas Full HD 75Hz IPS'],
    ['Headset Sony WH-1000XM5', 'HEAD-SON-001', 'Áudio', 1899.90, 'Headset com cancelamento de ruído ativo premium'],
  ];

  const insertInventory = db.prepare(`
    INSERT INTO inventory (product_id, quantity, min_quantity) VALUES (?, ?, ?)
  `);

  const insertMovement = db.prepare(`
    INSERT INTO inventory_movements (product_id, type, quantity, reason) VALUES (?, ?, ?, ?)
  `);

  const seedTransaction = db.transaction(() => {
    const productIds: number[] = [];
    for (const p of products) {
      const result = insertProduct.run(...p);
      productIds.push(result.lastInsertRowid as number);
    }

    const inventoryData = [
      [productIds[0], 15, 5],
      [productIds[1], 42, 10],
      [productIds[2], 3, 8],  // Low stock
      [productIds[3], 7, 5],
      [productIds[4], 2, 5],  // Low stock
    ];

    for (const [pid, qty, minQty] of inventoryData) {
      insertInventory.run(pid, qty, minQty);
      insertMovement.run(pid, 'entrada', qty, 'Estoque inicial');
    }

    // Extra movements
    insertMovement.run(productIds[0], 'saida', 3, 'Venda #001');
    insertMovement.run(productIds[1], 'saida', 5, 'Venda #002');
    insertMovement.run(productIds[2], 'saida', 10, 'Venda #003');

    // Customers
    const insertCustomer = db.prepare(`
      INSERT INTO customers (name, email, phone, notes) VALUES (?, ?, ?, ?)
    `);
    insertCustomer.run('João Silva', 'joao.silva@email.com', '(11) 99999-1111', 'Cliente VIP, prefere contato por WhatsApp');
    insertCustomer.run('Maria Santos', 'maria.santos@email.com', '(21) 98888-2222', 'Comprou notebook em Janeiro/2024');
    insertCustomer.run('Carlos Oliveira', 'carlos@empresa.com.br', '(31) 97777-3333', 'Responsável de TI da Empresa XYZ');

    // Sample Bot
    const sampleBlocks = JSON.stringify([
      {
        id: 'block-start',
        type: 'start',
        position: { x: 300, y: 50 },
        config: {}
      },
      {
        id: 'block-welcome',
        type: 'message',
        position: { x: 300, y: 180 },
        config: { text: 'Olá! Bem-vindo ao atendimento da ManagerStore. Como posso ajudar você hoje?' }
      },
      {
        id: 'block-menu',
        type: 'menu',
        position: { x: 300, y: 320 },
        config: {
          text: 'Escolha uma opção:',
          options: ['Consultar produto', 'Suporte técnico', 'Falar com atendente']
        }
      },
      {
        id: 'block-product',
        type: 'question',
        position: { x: 80, y: 480 },
        config: { text: 'Qual produto você deseja consultar?', variableName: 'produto' }
      },
      {
        id: 'block-stock-check',
        type: 'action',
        position: { x: 80, y: 620 },
        config: { actionType: 'check_stock' }
      },
      {
        id: 'block-support',
        type: 'question',
        position: { x: 350, y: 480 },
        config: { text: 'Descreva seu problema técnico:', variableName: 'problema' }
      },
      {
        id: 'block-ticket',
        type: 'action',
        position: { x: 350, y: 620 },
        config: { actionType: 'create_ticket' }
      },
      {
        id: 'block-human',
        type: 'message',
        position: { x: 620, y: 480 },
        config: { text: 'Transferindo para um atendente humano. Aguarde um momento...' }
      },
      {
        id: 'block-end',
        type: 'end',
        position: { x: 300, y: 760 },
        config: { message: 'Obrigado pelo contato! Tenha um ótimo dia!' }
      }
    ]);

    const sampleConnections = JSON.stringify([
      { id: 'conn-1', fromBlockId: 'block-start', fromOutput: 'default', toBlockId: 'block-welcome' },
      { id: 'conn-2', fromBlockId: 'block-welcome', fromOutput: 'default', toBlockId: 'block-menu' },
      { id: 'conn-3', fromBlockId: 'block-menu', fromOutput: '0', toBlockId: 'block-product' },
      { id: 'conn-4', fromBlockId: 'block-menu', fromOutput: '1', toBlockId: 'block-support' },
      { id: 'conn-5', fromBlockId: 'block-menu', fromOutput: '2', toBlockId: 'block-human' },
      { id: 'conn-6', fromBlockId: 'block-product', fromOutput: 'default', toBlockId: 'block-stock-check' },
      { id: 'conn-7', fromBlockId: 'block-support', fromOutput: 'default', toBlockId: 'block-ticket' },
      { id: 'conn-8', fromBlockId: 'block-stock-check', fromOutput: 'default', toBlockId: 'block-end' },
      { id: 'conn-9', fromBlockId: 'block-ticket', fromOutput: 'default', toBlockId: 'block-end' },
      { id: 'conn-10', fromBlockId: 'block-human', fromOutput: 'default', toBlockId: 'block-end' },
    ]);

    db.prepare(`
      INSERT INTO bots (name, description, active, blocks_json, connections_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'Bot Atendimento Principal',
      'Bot principal de atendimento ao cliente com menu de opções',
      1,
      sampleBlocks,
      sampleConnections
    );
  });

  seedTransaction();
}

export default db;
