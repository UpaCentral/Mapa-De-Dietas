import { and, asc, desc, eq, gt, lte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { configuracoes, leitos, pacientes, registrosModulos, sessoes, setores } from '../db/schema.ts';
import {
  defaultCompanions,
  defaultDietas,
  defaultLeitos,
  defaultSetores,
  defaultStatus,
  defaultVias,
} from '../src/data.js';
import { createSessionToken, hashSessionToken, verifyPassword } from './auth.js';

const sessionTtlMs = 8 * 60 * 60 * 1000;
const moduleNames = new Set(['cabec-paciente', 'processo-enfermagem', 'sae-enfermagem']);

const fallbackState = {
  sessions: new Map(),
  config: {
    setores: [...defaultSetores],
    leitos: [...defaultLeitos],
    status: [...defaultStatus],
    acompanhante: [...defaultCompanions],
    dietas: [...defaultDietas],
    vias: [...defaultVias],
  },
  pacientes: [],
  registros: [],
  nextRegistroId: 1,
};

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function isModuleRecord(body) {
  return typeof body?.paciente === 'string' && Boolean(body.paciente.trim())
    && body.dados && typeof body.dados === 'object' && !Array.isArray(body.dados);
}

function getLoginCredential(env) {
  const username = typeof env?.DIETA_USERNAME === 'string' ? env.DIETA_USERNAME.trim() : '';
  const salt = typeof env?.DIETA_PASSWORD_SALT === 'string' ? env.DIETA_PASSWORD_SALT : '';
  const passwordHash = typeof env?.DIETA_PASSWORD_HASH === 'string' ? env.DIETA_PASSWORD_HASH : '';
  return username && salt && passwordHash ? { username, salt, passwordHash } : null;
}

async function getFallbackSession(request) {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return null;

  const tokenHash = await hashSessionToken(token);
  const session = fallbackState.sessions.get(tokenHash);
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    fallbackState.sessions.delete(tokenHash);
    return null;
  }

  return { tokenHash, username: session.username };
}

async function handleFallbackRequest(request, env) {
  const [recurso, id, recordId] = new URL(request.url).pathname
    .replace(/^\/api\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);
  const method = request.method;

  if (recurso === 'health' && method === 'GET') {
    return json({ ok: true });
  }

  if (recurso === 'login' && method === 'POST') {
    const credential = getLoginCredential(env);
    if (!credential) return json({ error: 'Autenticação não configurada.' }, 503);
    const body = await request.json().catch(() => null);
    const normalizedUsername = typeof body?.username === 'string' ? body.username.trim() : '';
    const passwordMatches = await verifyPassword(typeof body?.password === 'string' ? body.password : '', credential);
    if (normalizedUsername.toLowerCase() !== credential.username.toLowerCase() || !passwordMatches) {
      return json({ error: 'Usuário ou senha incorretos.' }, 401);
    }

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + sessionTtlMs).toISOString();
    const tokenHash = await hashSessionToken(token);
    fallbackState.sessions.set(tokenHash, { username: credential.username, expiresAt });
    return json({ token, username: credential.username });
  }

  const session = await getFallbackSession(request);
  if (!session) return json({ error: 'Sessão inválida ou expirada.' }, 401);

  if (recurso === 'session' && method === 'GET') {
    return json({ ok: true, username: session.username });
  }

  if (recurso === 'logout' && method === 'POST') {
    fallbackState.sessions.delete(session.tokenHash);
    return json({ ok: true });
  }

  if (recurso === 'modulos' && id && moduleNames.has(id)) {
    if (method === 'GET' && !recordId) {
      return json(fallbackState.registros
        .filter((record) => record.modulo === id)
        .sort((first, second) => second.updated_at.localeCompare(first.updated_at)));
    }
    if (method === 'POST' && !recordId) {
      const body = await request.json().catch(() => null);
      if (!isModuleRecord(body)) return json({ error: 'Informe o paciente e os dados do registro.' }, 400);
      if (JSON.stringify(body.dados).length > 500000) return json({ error: 'Registro excede o tamanho permitido.' }, 413);
      const timestamp = new Date().toISOString();
      const record = {
        id: fallbackState.nextRegistroId++,
        modulo: id,
        paciente: body.paciente.trim(),
        dados: body.dados,
        created_at: timestamp,
        updated_at: timestamp,
      };
      fallbackState.registros.push(record);
      return json({ ok: true, id: record.id }, 201);
    }
    if (recordId && method === 'PUT') {
      const body = await request.json().catch(() => null);
      if (!isModuleRecord(body)) return json({ error: 'Informe o paciente e os dados do registro.' }, 400);
      if (JSON.stringify(body.dados).length > 500000) return json({ error: 'Registro excede o tamanho permitido.' }, 413);
      const record = fallbackState.registros.find((item) => item.modulo === id && item.id === Number(recordId));
      if (!record) return json({ error: 'Registro não encontrado.' }, 404);
      record.paciente = body.paciente.trim();
      record.dados = body.dados;
      record.updated_at = new Date().toISOString();
      return json({ ok: true });
    }
    if (recordId && method === 'DELETE') {
      fallbackState.registros = fallbackState.registros.filter((record) => !(record.modulo === id && record.id === Number(recordId)));
      return json({ ok: true });
    }
  }

  if (recurso === 'setores' && method === 'GET') {
    return json(fallbackState.config.setores);
  }

  if (recurso === 'leitos' && method === 'GET') {
    return json(fallbackState.config.leitos.map((nome) => ({ id: Math.random(), setor_id: null, nome })));
  }

  if (recurso === 'config' && id) {
    if (method === 'GET') {
      return json(fallbackState.config[id] || []);
    }
    if (method === 'POST') {
      const body = await request.json().catch(() => null);
      const values = [...new Set((Array.isArray(body) ? body : []).filter(Boolean).map(String))];
      fallbackState.config[id] = values;
      return json({ ok: true, values });
    }
  }

  if (recurso === 'pacientes') {
    if (method === 'GET' && !id) return json(fallbackState.pacientes);
    if (method === 'POST' && !id) {
      const body = await request.json().catch(() => ({}));
      const paciente = { id: Date.now(), ...body };
      fallbackState.pacientes.unshift(paciente);
      return json({ ok: true, id: paciente.id }, 201);
    }
    if (id && method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      const index = fallbackState.pacientes.findIndex((item) => item.id === Number(id));
      if (index >= 0) fallbackState.pacientes[index] = { ...fallbackState.pacientes[index], ...body };
      return json({ ok: true });
    }
    if (id && method === 'DELETE') {
      fallbackState.pacientes = fallbackState.pacientes.filter((item) => item.id !== Number(id));
      return json({ ok: true });
    }
  }

  return json({ error: 'Rota não encontrada.' }, 404);
}

