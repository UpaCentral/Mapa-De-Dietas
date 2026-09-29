CREATE TABLE "configuracoes" (
	"id" serial PRIMARY KEY,
	"chave" text NOT NULL,
	"valor" text NOT NULL,
	CONSTRAINT "configuracoes_chave_valor_unique" UNIQUE("chave","valor")
);
--> statement-breakpoint
CREATE TABLE "leitos" (
	"id" serial PRIMARY KEY,
	"setor_id" integer NOT NULL,
	"nome" text NOT NULL,
	CONSTRAINT "leitos_setor_id_nome_unique" UNIQUE("setor_id","nome")
);
--> statement-breakpoint
CREATE TABLE "pacientes" (
	"id" serial PRIMARY KEY,
	"prontuario" text,
	"nome" text NOT NULL,
	"data_nascimento" text,
	"idade" text,
	"mae" text,
	"acompanhante" text,
	"justificativa_acompanhante" text,
	"via" text,
	"dieta" text,
	"restricao" text,
	"alergias" text,
	"observacoes" text,
	"horario_refeicao" text,
	"setor_id" integer,
	"leito_id" integer,
	"data_internacao" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "setores" (
	"id" serial PRIMARY KEY,
	"nome" text NOT NULL UNIQUE
);
--> statement-breakpoint
ALTER TABLE "leitos" ADD CONSTRAINT "leitos_setor_id_setores_id_fkey" FOREIGN KEY ("setor_id") REFERENCES "setores"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_setor_id_setores_id_fkey" FOREIGN KEY ("setor_id") REFERENCES "setores"("id");--> statement-breakpoint
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_leito_id_leitos_id_fkey" FOREIGN KEY ("leito_id") REFERENCES "leitos"("id");