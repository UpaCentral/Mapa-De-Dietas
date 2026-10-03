import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveApiBase } from './api.js';

test('uses the same-origin Cloudflare Worker API route', () => {
  assert.equal(resolveApiBase(), '/api');
});