async function getSession(request, db) {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return null;

  const tokenHash = await hashSessionToken(token);
  const [session] = await db
    .select({ tokenHash: sessoes.tokenHash, username: sessoes.username })
    .from(sessoes)
    .where(and(eq(sessoes.tokenHash, tokenHash), gt(sessoes.expiresAt, new Date().toISOString())))
    .limit(1);
  return session || null;
}

async function dadosPaciente(body, db) {
  const [setor] = body.setor
    ? await db.select({ id: setores.id }).from(setores).where(eq(setores.nome, body.setor))
    : [];
  const [leito] = body.leito
    ? await db.select({ id: leitos.id }).from(leitos).where(eq(leitos.nome, body.leito))
    : [];

  return {
    prontuario: body.prontuario || '',
    nome: body.nome || '',
    dataNascimento: body.nascimento || null,
    idade: body.idade || '',
    mae: body.mae || '',
    acompanhante: body.acompanhante || '',
    justificativaAcompanhante: body.justAcompanhante || '',
    via: body.via || '',
    dieta: body.dieta || '',
    restricao: body.restricao || '',
    alergias: body.alergias || '',
    observacoes: body.obs || '',
    horarioRefeicao: body.status || '',
    setorId: setor ? setor.id : null,
    leitoId: leito ? leito.id : null,
    dataInternacao: body.internacao || null,
    updatedAt: new Date().toISOString(),
  };
}

async function listarPacientes(db) {
  const rows = await db
    .select({ paciente: pacientes, setorNome: setores.nome, leitoNome: leitos.nome })
    .from(pacientes)
    .leftJoin(setores, eq(setores.id, pacientes.setorId))
    .leftJoin(leitos, eq(leitos.id, pacientes.leitoId))
    .orderBy(desc(pacientes.updatedAt));

  return rows.map(({ paciente: p, setorNome, leitoNome }) => ({
    id: p.id,
    prontuario: p.prontuario,
    nome: p.nome,
    idade: p.idade,
    mae: p.mae,
    acompanhante: p.acompanhante,
    via: p.via,
    dieta: p.dieta,
    restricao: p.restricao,
    alergias: p.alergias,
    leito: leitoNome || '',
    setor: setorNome || '',
    nascimento: p.dataNascimento,
    internacao: p.dataInternacao,
    status: p.horarioRefeicao,
    obs: p.observacoes,
    justAcompanhante: p.justificativaAcompanhante,
  }));
}

