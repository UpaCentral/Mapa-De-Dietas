import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const setores = sqliteTable("setores", {
  id: integer().primaryKey({ autoIncrement: true }),
  nome: text().notNull().unique(),
});

export const leitos = sqliteTable(
  "leitos",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    setorId: integer("setor_id").notNull().references(() => setores.id, { onDelete: "cascade" }),
    nome: text().notNull(),
  },
  (t) => [unique().on(t.setorId, t.nome)],
);

export const configuracoes = sqliteTable(
  "configuracoes",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    chave: text().notNull(),
    valor: text().notNull(),
  },
  (t) => [unique().on(t.chave, t.valor)],
);

export const pacientes = sqliteTable("pacientes", {
  id: integer().primaryKey({ autoIncrement: true }),
  prontuario: text(),
  nome: text().notNull(),
  dataNascimento: text("data_nascimento"),
  idade: text(),
  mae: text(),
  acompanhante: text(),
  justificativaAcompanhante: text("justificativa_acompanhante"),
  via: text(),
  dieta: text(),
  restricao: text(),
  alergias: text(),
  observacoes: text(),
  horarioRefeicao: text("horario_refeicao"),
  setorId: integer("setor_id").references(() => setores.id),
  leitoId: integer("leito_id").references(() => leitos.id),
  dataInternacao: text("data_internacao"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const sessoes = sqliteTable("sessoes", {
  id: integer().primaryKey({ autoIncrement: true }),
  tokenHash: text("token_hash").notNull().unique(),
  username: text().notNull(),
  expiresAt: text("expires_at").notNull(),
});
