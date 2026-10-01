import type { Config } from "@netlify/functions";
import { and, asc, desc, eq, gt, lte } from "drizzle-orm";
import { db } from "../../db/index.js";
import { configuracoes, leitos, pacientes, sessoes, setores } from "../../db/schema.js";
import { createSessionToken, hashSessionToken, verifyPassword } from "./auth.js";
import { corsHeaders } from "./cors.js";

type PacienteBody = Record<string, string | undefined>;
const sessionTtlMs = 8 * 60 * 60 * 1000;
const defaultLoginUsername = "UPADieta";
const defaultLoginSalt = "FDdQFTEzE1QuwfgKbMNnqg==";
const defaultLoginPasswordHash = "61174de7664891114dbfb4648777ded9f76c8bce27eefebb32142652730d6a9e88de2d1f3d828e3e58e8b5706cccdfa51dd42559defc8d608b141e6ebc7125b4";

async function getSession(req: Request) {
  const authorization = req.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const [session] = await db
    .select({ tokenHash: sessoes.tokenHash, username: sessoes.username })
    .from(sessoes)
    .where(and(eq(sessoes.tokenHash, tokenHash), gt(sessoes.expiresAt, new Date())))
    .limit(1);
  return session || null;
}

async function dadosPaciente(body: PacienteBody) {
  const [setor] = body.setor
    ? await db.select({ id: setores.id }).from(setores).where(eq(setores.nome, body.setor))
    : [];
  const [leito] = body.leito
    ? await db.select({ id: leitos.id }).from(leitos).where(eq(leitos.nome, body.leito))
    : [];

  return {
    prontuario: body.prontuario || "",
    nome: body.nome || "",
    dataNascimento: body.nascimento || null,
    idade: body.idade || "",
    mae: body.mae || "",
    acompanhante: body.acompanhante || "",
    justificativaAcompanhante: body.justAcompanhante || "",
    via: body.via || "",
    dieta: body.dieta || "",
    restricao: body.restricao || "",
    alergias: body.alergias || "",
    observacoes: body.obs || "",
    horarioRefeicao: body.status || "",
    setorId: setor ? setor.id : null,
    leitoId: leito ? leito.id : null,
    dataInternacao: body.internacao || null,
    updatedAt: new Date(),
  };
}

async function listarPacientes() {
  const rows = await db
    .select({
      paciente: pacientes,
      setorNome: setores.nome,
      leitoNome: leitos.nome,
    })
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
    leito: leitoNome || "",
    setor: setorNome || "",
    nascimento: p.dataNascimento,
    internacao: p.dataInternacao,
    status: p.horarioRefeicao,
    obs: p.observacoes,
    justAcompanhante: p.justificativaAcompanhante,
  }));
}

async function handle(req: Request): Promise<Response> {
  const [recurso, id] = new URL(req.url).pathname
    .replace(/^\/api\/?/, "")
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent);
  const method = req.method;

  if (recurso === "health") {
    await db.select({ id: setores.id }).from(setores).limit(1);
    return Response.json({ ok: true });
  }

  if (recurso === "login" && method === "POST") {
    const username = process.env.DIETA_USERNAME || defaultLoginUsername;
    const salt = process.env.DIETA_PASSWORD_SALT || defaultLoginSalt;
    const passwordHash = process.env.DIETA_PASSWORD_HASH || defaultLoginPasswordHash;

    const body = await req.json().catch(() => null) as { username?: unknown; password?: unknown } | null;
    const normalizedUsername = typeof body?.username === "string" ? body.username.trim() : "";
    const normalizedExpectedUsername = String(username).trim();
    const passwordMatches = await verifyPassword(typeof body?.password === "string" ? body.password : "", { salt, passwordHash });
    const usernameMatches = normalizedUsername.toLowerCase() === normalizedExpectedUsername.toLowerCase();
    if (!usernameMatches || !passwordMatches) {
      return Response.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
    }

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + sessionTtlMs);
    await db.delete(sessoes).where(lte(sessoes.expiresAt, new Date()));
    await db.insert(sessoes).values({
      tokenHash: hashSessionToken(token),
      username,
      expiresAt,
    });
    return Response.json({ token, username });
  }

  const session = await getSession(req);
  if (!session) {
    return Response.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
  }

  if (recurso === "session" && method === "GET") {
    return Response.json({ ok: true, username: session.username });
  }

  if (recurso === "logout" && method === "POST") {
    await db.delete(sessoes).where(eq(sessoes.tokenHash, session.tokenHash));
    return Response.json({ ok: true });
  }

  if (recurso === "setores" && method === "GET") {
    return Response.json(await db.select().from(setores).orderBy(asc(setores.nome)));
  }

  if (recurso === "leitos" && method === "GET") {
    const rows = await db.select().from(leitos).orderBy(asc(leitos.nome));
    return Response.json(rows.map((l) => ({ id: l.id, setor_id: l.setorId, nome: l.nome })));
  }

  if (recurso === "config" && id) {
    if (method === "GET") {
      const rows = await db
        .select({ valor: configuracoes.valor })
        .from(configuracoes)
        .where(eq(configuracoes.chave, id))
        .orderBy(asc(configuracoes.valor));
      return Response.json(rows.map((r) => r.valor));
    }
    if (method === "POST") {
      const body = await req.json().catch(() => null);
      const values = [...new Set((Array.isArray(body) ? body : []).filter(Boolean).map(String))];
      await db.delete(configuracoes).where(eq(configuracoes.chave, id));
      if (values.length) {
        await db.insert(configuracoes).values(values.map((valor) => ({ chave: id, valor })));
      }
      return Response.json({ ok: true, values });
    }
  }

  if (recurso === "pacientes") {
    if (method === "GET" && !id) {
      return Response.json(await listarPacientes());
    }
    if (method === "POST" && !id) {
      const dados = await dadosPaciente(await req.json());
      const [novo] = await db.insert(pacientes).values(dados).returning({ id: pacientes.id });
      return Response.json({ ok: true, id: novo.id }, { status: 201 });
    }
    if (id && method === "PUT") {
      const dados = await dadosPaciente(await req.json());
      await db.update(pacientes).set(dados).where(eq(pacientes.id, Number(id)));
      return Response.json({ ok: true });
    }
    if (id && method === "DELETE") {
      await db.delete(pacientes).where(eq(pacientes.id, Number(id)));
      return Response.json({ ok: true });
    }
  }

  return Response.json({ error: "Rota não encontrada." }, { status: 404 });
}

export default async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  if (origin && !headers) {
    return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: headers || undefined });
  }

  try {
    const response = await handle(req);
    if (!headers) return response;

    const responseHeaders = new Headers(response.headers);
    for (const [name, value] of Object.entries(headers)) responseHeaders.set(name, value);
    const vary = responseHeaders.get("Vary");
    responseHeaders.set("Vary", vary ? `${vary}, Origin` : "Origin");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const response = Response.json({ error: (error as Error).message }, { status: 500 });
    if (!headers) return response;

    const responseHeaders = new Headers(response.headers);
    for (const [name, value] of Object.entries(headers)) responseHeaders.set(name, value);
    responseHeaders.set("Vary", "Origin");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  }
};

export const config: Config = {
  path: "/api/*",
};
