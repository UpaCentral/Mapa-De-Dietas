import test from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";

import { createSessionToken, hashSessionToken, verifyPassword } from "../netlify/functions/auth.js";

test("session tokens are random and stored as one-way hashes", () => {
  const firstToken = createSessionToken();
  const secondToken = createSessionToken();

  assert.notEqual(firstToken, secondToken);
  assert.equal(firstToken.length, 64);
  assert.equal(hashSessionToken(firstToken).length, 64);
  assert.notEqual(hashSessionToken(firstToken), firstToken);
});

test("password verification accepts only the matching scrypt credential", async () => {
  const salt = "test-salt";
  const passwordHash = scryptSync("correct horse", salt, 64).toString("hex");
  const credential = { salt, passwordHash };

  assert.equal(await verifyPassword("correct horse", credential), true);
  assert.equal(await verifyPassword("wrong password", credential), false);
  assert.equal(await verifyPassword(undefined, credential), false);
});