import test from 'node:test';
import assert from 'node:assert/strict';

import { handleApiRequest } from '../server/api.js';
import { hashPassword } from '../server/auth.js';
import { resolveApiBase } from './api.js';

test('uses the same-origin Cloudflare Worker API route', () => {
  assert.equal(resolveApiBase(), '/api');
});

test('stores clinical module records through the shared authenticated Worker API', async () => {
  const salt = 'dGVzdC1zYWx0';
  const env = {
    DIETA_USERNAME: 'test-user',
    DIETA_PASSWORD_SALT: salt,
    DIETA_PASSWORD_HASH: await hashPassword('test-password', salt),
  };
  const login = await handleApiRequest(new Request('https://dieta.example/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test-user', password: 'test-password' }),
  }), env);
  const { token } = await login.json();
  const save = await handleApiRequest(new Request('https://dieta.example/api/modulos/sae-enfermagem', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ paciente: 'Paciente API', dados: { fields: [{ key: 'paciente', value: 'Paciente API' }] } }),
  }), env);
  const saved = await save.json();
  const list = await handleApiRequest(new Request('https://dieta.example/api/modulos/sae-enfermagem', {
    headers: { Authorization: `Bearer ${token}` },
  }), env);
  const records = await list.json();

  assert.equal(save.status, 201);
  assert.equal(list.status, 200);
  assert.ok(records.some((record) => record.id === saved.id && record.paciente === 'Paciente API'));
});
