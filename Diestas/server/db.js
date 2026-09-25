import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'Dieta.db');

export async function initDatabase() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS setores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS leitos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setor_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      UNIQUE(setor_id, nome),
      FOREIGN KEY (setor_id) REFERENCES setores(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chave TEXT NOT NULL,
      valor TEXT NOT NULL,
      UNIQUE(chave, valor)
    );

    CREATE TABLE IF NOT EXISTS pacientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prontuario TEXT,
      nome TEXT NOT NULL,
      data_nascimento TEXT,
      idade TEXT,
      mae TEXT,
      acompanhante TEXT,
      justificativa_acompanhante TEXT,
      via TEXT,
      dieta TEXT,
      restricao TEXT,
      alergias TEXT,
      observacoes TEXT,
      horario_refeicao TEXT,
      setor_id INTEGER,
      leito_id INTEGER,
      data_internacao TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (setor_id) REFERENCES setores(id),
      FOREIGN KEY (leito_id) REFERENCES leitos(id)
    );
  `);

  await seedDefaults(db);

  return db;
}

async function seedDefaults(db) {
  const setorSeed = [
    'Sala vermelha',
    'Sala de Sutura',
    'Sala do respiratorio',
    'Sala Pediatria',
    'Sala Amarela feminina',
    'Sala Amarela masculina',
    'Sala Psiquiatria',
    'Sala verde',
    'Isolamento',
    'Sala de Aplicacao',
  ];

  for (const nome of setorSeed) {
    await db.run(`INSERT OR IGNORE INTO setores (nome) VALUES (?)`, [nome]);
  }

  const seedMap = {
    dietas: ['Livre', 'Branda', 'Pastosa', 'Liquida', 'Liquida restrita', 'Zero Lactose', 'HAS', 'DM', 'DRC', 'Mamadeira', 'Neutropenica', 'Enteral', 'Parenteral', 'NPO'],
    status: ['Café da manhã', 'Almoço', 'Lanche da tarde', 'Jantar', 'Ceia'],
    vias: ['Oral', 'Sonda', 'Parenteral', 'Nao se aplica'],
    acompanhante: ['Nao', 'Sim'],
  };

  for (const [chave, valores] of Object.entries(seedMap)) {
    for (const valor of valores) {
      await db.run(`INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?, ?)`, [chave, valor]);
    }
  }

  const setorRows = await db.all(`SELECT id, nome FROM setores`);
  for (const setor of setorRows) {
    const baseLeitos = [
      `${setor.nome} - Leito 01`,
      `${setor.nome} - Leito 02`,
      `${setor.nome} - Leito 03`,
    ];

    for (const nome of baseLeitos) {
      await db.run(`INSERT OR IGNORE INTO leitos (setor_id, nome) VALUES (?, ?)`, [setor.id, nome]);
    }
  }
}

export async function getSettings(db, key) {
  const rows = await db.all(`SELECT valor FROM configuracoes WHERE chave = ? ORDER BY valor`, [key]);
  return rows.map((row) => row.valor);
}

export async function setSettings(db, key, values) {
  await db.run(`DELETE FROM configuracoes WHERE chave = ?`, [key]);
  for (const value of values) {
    if (!value) continue;
    await db.run(`INSERT INTO configuracoes (chave, valor) VALUES (?, ?)`, [key, value]);
  }
}
