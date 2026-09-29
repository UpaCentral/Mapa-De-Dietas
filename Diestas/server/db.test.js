import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { initDatabase } from './db.js';

test('deve inicializar o banco e criar as tabelas principais', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'dieta-db-test-'));
  const db = await initDatabase(path.join(directory, 'Dieta.test.db'));

  try {
    const rows = await db.all("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
    const nomes = rows.map((row) => row.name);
    assert.ok(nomes.includes('setores'));
    assert.ok(nomes.includes('leitos'));
    assert.ok(nomes.includes('pacientes'));
  } finally {
    await db.close();
    await rm(directory, { recursive: true, force: true });
  }

});
