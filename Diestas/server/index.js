import express from 'express';
import cors from 'cors';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createSession, getSession, revokeSession, verifyPassword } from './auth.js';
import { initDatabase, getSettings, setSettings } from './db.js';

const app = express();
const PORT = 3001;
const authFile = process.env.DIETA_AUTH_FILE || path.join(process.env.USERPROFILE || process.env.HOME, '.cloudflared', 'dieta-auth.json');
const loginAttempts = new Map();
const allowedOrigins = new Set([
  'https://upadieta.netlify.app',
  'https://dieta.upacentral.co.uk',
  'https://www.dieta.upacentral.co.uk',
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origem não autorizada.'));
  },
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());

let db;

async function getDb() {
  if (!db) {
    db = await initDatabase();
  }
  return db;
}

app.post('/api/login', async (req, res) => {
  const now = Date.now();
  const ip = req.ip;
  const attempt = loginAttempts.get(ip);
  if (attempt && attempt.resetAt <= now) loginAttempts.delete(ip);
  const currentAttempt = loginAttempts.get(ip);
  if (currentAttempt?.count >= 5) {
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' });
  }

  try {
    const credential = JSON.parse(await readFile(authFile, 'utf8'));
    const usernameMatches = req.body?.username === credential.username;
    const passwordMatches = await verifyPassword(req.body?.password, credential);
    if (!usernameMatches || !passwordMatches) {
      loginAttempts.set(ip, {
        count: (currentAttempt?.count || 0) + 1,
        resetAt: currentAttempt?.resetAt || now + 15 * 60 * 1000,
      });
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }

    loginAttempts.delete(ip);
    res.json({ token: createSession(credential.username), username: credential.username });
  } catch (error) {
    console.error('Falha ao ler configuração de autenticação:', error.message);
    res.status(503).json({ error: 'Login indisponível: credencial local não configurada.' });
  }
});

app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path === '/login') return next();
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const session = getSession(token);
  if (!session) return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  req.authToken = token;
  req.authUser = session.username;
  next();
});

app.post('/api/logout', (req, res) => {
  revokeSession(req.authToken);
  res.json({ ok: true });
});

app.get('/api/session', (req, res) => {
  res.json({ ok: true, username: req.authUser });
});

app.get('/api/health', async (_req, res) => {
  try {
    const connection = await getDb();
    await connection.get('SELECT 1 AS ok');
    res.json({ ok: true, database: 'Dieta.db' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/config/:key', async (req, res) => {
  try {
    const connection = await getDb();
    const values = await getSettings(connection, req.params.key);
    res.json(values);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config/:key', async (req, res) => {
  try {
    const connection = await getDb();
    const values = Array.isArray(req.body) ? req.body : [];
    await setSettings(connection, req.params.key, values);
    res.json({ ok: true, values });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/setores', async (_req, res) => {
  try {
    const connection = await getDb();
    const rows = await connection.all('SELECT id, nome FROM setores ORDER BY nome');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/leitos', async (_req, res) => {
  try {
    const connection = await getDb();
    const rows = await connection.all('SELECT id, setor_id, nome FROM leitos ORDER BY nome');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pacientes', async (_req, res) => {
  try {
    const connection = await getDb();
    const rows = await connection.all(`
      SELECT p.*, s.nome AS setor_nome, l.nome AS leito_nome
      FROM pacientes p
      LEFT JOIN setores s ON s.id = p.setor_id
      LEFT JOIN leitos l ON l.id = p.leito_id
      ORDER BY p.updated_at DESC
    `);

    res.json(rows.map((row) => ({
      ...row,
      leito: row.leito_nome || row.leito || '',
      setor: row.setor_nome || row.setor || '',
      nascimento: row.data_nascimento,
      internacao: row.data_internacao,
      status: row.horario_refeicao,
      obs: row.observacoes,
      justAcompanhante: row.justificativa_acompanhante,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pacientes', async (req, res) => {
  try {
    const connection = await getDb();
    const body = req.body;

    const setor = await connection.get('SELECT id FROM setores WHERE nome = ?', [body.setor]);
    const leito = await connection.get('SELECT id FROM leitos WHERE nome = ?', [body.leito]);

    const dados = {
      prontuario: body.prontuario || '',
      nome: body.nome || '',
      data_nascimento: body.nascimento || null,
      idade: body.idade || '',
      mae: body.mae || '',
      acompanhante: body.acompanhante || '',
      justificativa_acompanhante: body.justAcompanhante || '',
      via: body.via || '',
      dieta: body.dieta || '',
      restricao: body.restricao || '',
      alergias: body.alergias || '',
      observacoes: body.obs || '',
      horario_refeicao: body.status || '',
      setor_id: setor ? setor.id : null,
      leito_id: leito ? leito.id : null,
      data_internacao: body.internacao || null,
      updated_at: new Date().toISOString(),
    };

    const result = await connection.run(`
      INSERT INTO pacientes (
        prontuario, nome, data_nascimento, idade, mae, acompanhante,
        justificativa_acompanhante, via, dieta, restricao, alergias,
        observacoes, horario_refeicao, setor_id, leito_id, data_internacao, updated_at
      ) VALUES (
        :prontuario, :nome, :data_nascimento, :idade, :mae, :acompanhante,
        :justificativa_acompanhante, :via, :dieta, :restricao, :alergias,
        :observacoes, :horario_refeicao, :setor_id, :leito_id, :data_internacao, :updated_at
      )
    `, dados);

    res.status(201).json({ ok: true, id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/pacientes/:id', async (req, res) => {
  try {
    const connection = await getDb();
    const body = req.body;
    const setor = await connection.get('SELECT id FROM setores WHERE nome = ?', [body.setor]);
    const leito = await connection.get('SELECT id FROM leitos WHERE nome = ?', [body.leito]);

    await connection.run(`
      UPDATE pacientes SET
        prontuario = ?, nome = ?, data_nascimento = ?, idade = ?, mae = ?, acompanhante = ?,
        justificativa_acompanhante = ?, via = ?, dieta = ?, restricao = ?, alergias = ?,
        observacoes = ?, horario_refeicao = ?, setor_id = ?, leito_id = ?, data_internacao = ?, updated_at = ?
      WHERE id = ?
    `, [
      body.prontuario || '', body.nome || '', body.nascimento || null, body.idade || '', body.mae || '', body.acompanhante || '',
      body.justAcompanhante || '', body.via || '', body.dieta || '', body.restricao || '', body.alergias || '',
      body.obs || '', body.status || '', setor ? setor.id : null, leito ? leito.id : null, body.internacao || null,
      new Date().toISOString(), req.params.id
    ]);

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/pacientes/:id', async (req, res) => {
  try {
    const connection = await getDb();
    await connection.run('DELETE FROM pacientes WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor Dieta rodando em http://localhost:${PORT}`);
});
