CREATE TABLE "sessoes" (
	"id" serial PRIMARY KEY,
	"token_hash" text NOT NULL UNIQUE,
	"username" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
