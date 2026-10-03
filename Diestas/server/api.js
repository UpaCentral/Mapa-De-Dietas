import { and, asc, desc, eq, gt, lte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { configuracoes, leitos, pacientes, sessoes, setores } from '../db/schema.ts';
import { createSessionToken, hashSessionToken, verifyPassword } from './auth.js';

const sessionTtlMs = 8 * 60 * 60 * 1000;
const defaultLoginUsername = 'UPADieta';
const defaultLoginSalt = 'FDdQFTEzE1QuwfgKbMNnqg==';
const defaultLoginPasswordHash = '0fe7c25dc2ff0d6ea7ee3d08783cbe76eb110da31bc894f63e6e5ba789597934';

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
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
  const [recurso, id] = new URL(request.url).pathname
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
    const username = env.DIETA_USERNAME || defaultLoginUsername;
    const salt = env.DIETA_PASSWORD_SALT || defaultLoginSalt;
    const passwordHash = env.DIETA_PASSWORD_HASH || defaultLoginPasswordHash;
    const body = await request.json().catch(() => null);
    const normalizedUsername = typeof body?.username === 'string' ? body.username.trim() : '';
    const passwordMatches = await verifyPassword(typeof body?.password === 'string' ? body.password : '', { salt, passwordHash });
    if (normalizedUsername.toLowerCase() !== String(username).trim().toLowerCase() || !passwordMatches) {
      return json({ error: 'Usuário ou senha incorretos.' }, 401);
    }

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + sessionTtlMs).toISOString();
    await db.delete(sessoes).where(lte(sessoes.expiresAt, new Date().toISOString()));
    await db.insert(sessoes).values({
      tokenHash: await hashSessionToken(token),
      username,
      expiresAt,
    });
    return json({ token, username });
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

  try {
    const db = drizzle(env.DB);
    return await handle(request, env, db);
  } catch (error) {
    console.error('Cloudflare API request failed:', error);
    return json({ error: 'Erro interno na API. Verifique o banco D1 e as migrações.' }, 500);
  }
}