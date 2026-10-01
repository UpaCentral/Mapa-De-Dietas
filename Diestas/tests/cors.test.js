import test from "node:test";
import assert from "node:assert/strict";

import { corsHeaders } from "../netlify/functions/cors.js";

test("allows the Cloudflare production frontend", () => {
  const headers = corsHeaders("https://mapa-de-dietas.tiupacentral.workers.dev");

  assert.equal(headers["Access-Control-Allow-Origin"], "https://mapa-de-dietas.tiupacentral.workers.dev");
  assert.match(headers["Access-Control-Allow-Headers"], /Authorization/);
});

test("rejects unknown origins and permits local development", () => {
  assert.equal(corsHeaders("https://attacker.example"), null);
  assert.equal(corsHeaders("http://localhost:5173")["Access-Control-Allow-Origin"], "http://localhost:5173");
  assert.equal(corsHeaders(null), null);
});