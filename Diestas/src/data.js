export const defaultStatus = ['Café da manhã', 'Almoço', 'Lanche da tarde', 'Jantar', 'Ceia'];
export const defaultCompanions = ['Nao', 'Sim'];
export const defaultVias = ['Oral', 'Sonda', 'Parenteral', 'Nao se aplica'];
export const defaultDietas = ['Livre', 'Branda', 'Pastosa', 'Liquida', 'Liquida restrita', 'Zero Lactose', 'HAS', 'DM', 'DRC', 'Mamadeira', 'Neutropenica', 'Enteral', 'Parenteral', 'NPO'];

export const defaultSetores = [
  'Sala vermelha',
  'Sala de Sutura',
  'Sala do respiratorio',
  'Sala Pediatria',
  'Sala Amarela feminina',
  'Sala Amarela masculina',
  'Sala Psiquiatria',
  'Sala verde',
  'Isolamento',
  'Sala de Aplicacao',
];

export const defaultLeitos = [
  'Sala vermelha - Leito p/ estabilizacao',
  'Sala vermelha - Observacao 1',
  'Sala vermelha - Observacao 2',
  'Sala vermelha - Observacao 3',
  'Sala vermelha - Maca ECG',
  'Sala vermelha - Maca Extra 01',
  'Sala vermelha - Maca Extra 02',
  'Sala vermelha - Leito Iso 01',
  'Sala vermelha - Leito Iso 02',
  'Sala vermelha - Leito Iso 03',
  'Sala de Sutura - Maca de sutura 1',
  'Sala de Sutura - Maca de sutura 2',
  'Sala de Sutura - Maca de curativos',
  'Sala do respiratorio - Poltrona 1',
  'Sala do respiratorio - Poltrona 2',
  'Sala do respiratorio - Poltrona 3',
  'Sala do respiratorio - Poltrona 4',
  'Sala do respiratorio - Poltrona 5',
  'Sala do respiratorio - Poltrona 6',
  'Sala do respiratorio - Isolamento Quarto 01',
  'Sala do respiratorio - Isolamento Quarto 02',
  'Sala do respiratorio - Leito Iso 01',
  'Sala do respiratorio - Leito Iso 02',
  'Sala do respiratorio - Leito Iso 03',
  'Sala Pediatria - Berco 1',
  'Sala Pediatria - Berco 2',
  'Sala Pediatria - Berco 3',
  'Sala Pediatria - Berco 4',
  'Sala Pediatria - Berco 5',
  'Sala Pediatria - Leito 1',
  'Sala Pediatria - Leito 2',
  'Sala Pediatria - Poltrona 1',
  'Sala Pediatria - Poltrona 2',
  'Sala Pediatria - Poltrona 3',
  'Sala Pediatria - Poltrona 4',
  'Sala Pediatria - Leito Iso 01',
  'Sala Pediatria - Leito Iso 02',
  'Sala Pediatria - Leito Iso 03',
  'Sala Amarela feminina - Leito feminino 11',
  'Sala Amarela feminina - Leito feminino 12',
  'Sala Amarela feminina - Leito feminino 13',
  'Sala Amarela feminina - Leito feminino 14',
  'Sala Amarela feminina - Leito feminino 15',
  'Sala Amarela feminina - Leito feminino 16',
  'Sala Amarela feminina - Leito feminino 17',
  'Sala Amarela feminina - Leito feminino 18',
  'Sala Amarela feminina - Leito feminino 19',
  'Sala Amarela feminina - Leito feminino 20',
  'Sala Amarela feminina - Leito feminino 21',
  'Sala Amarela feminina - Leito Iso 01',
  'Sala Amarela feminina - Leito Iso 02',
  'Sala Amarela feminina - Leito Iso 03',
  'Sala Amarela masculina - Leito masculino 1',
  'Sala Amarela masculina - Leito masculino 2',
  'Sala Amarela masculina - Leito masculino 3',
  'Sala Amarela masculina - Leito masculino 4',
  'Sala Amarela masculina - Leito masculino 5',
  'Sala Amarela masculina - Leito masculino 6',
  'Sala Amarela masculina - Leito masculino 7',
  'Sala Amarela masculina - Leito masculino 8',
  'Sala Amarela masculina - Leito masculino 9',
  'Sala Amarela masculina - Leito masculino 10',
  'Sala Amarela masculina - Leito Iso 01',
  'Sala Amarela masculina - Leito Iso 02',
  'Sala Amarela masculina - Leito Iso 03',
  'Sala Psiquiatria - Maca 1',
  'Sala Psiquiatria - Maca 2',
  'Sala Psiquiatria - Maca 3',
  'Sala Psiquiatria - Maca 4',
  'Sala Psiquiatria - Poltrona 1',
  'Sala Psiquiatria - Poltrona 2',
  'Sala Psiquiatria - Leito Iso 01',
  'Sala Psiquiatria - Leito Iso 02',
  'Sala Psiquiatria - Leito Iso 03',
  'Sala verde - Maca',
  'Sala verde - Poltrona 1',
  'Sala verde - Poltrona 2',
  'Sala verde - Poltrona 3',
  'Sala verde - Poltrona 4',
  'Sala verde - Poltrona 5',
  'Sala verde - Poltrona 6',
  'Sala verde - Poltrona 7',
  'Sala verde - Poltrona 8',
  'Sala verde - Poltrona 9',
  'Sala verde - Poltrona 10',
  'Sala verde - Poltrona 11',
  'Sala verde - Poltrona 12',
  'Sala verde - Poltrona 13',
  'Sala verde - Poltrona Extra 01',
  'Sala verde - Poltrona Extra 02',
  'Sala verde - Poltrona Extra 03',
  'Sala verde - Poltrona Extra 04',
  'Sala verde - Poltrona Extra 05',
  'Sala verde - Poltrona Extra 06',
  'Sala verde - Leito Iso 01',
  'Sala verde - Leito Iso 02',
  'Sala verde - Leito Iso 03',
  'Isolamento - Quarto 1',
  'Isolamento - Quarto 2',
  'Sala de Aplicacao',
];

export function leitosDoSetor(setor, fullList = defaultLeitos) {
  if (!setor) return [];
  return fullList.filter((leito) => leito === setor || leito.startsWith(`${setor} - `));
}

export function calcularIdade(dataNascimento) {
  if (!dataNascimento) return '';
  const nascimento = new Date(`${dataNascimento}T00:00:00`);
  if (Number.isNaN(nascimento.getTime())) return '';
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const jaAniversariou =
    hoje.getMonth() > nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() >= nascimento.getDate());

  if (!jaAniversariou) idade -= 1;
  return idade >= 0 ? `${idade} anos` : '';
}

export function formatarData(valor) {
  if (!valor) return '';
  const data = new Date(`${valor}T00:00:00`);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleDateString('pt-BR');
}

export function formatarDateTime(valor) {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function novoValorDataHora() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
