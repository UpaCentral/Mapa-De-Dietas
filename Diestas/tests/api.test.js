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