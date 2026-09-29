import test from 'node:test';
import assert from 'node:assert/strict';
import { scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { createSession, getSession, revokeSession, verifyPassword } from './auth.js';

const scrypt = promisify(scryptCallback);

test('valida a senha pelo hash scrypt sem armazenar senha em texto', async () => {
  const salt = 'test-salt';
  const passwordHash = (await scrypt('correct horse', salt, 64)).toString('hex');
  const credential = { salt, passwordHash };

  assert.equal(await verifyPassword('correct horse', credential), true);
  assert.equal(await verifyPassword('wrong password', credential), false);
});

test('cria e revoga uma sessão de usuário', () => {
  const token = createSession('UPADieta');

  assert.equal(getSession(token)?.username, 'UPADieta');
  revokeSession(token);
  assert.equal(getSession(token), null);
});
