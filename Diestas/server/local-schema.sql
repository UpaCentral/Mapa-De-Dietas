CREATE TABLE IF NOT EXISTS setores (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS leitos (
  id BIGSERIAL PRIMARY KEY,
  setor_id BIGINT NOT NULL REFERENCES setores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  UNIQUE (setor_id, nome)
);

CREATE TABLE IF NOT EXISTS configuracoes (
  id BIGSERIAL PRIMARY KEY,
  chave TEXT NOT NULL,
  valor TEXT NOT NULL,
  UNIQUE (chave, valor)
);

CREATE TABLE IF NOT EXISTS pacientes (
  id BIGSERIAL PRIMARY KEY,
  prontuario TEXT,
  nome TEXT NOT NULL,
  data_nascimento TEXT,
  idade TEXT,
  mae TEXT,
  acompanhante TEXT,
  justificativa_acompanhante TEXT,
  via TEXT,
  dieta TEXT,
  restricao TEXT,
  alergias TEXT,
  observacoes TEXT,
  horario_refeicao TEXT,
  setor_id BIGINT REFERENCES setores(id),
  leito_id BIGINT REFERENCES leitos(id),
  data_internacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessoes (
  id BIGSERIAL PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);