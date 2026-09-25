import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveApiBase } from './api.js';

test('uses localhost while running locally', () => {
  assert.equal(resolveApiBase({ hostname: 'localhost' }), 'http://localhost:3001/api');
});

test('uses Cloudflare API host for production domain', () => {
  assert.equal(resolveApiBase({ hostname: 'dieta.upacentral.co.uk', protocol: 'https:' }), 'https://api.dieta.upacentral.co.uk/api');
});

test('keeps API host when already on API subdomain', () => {
  assert.equal(resolveApiBase({ hostname: 'api.dieta.upacentral.co.uk', protocol: 'https:' }), 'https://api.dieta.upacentral.co.uk/api');
});
