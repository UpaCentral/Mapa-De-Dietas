import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../worker.js';
import { hashPassword } from '../server/auth.js';

test('routes API preflight requests to the Worker API without external CORS', async () => {
  const response = await worker.fetch(new Request('https://example.workers.dev/api/login', { method: 'OPTIONS' }), {
    ASSETS: { fetch: () => { throw new Error('API request was sent to assets'); } },
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
});

test('serves non-API requests through Cloudflare static assets', async () => {
  const expected = new Response('app shell');
  const response = await worker.fetch(new Request('https://example.workers.dev/'), {
    ASSETS: { fetch: () => expected },
  });

  assert.equal(response, expected);
});

test('uses the in-memory API only outside production when given test credentials', async () => {
  const salt = 'dGVzdC1zYWx0';
  const env = {
    DIETA_USERNAME: 'test-user',
    DIETA_PASSWORD_SALT: salt,
    DIETA_PASSWORD_HASH: await hashPassword('test-password', salt),
  };
  const loginResponse = await worker.fetch(new Request('https://example.workers.dev/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test-user', password: 'test-password' }),
  }), env);

  assert.equal(loginResponse.status, 200);
  const loginBody = await loginResponse.json();
  assert.equal(loginBody.username, 'test-user');
  assert.ok(loginBody.token);

  const sessionResponse = await worker.fetch(new Request('https://example.workers.dev/api/session', {
    headers: { Authorization: `Bearer ${loginBody.token}` },
  }), env);

  assert.equal(sessionResponse.status, 200);

  const dietasResponse = await worker.fetch(new Request('https://example.workers.dev/api/config/dietas', {
    headers: { Authorization: `Bearer ${loginBody.token}` },
  }), env);

  assert.equal(dietasResponse.status, 200);
  assert.ok((await dietasResponse.json()).length > 0);
});

test('does not use the in-memory fallback in production when D1 is unavailable', async () => {
  const response = await worker.fetch(new Request('https://example.workers.dev/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'any-user', password: 'any-password' }),
  }), { APP_ENV: 'production' });

  assert.equal(response.status, 503);
});