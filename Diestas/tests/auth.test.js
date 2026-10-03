import test from "node:test";
import assert from "node:assert/strict";

import { createSessionToken, hashPassword, hashSessionToken, verifyPassword } from "../server/auth.js";

test("session tokens are random and stored as one-way hashes", async () => {
  const firstToken = createSessionToken();
  const secondToken = createSessionToken();

  assert.notEqual(firstToken, secondToken);
  assert.equal(firstToken.length, 64);
  const firstHash = await hashSessionToken(firstToken);
  assert.equal(firstHash.length, 64);
  assert.notEqual(firstHash, firstToken);
});

test("password verification accepts only the matching PBKDF2 credential", async () => {
  const salt = "dGVzdC1zYWx0";
  const passwordHash = await hashPassword("correct horse", salt, 1000);
  const credential = { salt, passwordHash, iterations: 1000 };

  assert.equal(await verifyPassword("correct horse", credential), true);
  assert.equal(await verifyPassword("wrong password", credential), false);
  assert.equal(await verifyPassword(undefined, credential), false);
});

test("accepts the default user credentials used in production with whitespace-safe input", async () => {
  const credential = {
    salt: "FDdQFTEzE1QuwfgKbMNnqg==",
    passwordHash: "0fe7c25dc2ff0d6ea7ee3d08783cbe76eb110da31bc894f63e6e5ba789597934",
  };

  assert.equal(await verifyPassword("Upa@2026", credential), true);
  assert.equal(await verifyPassword(" Upa@2026 ", credential), true);
  assert.equal(await verifyPassword("Upa@2027", credential), false);
});