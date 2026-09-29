import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveApiBase } from './api.js';

test('uses the same-origin API route for Netlify and local previews', () => {
  assert.equal(resolveApiBase(), '/api');
});
