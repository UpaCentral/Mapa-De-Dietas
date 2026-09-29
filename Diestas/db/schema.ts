import { pgTable, serial, text, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const setores = pgTable("setores", {
  id: serial().primaryKey(),
  nome: text().notNull().unique(),
});

export const leitos = pgTable(
  "leitos",
  {
    id: serial().primaryKey(),
    setorId: integer("setor_id").notNull().references(() => setores.id, { onDelete: "cascade" }),
    nome: text().notNull(),
  },
  (t) => [unique().on(t.setorId, t.nome)],
);

export const configuracoes = pgTable(
  "configuracoes",
  {
    id: serial().primaryKey(),
    chave: text().notNull(),
    valor: text().notNull(),
  },
  (t) => [unique().on(t.chave, t.valor)],
);

export const pacientes = pgTable("pacientes", {
  id: serial().primaryKey(),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessoes = pgTable("sessoes", {
  id: serial().primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  username: text().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
