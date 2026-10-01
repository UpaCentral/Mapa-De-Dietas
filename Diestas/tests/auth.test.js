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

test("accepts the default user credentials used in production with whitespace-safe input", async () => {
  const credential = {
    salt: "FDdQFTEzE1QuwfgKbMNnqg==",
    passwordHash: "61174de7664891114dbfb4648777ded9f76c8bce27eefebb32142652730d6a9e88de2d1f3d828e3e58e8b5706cccdfa51dd42559defc8d608b141e6ebc7125b4",
  };

  assert.equal(await verifyPassword("Upa@2026", credential), true);
  assert.equal(await verifyPassword(" Upa@2026 ", credential), true);
  assert.equal(await verifyPassword("Upa@2027", credential), false);
});