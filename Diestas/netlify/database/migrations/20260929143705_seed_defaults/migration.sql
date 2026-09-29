-- Custom SQL migration file, put your code below! --INSERT INTO setores (nome) VALUES
  ('Sala vermelha'),
  ('Sala de Sutura'),
  ('Sala do respiratorio'),
  ('Sala Pediatria'),
  ('Sala Amarela feminina'),
  ('Sala Amarela masculina'),
  ('Sala Psiquiatria'),
  ('Sala verde'),
  ('Isolamento'),
  ('Sala de Aplicacao')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO leitos (setor_id, nome)
SELECT s.id, s.nome || ' - Leito ' || n.num
FROM setores s CROSS JOIN (VALUES ('01'), ('02'), ('03')) AS n(num)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO configuracoes (chave, valor) VALUES
  ('dietas', 'Livre'), ('dietas', 'Branda'), ('dietas', 'Pastosa'), ('dietas', 'Liquida'),
  ('dietas', 'Liquida restrita'), ('dietas', 'Zero Lactose'), ('dietas', 'HAS'), ('dietas', 'DM'),
  ('dietas', 'DRC'), ('dietas', 'Mamadeira'), ('dietas', 'Neutropenica'), ('dietas', 'Enteral'),
  ('dietas', 'Parenteral'), ('dietas', 'NPO'),
  ('status', 'Café da manhã'), ('status', 'Almoço'), ('status', 'Lanche da tarde'), ('status', 'Jantar'), ('status', 'Ceia'),
  ('vias', 'Oral'), ('vias', 'Sonda'), ('vias', 'Parenteral'), ('vias', 'Nao se aplica'),
  ('acompanhante', 'Nao'), ('acompanhante', 'Sim')
ON CONFLICT DO NOTHING;
