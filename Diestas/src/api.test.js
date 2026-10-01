import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveApiBase } from './api.js';

test('defaults to the same-origin API route for Netlify', () => {
  assert.equal(resolveApiBase(), '/api');
});

test('uses the configured Netlify backend URL for Cloudflare builds', () => {
  assert.equal(resolveApiBase('https://upadieta.netlify.app/api/'), 'https://upadieta.netlify.app/api');
});
