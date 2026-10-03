INSERT OR IGNORE INTO setores (nome) VALUES
  ('Sala vermelha'),
  ('Sala de Sutura'),
  ('Sala do respiratorio'),
  ('Sala Pediatria'),
  ('Sala Amarela feminina'),
  ('Sala Amarela masculina'),
  ('Sala Psiquiatria'),
  ('Sala verde'),
  ('Isolamento'),
  ('Sala de Aplicacao');

INSERT OR IGNORE INTO leitos (setor_id, nome)
SELECT s.id, s.nome || ' - Leito ' || n.num
FROM setores s
CROSS JOIN (SELECT '01' AS num UNION ALL SELECT '02' UNION ALL SELECT '03') n;

INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES
  ('dietas', 'Livre'), ('dietas', 'Branda'), ('dietas', 'Pastosa'), ('dietas', 'Liquida'),
  ('dietas', 'Liquida restrita'), ('dietas', 'Zero Lactose'), ('dietas', 'HAS'), ('dietas', 'DM'),
  ('dietas', 'DRC'), ('dietas', 'Mamadeira'), ('dietas', 'Neutropenica'), ('dietas', 'Enteral'),
  ('dietas', 'Parenteral'), ('dietas', 'NPO'),
  ('status', 'Café da manhã'), ('status', 'Almoço'), ('status', 'Lanche da tarde'), ('status', 'Jantar'), ('status', 'Ceia'),
  ('vias', 'Oral'), ('vias', 'Sonda'), ('vias', 'Parenteral'), ('vias', 'Nao se aplica'),
  ('acompanhante', 'Nao'), ('acompanhante', 'Sim');