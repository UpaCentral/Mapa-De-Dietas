import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../worker.js';

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

test('logs in and loads default app data without a configured D1 database', async () => {
  const loginResponse = await worker.fetch(new Request('https://example.workers.dev/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'UPADieta', password: 'Upa@2026' }),
  }), {
    ASSETS: { fetch: () => { throw new Error('API request was sent to assets'); } },
  });

  assert.equal(loginResponse.status, 200);
  const loginBody = await loginResponse.json();
  assert.equal(loginBody.username, 'UPADieta');
  assert.ok(loginBody.token);

  const sessionResponse = await worker.fetch(new Request('https://example.workers.dev/api/session', {
    headers: { Authorization: `Bearer ${loginBody.token}` },
  }), {
    ASSETS: { fetch: () => { throw new Error('API request was sent to assets'); } },
  });

  assert.equal(sessionResponse.status, 200);

  const dietasResponse = await worker.fetch(new Request('https://example.workers.dev/api/config/dietas', {
    headers: { Authorization: `Bearer ${loginBody.token}` },
  }), {
    ASSETS: { fetch: () => { throw new Error('API request was sent to assets'); } },
  });

  assert.equal(dietasResponse.status, 200);
  assert.ok((await dietasResponse.json()).length > 0);
});