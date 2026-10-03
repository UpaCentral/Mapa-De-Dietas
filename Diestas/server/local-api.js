import { timingSafeEqual } from 'node:crypto';
import {
  defaultCompanions,
  defaultDietas,
  defaultStatus,
  defaultVias,
} from '../src/data.js';
import { createSessionToken, hashSessionToken } from './auth.js';

const sessionTtlMs = 8 * 60 * 60 * 1000;
const configDefaults = {
  acompanhante: defaultCompanions,
  dietas: defaultDietas,
  status: defaultStatus,
  vias: defaultVias,
};

function json(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });
}

function constantTimeEquals(left, right) {
  const leftBytes = Buffer.from(String(left));
  const rightBytes = Buffer.from(String(right));
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function parseBody(request) {
  return request.json().catch(() => null);
}

function patientValues(body, setorId, leitoId) {
  return [
    body.prontuario || '',
    body.nome || '',
    body.nascimento || null,
    body.idade || '',
    body.mae || '',
    body.acompanhante || '',
    body.justAcompanhante || '',
    body.via || '',
    body.dieta || '',
    body.restricao || '',
    body.alergias || '',
    body.obs || '',
    body.status || '',
    setorId,
    leitoId,
    body.internacao || null,
  ];
}

async function resolveLocation(pool, body) {
  const setorResult = body.setor
    ? await pool.query('SELECT id FROM setores WHERE nome = $1 LIMIT 1', [body.setor])
    : { rows: [] };
  const setorId = setorResult.rows[0]?.id ?? null;
  const leitoResult = body.leito
    ? await pool.query(
      'SELECT id FROM leitos WHERE nome = $1 AND ($2::bigint IS NULL OR setor_id = $2) LIMIT 1',
      [body.leito, setorId],
    )
    : { rows: [] };
  return { setorId, leitoId: leitoResult.rows[0]?.id ?? null };
}

export async function handleLocalApiRequest(request, { pool, username, password, allowedOrigins = [] }) {
  const origin = request.headers.get('origin') || '';
  const corsHeaders = origin && allowedOrigins.includes(origin)
    ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    }
    : {};

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const [resource, id] = new URL(request.url).pathname
      .replace(/^\/api\/?/, '')
      .split('/')
      .filter(Boolean)
      .map(decodeURIComponent);
    const method = request.method;

    if (resource === 'health' && method === 'GET') {
      await pool.query('SELECT 1');
      return json({ ok: true }, 200, corsHeaders);
    }

    if (resource === 'login' && method === 'POST') {
      const body = await parseBody(request);
      if (!body || !constantTimeEquals(String(body.username || '').trim().toLowerCase(), username.toLowerCase())
        || !constantTimeEquals(String(body.password || ''), password)) {
        return json({ error: 'Usuário ou senha incorretos.' }, 401, corsHeaders);
      }

      const token = createSessionToken();
      const expiresAt = new Date(Date.now() + sessionTtlMs).toISOString();
      await pool.query('DELETE FROM sessoes WHERE expires_at <= NOW()');
      await pool.query(
        'INSERT INTO sessoes (token_hash, username, expires_at) VALUES ($1, $2, $3)',
        [await hashSessionToken(token), username, expiresAt],
      );
      return json({ token, username }, 200, corsHeaders);
    }

    const authorization = request.headers.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) return json({ error: 'Sessão inválida ou expirada.' }, 401, corsHeaders);
    const sessionResult = await pool.query(
      'SELECT token_hash, username FROM sessoes WHERE token_hash = $1 AND expires_at > NOW() LIMIT 1',
      [await hashSessionToken(token)],
    );
    const session = sessionResult.rows[0];
    if (!session) return json({ error: 'Sessão inválida ou expirada.' }, 401, corsHeaders);

    if (resource === 'session' && method === 'GET') {
      return json({ ok: true, username: session.username }, 200, corsHeaders);
    }
    if (resource === 'logout' && method === 'POST') {
      await pool.query('DELETE FROM sessoes WHERE token_hash = $1', [session.token_hash]);
      return json({ ok: true }, 200, corsHeaders);
    }
    if (resource === 'setores' && method === 'GET') {
      const result = await pool.query('SELECT id, nome FROM setores ORDER BY nome ASC');
      return json(result.rows, 200, corsHeaders);
    }
    if (resource === 'leitos' && method === 'GET') {
      const result = await pool.query('SELECT id, setor_id, nome FROM leitos ORDER BY nome ASC');
      return json(result.rows, 200, corsHeaders);
    }
    if (resource === 'config' && id && Object.hasOwn(configDefaults, id)) {
      if (method === 'GET') {
        const result = await pool.query('SELECT valor FROM configuracoes WHERE chave = $1 ORDER BY valor ASC', [id]);
        return json(result.rows.map((row) => row.valor), 200, corsHeaders);
      }
      if (method === 'POST') {
        const body = await parseBody(request);
        const values = [...new Set((Array.isArray(body) ? body : []).filter(Boolean).map(String))];
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('DELETE FROM configuracoes WHERE chave = $1', [id]);
          if (values.length) {
            const placeholders = values.map((_, index) => `($1, $${index + 2})`).join(', ');
            await client.query(
              `INSERT INTO configuracoes (chave, valor) VALUES ${placeholders} ON CONFLICT (chave, valor) DO NOTHING`,
              [id, ...values],
            );
          }
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
        return json({ ok: true, values }, 200, corsHeaders);
      }
    }
    if (resource === 'pacientes') {
      if (method === 'GET' && !id) {
        const result = await pool.query(`
          SELECT p.id, p.prontuario, p.nome, p.idade, p.mae, p.acompanhante, p.via, p.dieta,
            p.restricao, p.alergias, p.data_nascimento AS nascimento, p.data_internacao AS internacao,
            p.horario_refeicao AS status, p.observacoes AS obs,
            p.justificativa_acompanhante AS "justAcompanhante", s.nome AS setor, l.nome AS leito
          FROM pacientes p
          LEFT JOIN setores s ON s.id = p.setor_id
          LEFT JOIN leitos l ON l.id = p.leito_id
          ORDER BY p.updated_at DESC
        `);
        return json(result.rows, 200, corsHeaders);
      }
      if (method === 'POST' && !id) {
        const body = await parseBody(request);
        if (!body || typeof body.nome !== 'string' || !body.nome.trim()) {
          return json({ error: 'Informe o nome do paciente.' }, 400, corsHeaders);
        }
        const { setorId, leitoId } = await resolveLocation(pool, body);
        const values = patientValues(body, setorId, leitoId);
        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
        const result = await pool.query(`
          INSERT INTO pacientes (
            prontuario, nome, data_nascimento, idade, mae, acompanhante, justificativa_acompanhante,
            via, dieta, restricao, alergias, observacoes, horario_refeicao, setor_id, leito_id, data_internacao
          ) VALUES (${placeholders}) RETURNING id
        `, values);
        return json({ ok: true, id: result.rows[0].id }, 201, corsHeaders);
      }
      if (id && method === 'PUT') {
        const body = await parseBody(request);
        if (!body || typeof body.nome !== 'string' || !body.nome.trim()) {
          return json({ error: 'Informe o nome do paciente.' }, 400, corsHeaders);
        }
        const { setorId, leitoId } = await resolveLocation(pool, body);
        const values = patientValues(body, setorId, leitoId);
        await pool.query(`
          UPDATE pacientes SET
            prontuario = $1, nome = $2, data_nascimento = $3, idade = $4, mae = $5,
            acompanhante = $6, justificativa_acompanhante = $7, via = $8, dieta = $9,
            restricao = $10, alergias = $11, observacoes = $12, horario_refeicao = $13,
            setor_id = $14, leito_id = $15, data_internacao = $16, updated_at = NOW()
          WHERE id = $17
        `, [...values, id]);
        return json({ ok: true }, 200, corsHeaders);
      }
      if (id && method === 'DELETE') {
        await pool.query('DELETE FROM pacientes WHERE id = $1', [id]);
        return json({ ok: true }, 200, corsHeaders);
      }
    }

    return json({ error: 'Rota não encontrada.' }, 404, corsHeaders);
  } catch (error) {
    console.error('Local diet API request failed:', error);
    return json({ error: 'Erro interno na API local.' }, 500, corsHeaders);
  }
}