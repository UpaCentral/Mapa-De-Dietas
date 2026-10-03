import test from 'node:test';
import assert from 'node:assert/strict';

import { handleLocalApiRequest } from '../server/local-api.js';

const allowedOrigin = 'https://mapa-de-dietas.tiupacentral.workers.dev';
const credentials = {
  username: 'UPADieta',
  password: 'Use-uma-senha-forte-aqui',
  allowedOrigins: [allowedOrigin],
};

test('responds to allowed preflight requests without reaching PostgreSQL', async () => {
  const response = await handleLocalApiRequest(new Request('https://api-dieta.upacentral.co.uk/api/pacientes', {
    method: 'OPTIONS',
    headers: { Origin: allowedOrigin },
  }), { ...credentials, pool: { query: () => assert.fail('Preflight must not query PostgreSQL') } });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), allowedOrigin);
  assert.match(response.headers.get('Access-Control-Allow-Methods'), /PUT/);
});

test('does not allow browser origins outside the configured allowlist', async () => {
  const response = await handleLocalApiRequest(new Request('https://api-dieta.upacentral.co.uk/api/login', {
    method: 'OPTIONS',
    headers: { Origin: 'https://other-site.example' },
  }), { ...credentials, pool: { query: () => assert.fail('Preflight must not query PostgreSQL') } });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
});

test('rejects invalid login credentials without touching the database', async () => {
  const response = await handleLocalApiRequest(new Request('https://api-dieta.upacentral.co.uk/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: allowedOrigin },
    body: JSON.stringify({ username: 'wrong', password: 'wrong' }),
  }), { ...credentials, pool: { query: () => assert.fail('Invalid credentials must not create a session') } });

  assert.equal(response.status, 401);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), allowedOrigin);
});

test('creates a hashed database session for valid login credentials', async () => {
  const statements = [];
  const pool = {
    query: async (statement, values) => {
      statements.push({ statement, values });
      return { rows: [] };
    },
  };
  const response = await handleLocalApiRequest(new Request('https://api-dieta.upacentral.co.uk/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: allowedOrigin },
    body: JSON.stringify(credentials),
  }), { ...credentials, pool });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.username, credentials.username);
  assert.equal(body.token.length, 64);
  assert.equal(statements.length, 2);
  assert.match(statements[1].statement, /INSERT INTO sessoes/);
  assert.notEqual(statements[1].values[0], body.token);
});