import { useEffect, useMemo, useState } from 'react';
import {
  defaultCompanions,
  defaultDietas,
  defaultLeitos,
  defaultSetores,
  defaultStatus,
  defaultVias,
  formatarData,
  formatarDateTime,
  leitosDoSetor,
  calcularIdade,
  novoValorDataHora,
} from './data';
import { resolveApiBase } from './api';

const API_BASE = resolveApiBase(window.location);

const initialForm = {
  id: null,
  internacao: novoValorDataHora(),
  setor: '',
  leito: '',
  status: defaultStatus[0],
  prontuario: '',
  nome: '',
  nascimento: '',
  idade: '',
  mae: '',
  acompanhante: defaultCompanions[0],
  via: defaultVias[0],
  justAcompanhante: '',
  dieta: '',
  restricao: '',
  alergias: '',
  obs: '',
};

const seedData = [
  {
    id: 1,
    internacao: '2026-09-21T08:15',
    setor: 'Sala vermelha',
    leito: 'Sala vermelha - Observacao 1',
    status: 'Almoço',
    prontuario: '12458',
    nome: 'Maria Silva',
    nascimento: '1988-03-13',
    idade: '38 anos',
    mae: 'Ana Silva',
    acompanhante: 'Sim',
    via: 'Oral',
    justAcompanhante: 'Acompanhante responsável',
    dieta: 'Branda + Zero Lactose',
    restricao: 'Sem sal',
    alergias: 'Nenhuma',
    obs: 'Paciente em observação',
  },
  {
    id: 2,
    internacao: '2026-09-22T12:45',
    setor: 'Sala Pediatria',
    leito: 'Sala Pediatria - Berco 2',
    status: 'Jantar',
    prontuario: '22441',
    nome: 'João Pereira',
    nascimento: '2024-01-08',
    idade: '2 anos',
    mae: 'Carla Pereira',
    acompanhante: 'Nao',
    via: 'Oral',
    justAcompanhante: '',
    dieta: 'Mamadeira',
    restricao: 'Sem açúcar',
    alergias: 'Leite',
    obs: 'Criança em acompanhamento',
  },
];

function normalizePaciente(row = {}) {
  return {
    id: row.id ?? null,
    internacao: row.internacao || row.data_internacao || novoValorDataHora(),
    setor: row.setor || row.setor_nome || '',
    leito: row.leito || row.leito_nome || '',
    status: row.status || row.horario_refeicao || defaultStatus[0],
    prontuario: row.prontuario || '',
    nome: row.nome || '',
    nascimento: row.nascimento || row.data_nascimento || '',
    idade: row.idade || calcularIdade(row.nascimento || row.data_nascimento) || '',
    mae: row.mae || '',
    acompanhante: row.acompanhante || defaultCompanions[0],
    via: row.via || defaultVias[0],
    justAcompanhante: row.justAcompanhante || row.justificativa_acompanhante || '',
    dieta: row.dieta || '',
    restricao: row.restricao || '',
    alergias: row.alergias || '',
    obs: row.obs || row.observacoes || '',
  };
}

