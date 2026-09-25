import test from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase } from './db.js';

test('deve inicializar o banco e criar as tabelas principais', async () => {
  const db = await initDatabase();
  const rows = await db.all("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");

  const nomes = rows.map((row) => row.name);
  assert.ok(nomes.includes('setores'));
  assert.ok(nomes.includes('leitos'));
  assert.ok(nomes.includes('pacientes'));

  await db.close();
});