async function handle(request, env, db) {
  const [recurso, id, recordId] = new URL(request.url).pathname
    .replace(/^\/api\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);
  const method = request.method;

  if (recurso === 'health' && method === 'GET') {
    await db.select({ id: setores.id }).from(setores).limit(1);
    return json({ ok: true });
  }

  if (recurso === 'login' && method === 'POST') {
    const credential = getLoginCredential(env);
    if (!credential) return json({ error: 'Autenticação não configurada.' }, 503);
    const body = await request.json().catch(() => null);
    const normalizedUsername = typeof body?.username === 'string' ? body.username.trim() : '';
    const passwordMatches = await verifyPassword(typeof body?.password === 'string' ? body.password : '', credential);
    if (normalizedUsername.toLowerCase() !== credential.username.toLowerCase() || !passwordMatches) {
      return json({ error: 'Usuário ou senha incorretos.' }, 401);
    }

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + sessionTtlMs).toISOString();
    await db.delete(sessoes).where(lte(sessoes.expiresAt, new Date().toISOString()));
    await db.insert(sessoes).values({
      tokenHash: await hashSessionToken(token),
      username: credential.username,
      expiresAt,
    });
    return json({ token, username: credential.username });
  }

  const session = await getSession(request, db);
  if (!session) return json({ error: 'Sessão inválida ou expirada.' }, 401);

  if (recurso === 'session' && method === 'GET') {
    return json({ ok: true, username: session.username });
  }

  if (recurso === 'logout' && method === 'POST') {
    await db.delete(sessoes).where(eq(sessoes.tokenHash, session.tokenHash));
    return json({ ok: true });
  }

  if (recurso === 'modulos' && id && moduleNames.has(id)) {
    if (method === 'GET' && !recordId) {
      const rows = await db.select().from(registrosModulos)
        .where(eq(registrosModulos.modulo, id))
        .orderBy(desc(registrosModulos.updatedAt));
      return json(rows.map((record) => ({
        id: record.id,
        modulo: record.modulo,
        paciente: record.paciente,
        dados: JSON.parse(record.dados),
        created_at: record.createdAt,
        updated_at: record.updatedAt,
      })));
    }
    if (method === 'POST' && !recordId) {
      const body = await request.json().catch(() => null);
      if (!isModuleRecord(body)) return json({ error: 'Informe o paciente e os dados do registro.' }, 400);
      const serializedData = JSON.stringify(body.dados);
      if (serializedData.length > 500000) return json({ error: 'Registro excede o tamanho permitido.' }, 413);
      const [record] = await db.insert(registrosModulos).values({
        modulo: id,
        paciente: body.paciente.trim(),
        dados: serializedData,
      }).returning({ id: registrosModulos.id });
      return json({ ok: true, id: record.id }, 201);
    }
    if (recordId && method === 'PUT') {
      const body = await request.json().catch(() => null);
      if (!isModuleRecord(body)) return json({ error: 'Informe o paciente e os dados do registro.' }, 400);
      const serializedData = JSON.stringify(body.dados);
      if (serializedData.length > 500000) return json({ error: 'Registro excede o tamanho permitido.' }, 413);
      await db.update(registrosModulos).set({
        paciente: body.paciente.trim(),
        dados: serializedData,
        updatedAt: new Date().toISOString(),
      }).where(and(eq(registrosModulos.modulo, id), eq(registrosModulos.id, Number(recordId))));
      return json({ ok: true });
    }
    if (recordId && method === 'DELETE') {
      await db.delete(registrosModulos)
        .where(and(eq(registrosModulos.modulo, id), eq(registrosModulos.id, Number(recordId))));
      return json({ ok: true });
    }
  }

  if (recurso === 'setores' && method === 'GET') {
    return json(await db.select().from(setores).orderBy(asc(setores.nome)));
  }

  if (recurso === 'leitos' && method === 'GET') {
    const rows = await db.select().from(leitos).orderBy(asc(leitos.nome));
    return json(rows.map((leito) => ({ id: leito.id, setor_id: leito.setorId, nome: leito.nome })));
  }

  if (recurso === 'config' && id) {
    if (method === 'GET') {
      const rows = await db
        .select({ valor: configuracoes.valor })
        .from(configuracoes)
        .where(eq(configuracoes.chave, id))
        .orderBy(asc(configuracoes.valor));
      return json(rows.map((row) => row.valor));
    }
    if (method === 'POST') {
      const body = await request.json().catch(() => null);
      const values = [...new Set((Array.isArray(body) ? body : []).filter(Boolean).map(String))];
      await db.delete(configuracoes).where(eq(configuracoes.chave, id));
      if (values.length) {
        await db.insert(configuracoes).values(values.map((valor) => ({ chave: id, valor })));
      }
      return json({ ok: true, values });
    }
  }

  if (recurso === 'pacientes') {
    if (method === 'GET' && !id) return json(await listarPacientes(db));
    if (method === 'POST' && !id) {
      const dados = await dadosPaciente(await request.json(), db);
      const [novo] = await db.insert(pacientes).values(dados).returning({ id: pacientes.id });
      return json({ ok: true, id: novo.id }, 201);
    }
    if (id && method === 'PUT') {
      const dados = await dadosPaciente(await request.json(), db);
      await db.update(pacientes).set(dados).where(eq(pacientes.id, Number(id)));
      return json({ ok: true });
    }
    if (id && method === 'DELETE') {
      await db.delete(pacientes).where(eq(pacientes.id, Number(id)));
      return json({ ok: true });
    }
  }

  return json({ error: 'Rota não encontrada.' }, 404);
}

export async function handleApiRequest(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

  if (!env?.DB) {
    if (env?.APP_ENV === 'production') {
      return json({ error: 'Banco D1 não configurado.' }, 503);
    }
    return handleFallbackRequest(request, env || {});
  }

  try {
    const db = drizzle(env.DB);
    return await handle(request, env, db);
  } catch (error) {
    console.error('Cloudflare API request failed:', error);
    return json({ error: 'Erro interno na API. Verifique o banco D1 e as migrações.' }, 500);
  }
}