function App() {
  const [setores, setSetores] = useState(defaultSetores);
  const [leitos, setLeitos] = useState(defaultLeitos);
  const [statusOpcoes, setStatusOpcoes] = useState(defaultStatus);
  const [acompanhanteOpcoes, setAcompanhanteOpcoes] = useState(defaultCompanions);
  const [vias, setVias] = useState(defaultVias);
  const [dietas, setDietas] = useState(defaultDietas);
  const [form, setForm] = useState(initialForm);
  const [registros, setRegistros] = useState(seedData);
  const [filtroSetor, setFiltroSetor] = useState('');
  const [filtroDieta, setFiltroDieta] = useState('');
  const [busca, setBusca] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const [erroConexao, setErroConexao] = useState('');
  const [carregando, setCarregando] = useState(true);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [setoresRes, leitosRes, statusRes, acompanhanteRes, dietasRes, viasRes, pacientesRes] = await Promise.all([
        fetch(`${API_BASE}/setores`),
        fetch(`${API_BASE}/leitos`),
        fetch(`${API_BASE}/config/status`),
        fetch(`${API_BASE}/config/acompanhante`),
        fetch(`${API_BASE}/config/dietas`),
        fetch(`${API_BASE}/config/vias`),
        fetch(`${API_BASE}/pacientes`),
      ]);

      const setoresApi = await setoresRes.json();
      const leitosApi = await leitosRes.json();
      const statusApi = await statusRes.json();
      const acompanhanteApi = await acompanhanteRes.json();
      const dietasApi = await dietasRes.json();
      const viasApi = await viasRes.json();
      const pacientesApi = await pacientesRes.json();

      setSetores(Array.isArray(setoresApi) && setoresApi.length ? setoresApi.map((item) => item.nome || item) : defaultSetores);
      setLeitos(Array.isArray(leitosApi) && leitosApi.length ? leitosApi.map((item) => item.nome || item) : defaultLeitos);
      setStatusOpcoes(Array.isArray(statusApi) && statusApi.length ? statusApi : defaultStatus);
      setAcompanhanteOpcoes(Array.isArray(acompanhanteApi) && acompanhanteApi.length ? acompanhanteApi : defaultCompanions);
      setDietas(Array.isArray(dietasApi) && dietasApi.length ? dietasApi : defaultDietas);
      setVias(Array.isArray(viasApi) && viasApi.length ? viasApi : defaultVias);
      setRegistros(Array.isArray(pacientesApi) && pacientesApi.length ? pacientesApi.map(normalizePaciente) : seedData);
      setErroConexao('');
    } catch (error) {
      setErroConexao('Não foi possível conectar ao banco local. Verifique se o servidor está em execução em http://localhost:3001.');
      setRegistros(seedData);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const listaFiltrada = useMemo(() => {
    const textoBusca = busca.toLowerCase();
    return registros.filter((item) => {
      const texto = [item.nome, item.leito, item.dieta, item.restricao, item.alergias, item.prontuario]
        .join(' ')
        .toLowerCase();

      const passaBusca = !textoBusca || texto.includes(textoBusca);
      const passaSetor = !filtroSetor || item.setor === filtroSetor;
      const passaDieta = !filtroDieta || (item.dieta || '').split(' + ').includes(filtroDieta);
      return passaBusca && passaSetor && passaDieta;
    });
  }, [registros, busca, filtroSetor, filtroDieta]);

  const resumo = useMemo(() => {
    const restricoes = registros.filter((r) => r.restricao || r.alergias).length;
    const zeroNpo = registros.filter((r) => ['Zero Lactose', 'NPO'].some((d) => (r.dieta || '').split(' + ').includes(d))).length;
    const enterais = registros.filter((r) => ['Enteral', 'Parenteral'].some((d) => (r.dieta || '').split(' + ').includes(d))).length;
    return [
      { label: 'Pacientes', value: registros.length },
      { label: 'Restrições/alertas', value: restricoes },
      { label: 'Zero/NPO', value: zeroNpo },
      { label: 'Enteral/parenteral', value: enterais },
      { label: 'Exibidos', value: listaFiltrada.length },
    ];
  }, [registros, listaFiltrada]);

  const grupos = useMemo(() => {
    const mapa = new Map();
    listaFiltrada.forEach((item) => {
      if (!mapa.has(item.setor)) mapa.set(item.setor, []);
      mapa.get(item.setor).push(item);
    });
    return [...mapa.entries()].map(([setor, itens]) => ({ setor, itens: itens.sort((a, b) => leitos.indexOf(a.leito) - leitos.indexOf(b.leito)) }));
  }, [listaFiltrada, leitos]);

  const atualizarLeitos = (setorSelecionado = form.setor) => {
    const opcoes = leitosDoSetor(setorSelecionado, leitos);
    return opcoes;
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (field === 'nascimento') {
      setForm((prev) => ({ ...prev, idade: calcularIdade(value) }));
    }
  };

  const handleSalvar = async () => {
    if (!form.setor) return alert('Selecione o setor.');
    if (!form.leito) return alert('Selecione o leito.');
    if (!form.dieta) return alert('Selecione pelo menos uma dieta.');

    const payload = {
      ...form,
      idade: calcularIdade(form.nascimento) || form.idade,
      internacao: form.internacao || novoValorDataHora(),
      dieta: form.dieta,
    };

    try {
      const endpoint = form.id ? `${API_BASE}/pacientes/${form.id}` : `${API_BASE}/pacientes`;
      const response = await fetch(endpoint, {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const dadosResposta = await response.json();
      if (!response.ok) {
        throw new Error(dadosResposta.error || 'Erro ao salvar paciente.');
      }

      setForm({
        ...initialForm,
        internacao: novoValorDataHora(),
        status: statusOpcoes[0],
        acompanhante: acompanhanteOpcoes[0],
        via: vias[0],
      });

      await carregarDados();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleExcluir = async () => {
    const paciente = registros.find((item) => item.id === form.id || item.leito === form.leito);
    if (!paciente?.id) return alert('Selecione um paciente antes de excluir.');
    if (!window.confirm('Excluir os dados deste leito?')) return;

    try {
      const response = await fetch(`${API_BASE}/pacientes/${paciente.id}`, { method: 'DELETE' });
      const dadosResposta = await response.json();
      if (!response.ok) {
        throw new Error(dadosResposta.error || 'Erro ao excluir paciente.');
      }

      setForm({
        ...initialForm,
        internacao: novoValorDataHora(),
        status: statusOpcoes[0],
        acompanhante: acompanhanteOpcoes[0],
        via: vias[0],
      });

      await carregarDados();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDietaToggle = (valor) => {
    const atuais = (form.dieta || '').split(' + ').filter(Boolean);
    const jaExiste = atuais.includes(valor);
    const proximo = jaExiste ? atuais.filter((item) => item !== valor) : [...atuais, valor].slice(0, 4);

    if (!jaExiste && proximo.length > 4) {
      alert('Selecione no máximo 4 opções de dieta.');
      return;
    }

    setForm((prev) => ({ ...prev, dieta: proximo.join(' + ') }));
  };

  const handleEditarLinha = (item) => {
    setForm({
      ...initialForm,
      ...item,
      idade: item.idade || calcularIdade(item.nascimento),
      status: item.status || statusOpcoes[0],
      acompanhante: item.acompanhante || acompanhanteOpcoes[0],
      via: item.via || vias[0],
      dieta: item.dieta || '',
    });
  };

  const handleConfigApply = async () => {
    const configSetores = document.getElementById('configSetores')?.value?.split(/\r?\n/).filter(Boolean) || [];
    const configLeitos = document.getElementById('configLeitos')?.value?.split(/\r?\n/).filter(Boolean) || [];
    const configStatus = document.getElementById('configStatus')?.value?.split(/\r?\n/).filter(Boolean) || [];
    const configAcompanhante = document.getElementById('configAcompanhante')?.value?.split(/\r?\n/).filter(Boolean) || [];
    const configDietas = document.getElementById('configDietas')?.value?.split(/\r?\n/).filter(Boolean) || [];
    const configVias = document.getElementById('configVias')?.value?.split(/\r?\n/).filter(Boolean) || [];

    if (!configSetores.length || !configLeitos.length) {
      alert('Preencha setores e leitos para aplicar a configuração.');
      return;
    }

    try {
      await Promise.all([
        fetch(`${API_BASE}/config/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configStatus.length ? configStatus : defaultStatus),
        }),
        fetch(`${API_BASE}/config/acompanhante`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configAcompanhante.length ? configAcompanhante : defaultCompanions),
        }),
        fetch(`${API_BASE}/config/dietas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configDietas.length ? configDietas : defaultDietas),
        }),
        fetch(`${API_BASE}/config/vias`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configVias.length ? configVias : defaultVias),
        }),
      ]);

      setSetores(configSetores);
      setLeitos(configLeitos);
      setStatusOpcoes(configStatus.length ? configStatus : defaultStatus);
      setAcompanhanteOpcoes(configAcompanhante.length ? configAcompanhante : defaultCompanions);
      setDietas(configDietas.length ? configDietas : defaultDietas);
      setVias(configVias.length ? configVias : defaultVias);
      setConfigOpen(false);
      await carregarDados();
    } catch (error) {
      alert('Não foi possível salvar as configurações no banco.');
    }
  };

  const resetarFormulario = () => setForm({ ...initialForm, status: statusOpcoes[0], acompanhante: acompanhanteOpcoes[0], via: vias[0] });

  return (
    <>
      <div className="topbar">Dashboard - Mapa de Dietas</div>
      <main className="app-shell">
        <section className="panel form-panel">
          <h2>Paciente</h2>

          <label>Data/hora da internação</label>
          <input type="datetime-local" value={form.internacao} onChange={(e) => handleChange('internacao', e.target.value)} />

          <label>Setor</label>
          <select value={form.setor} onChange={(e) => handleChange('setor', e.target.value)}>
            <option value="">Selecione</option>
            {setores.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>

          <label>Leito</label>
          <select value={form.leito} onChange={(e) => handleChange('leito', e.target.value)}>
            <option value="">Selecione</option>
            {atualizarLeitos().map((item) => <option key={item} value={item}>{item}</option>)}
          </select>

          <div className="row-2">
            <div>
              <label>Horário da refeição</label>
              <select value={form.status} onChange={(e) => handleChange('status', e.target.value)}>
                {statusOpcoes.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label>Prontuário</label>
              <input value={form.prontuario} onChange={(e) => handleChange('prontuario', e.target.value)} />
            </div>
          </div>

          <label>Nome</label>
          <input value={form.nome} onChange={(e) => handleChange('nome', e.target.value)} />

          <div className="row-2">
            <div>
              <label>Data de nascimento</label>
              <input type="date" value={form.nascimento} onChange={(e) => handleChange('nascimento', e.target.value)} />
            </div>
            <div>
              <label>Idade</label>
              <input value={form.idade || calcularIdade(form.nascimento)} readOnly />
            </div>
          </div>

          <label>Nome da mãe</label>
          <input value={form.mae} onChange={(e) => handleChange('mae', e.target.value)} />

          <div className="row-2">
            <div>
              <label>Acompanhante</label>
              <select value={form.acompanhante} onChange={(e) => handleChange('acompanhante', e.target.value)}>
                {acompanhanteOpcoes.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label>Via</label>
              <select value={form.via} onChange={(e) => handleChange('via', e.target.value)}>
                {vias.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </div>

          <label>Justificativa da dieta do acompanhante</label>
          <input value={form.justAcompanhante} onChange={(e) => handleChange('justAcompanhante', e.target.value)} />

          <label>Dieta</label>
          <div className="checks-grid">
            {dietas.map((item) => (
              <label className="check-option" key={item}>
                <input
                  type="checkbox"
                  checked={(form.dieta || '').split(' + ').includes(item)}
                  onChange={() => handleDietaToggle(item)}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>

          <label>Restrição alimentar</label>
          <input value={form.restricao} onChange={(e) => handleChange('restricao', e.target.value)} />

          <label>Alergias</label>
          <input value={form.alergias} onChange={(e) => handleChange('alergias', e.target.value)} />

          <label>Observações</label>
          <textarea value={form.obs} onChange={(e) => handleChange('obs', e.target.value)} />

          <div className="actions-grid">
            <button onClick={handleSalvar}>Adicionar ao mapa</button>
            <button className="secondary" onClick={resetarFormulario}>Novo</button>
            <button className="ghost" onClick={() => window.print()}>Imprimir setor</button>
            <button className="danger" onClick={handleExcluir}>Excluir leito</button>
          </div>
        </section>

        <section className="panel main-panel">
          <div className="summary-grid">
            {resumo.map((item) => (
              <div className="summary-card" key={item.label}>
                <div className="summary-number">{item.value}</div>
                <div className="summary-label">{item.label}</div>
              </div>
            ))}
          </div>

          {erroConexao && <div className="empty-state">{erroConexao}</div>}

          <div className="toolbar-grid">
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por leito, nome, dieta, restrição ou alergia" />
            <select value={filtroSetor} onChange={(e) => setFiltroSetor(e.target.value)}>
              <option value="">Escolha o setor</option>
              {setores.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={filtroDieta} onChange={(e) => setFiltroDieta(e.target.value)}>
              <option value="">Todas as dietas</option>
              {dietas.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button className="secondary">Imprimir setor</button>
            <button className="secondary">Imprimir todos</button>
            <button className="ghost" onClick={() => setRegistros([])}>Limpar mapa</button>
            <button className="ghost" onClick={() => setConfigOpen((prev) => !prev)}>Configurar áreas</button>
          </div>

          {configOpen && (
            <div className="config-panel open">
              <h3>Configurações</h3>
              <label>Setores</label>
              <textarea id="configSetores" defaultValue={setores.join('\n')} />

              <div className="row-2">
                <div>
                  <label>Leitos</label>
                  <textarea id="configLeitos" defaultValue={leitos.join('\n')} />
                </div>
                <div>
                  <label>Horário da refeição</label>
                  <textarea id="configStatus" defaultValue={statusOpcoes.join('\n')} />
                </div>
              </div>

              <div className="row-2">
                <div>
                  <label>Acompanhante</label>
                  <textarea id="configAcompanhante" defaultValue={acompanhanteOpcoes.join('\n')} />
                </div>
                <div>
                  <label>Dietas</label>
                  <textarea id="configDietas" defaultValue={dietas.join('\n')} />
                </div>
              </div>

              <label>Vias</label>
              <textarea id="configVias" defaultValue={vias.join('\n')} />

              <div className="actions-grid">
                <button className="secondary" onClick={handleConfigApply}>Aplicar configurações</button>
                <button className="ghost" onClick={() => setConfigOpen(false)}>Fechar</button>
              </div>
            </div>
          )}

          <div className="map-container">
            {carregando ? (
              <div className="empty-state">Carregando dados do banco Dieta...</div>
            ) : grupos.length === 0 ? (
              <div className="empty-state">Nenhum paciente no mapa.</div>
            ) : (
              grupos.map(({ setor, itens }) => (
                <section key={setor} className="setor-section">
                  <div className="setor-title">{setor}</div>
                  <table>
                    <thead>
                      <tr>
                        <th>Leito</th>
                        <th>Paciente</th>
                        <th>Dieta</th>
                        <th>Via</th>
                        <th>Acomp.</th>
                        <th>Justif. acomp.</th>
                        <th>Internação</th>
                        <th>Tempo</th>
                        <th>Restrição</th>
                        <th>Alergias</th>
                        <th>Observações</th>
                        <th>Horário da refeição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((item) => (
                        <tr key={item.id ?? item.leito} onClick={() => handleEditarLinha(item)} className={item.alergias || item.restricao ? 'alerta' : ''}>
                          <td><strong>{item.leito || ''}</strong></td>
                          <td>
                            <div>{item.nome || ''}</div>
                            <div className="muted">Nasc.: {formatarData(item.nascimento) || '-'}</div>
                            <div className="muted">Idade: {item.idade || calcularIdade(item.nascimento) || '-'}</div>
                            <div className="muted">Mãe: {item.mae || '-'}</div>
                            <div className="muted">Pront.: {item.prontuario || '-'}</div>
                          </td>
                          <td><span className="badge">{item.dieta || '-'}</span></td>
                          <td>{item.via || ''}</td>
                          <td>{item.acompanhante || ''}</td>
                          <td>{item.justAcompanhante || ''}</td>
                          <td>{formatarDateTime(item.internacao)}</td>
                          <td>{item.internacao ? 'Em andamento' : ''}</td>
                          <td>{item.restricao || ''}</td>
                          <td>{item.alergias || ''}</td>
                          <td>{item.obs || ''}</td>
                          <td>{item.status || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ))
            )}
          </div>
        </section>
      </main>
    </>
  );
}

export default App;
