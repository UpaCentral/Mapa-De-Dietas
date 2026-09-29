import type { Config } from "@netlify/functions";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { configuracoes, leitos, pacientes, setores } from "../../db/schema.js";

type PacienteBody = Record<string, string | undefined>;

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
  try {
    return await handle(req);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/*",
};
