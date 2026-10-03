CREATE TABLE IF NOT EXISTS setores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS leitos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setor_id INTEGER NOT NULL REFERENCES setores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  UNIQUE(setor_id, nome)
);

CREATE TABLE IF NOT EXISTS configuracoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chave TEXT NOT NULL,
  valor TEXT NOT NULL,
  UNIQUE(chave, valor)
);

CREATE TABLE IF NOT EXISTS pacientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  setor_id INTEGER REFERENCES setores(id),
  leito_id INTEGER REFERENCES leitos(id),
  data_internacao TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  expires_at TEXT NOT NULL
);