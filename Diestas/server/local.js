import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import {
  defaultCompanions,
  defaultDietas,
  defaultLeitos,
  defaultSetores,
  defaultStatus,
  defaultVias,
} from '../src/data.js';
import { handleLocalApiRequest } from './local-api.js';

const required = ['DATABASE_URL', 'DIETA_USERNAME', 'DIETA_PASSWORD'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Configure as variáveis obrigatórias: ${missing.join(', ')}`);

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initializeDatabase() {
  const schema = await readFile(new URL('./local-schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);

  for (const name of defaultSetores) {
    await pool.query('INSERT INTO setores (nome) VALUES ($1) ON CONFLICT (nome) DO NOTHING', [name]);
  }
  for (const name of defaultLeitos) {
    const separator = name.indexOf(' - ');
    const setor = separator < 0 ? name : name.slice(0, separator);
    const setorResult = await pool.query('SELECT id FROM setores WHERE nome = $1 LIMIT 1', [setor]);
    if (setorResult.rows[0]) {
      await pool.query(
        'INSERT INTO leitos (setor_id, nome) VALUES ($1, $2) ON CONFLICT (setor_id, nome) DO NOTHING',
        [setorResult.rows[0].id, name],
      );
    }
  }
  const configurations = {
    acompanhante: defaultCompanions,
    dietas: defaultDietas,
    status: defaultStatus,
    vias: defaultVias,
  };
  for (const [key, values] of Object.entries(configurations)) {
    for (const value of values) {
      await pool.query(
        'INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave, valor) DO NOTHING',
        [key, value],
      );
    }
  }
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(new Error('Request body too large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

await initializeDatabase();

const server = createServer(async (incoming, outgoing) => {
  try {
    const body = ['GET', 'HEAD'].includes(incoming.method) ? undefined : await readRequestBody(incoming);
    const headers = new Headers();
    for (const name of ['authorization', 'content-type', 'origin']) {
      const value = incoming.headers[name];
      if (typeof value === 'string') headers.set(name, value);
    }
    const request = new Request(`http://${incoming.headers.host || 'localhost'}${incoming.url}`, {
      method: incoming.method,
      headers,
      body,
    });
    const response = await handleLocalApiRequest(request, {
      pool,
      username: process.env.DIETA_USERNAME,
      password: process.env.DIETA_PASSWORD,
      allowedOrigins,
    });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('Local API server error:', error);
    if (!outgoing.headersSent) outgoing.writeHead(500, { 'Content-Type': 'application/json' });
    outgoing.end(JSON.stringify({ error: 'Erro interno na API local.' }));
  }
});

const port = Number(process.env.PORT || 8787);
server.listen(port, '0.0.0.0', () => {
  console.log(`Diet API listening on http://127.0.0.1:${port}`);
});

async function shutdown() {
  server.close();
  await pool.end();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);