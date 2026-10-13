(() => {
  const moduleName = document.body.dataset.module;
  if (!moduleName || window.self !== window.top) return;

  const apiBase = '/api';
  const form = document.querySelector('#saeForm, .panel.form, .form');
  const toolbar = document.createElement('section');
  toolbar.className = 'module-db-toolbar';
  toolbar.innerHTML = `
    <strong>Registros no banco compartilhado</strong>
    <select aria-label="Registros salvos"><option value="">Novo registro</option></select>
    <button type="button" data-action="load">Abrir</button>
    <button type="button" data-action="save">Salvar registro</button>
    <button type="button" data-action="delete">Excluir</button>
    <button type="button" data-action="connect">Conectar banco</button>
    <span class="module-db-status" role="status">Banco desconectado</span>
    <dialog class="module-db-dialog">
      <form method="dialog" class="module-db-login">
        <h2>Conectar ao banco compartilhado</h2>
        <label>Usuário<input name="username" autocomplete="username" value="UPADieta" required></label>
        <label>Senha<input name="password" type="password" autocomplete="current-password" required></label>
        <p class="module-db-error" role="alert"></p>
        <div><button type="button" data-action="cancel">Cancelar</button><button type="submit">Entrar</button></div>
      </form>
    </dialog>`;
  document.body.prepend(toolbar);

  const style = document.createElement('style');
  style.textContent = `
    .module-db-toolbar{position:sticky;top:0;z-index:10000;display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 16px;background:rgba(3,26,74,.96);border-bottom:1px solid rgba(90,170,255,.5);color:#fff;font:600 13px "Segoe UI",Arial,sans-serif;box-shadow:0 8px 22px rgba(0,0,0,.2)}
    .module-db-toolbar strong{margin-right:auto;color:#dfeeff}
    .module-db-toolbar select{width:min(260px,100%);margin:0;padding:8px 10px;border:1px solid rgba(90,170,255,.5);border-radius:8px;background:#fff;color:#10213b}
    .module-db-toolbar button{width:auto;margin:0;padding:8px 12px;border:1px solid rgba(255,255,255,.25);border-radius:8px;background:#1e90ff;color:#fff;font-weight:700;font-size:13px}
    .module-db-toolbar button[data-action="delete"]{background:#bd3446}
    .module-db-status{min-width:130px;color:#cfe6ff;font-weight:500}
    .module-db-toolbar dialog{width:min(420px,calc(100vw - 28px));padding:0;border:1px solid #3bb0ff;border-radius:14px;box-shadow:0 20px 70px rgba(0,0,0,.45)}
    .module-db-toolbar dialog::backdrop{background:rgba(2,12,35,.72);backdrop-filter:blur(3px)}
    .module-db-login{display:grid;gap:12px;padding:22px;color:#10213b}
    .module-db-login h2{margin:0;font-size:20px}
    .module-db-login label{display:grid;gap:5px;font-size:13px}
    .module-db-login input{width:100%;margin:0;padding:10px;border:1px solid #b7cbe3;border-radius:8px}
    .module-db-login div{display:flex;justify-content:flex-end;gap:8px}
    .module-db-login button{width:auto;margin:0;padding:9px 14px;border:0;border-radius:8px;background:#1e90ff;color:#fff;font-weight:700}
    .module-db-login [data-action="cancel"]{background:#e9eff7;color:#17385f}
    .module-db-error{min-height:18px;margin:0;color:#b42318;font-size:13px}
    @media(max-width:700px){.module-db-toolbar strong{width:100%}.module-db-toolbar select{flex:1}.module-db-status{width:100%}}
    @media print{.module-db-toolbar{display:none!important}}
  `;
  document.head.append(style);

  const select = toolbar.querySelector('select');
  const status = toolbar.querySelector('.module-db-status');
  const dialog = toolbar.querySelector('dialog');
  const loginForm = toolbar.querySelector('.module-db-login');
  let activeId = '';
  let loginResolver;

  select.addEventListener('change', () => {
    activeId = '';
  });

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.style.color = isError ? '#ffc7cd' : '#cfe6ff';
  }

  async function api(path, options = {}) {
    const token = sessionStorage.getItem('dieta-session') || '';
    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    if (options.body) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${apiBase}${path}`, { ...options, headers });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Falha ao acessar o banco.');
    return result;
  }

  async function connect() {
    const token = sessionStorage.getItem('dieta-session');
    if (token) {
      try {
        await api('/session');
        return true;
      } catch {
        sessionStorage.removeItem('dieta-session');
      }
    }

    return new Promise((resolve) => {
      loginResolver = resolve;
      loginForm.reset();
      loginForm.elements.username.value = 'UPADieta';
      loginForm.querySelector('.module-db-error').textContent = '';
      dialog.showModal();
      loginForm.elements.username.focus();
    });
  }

  async function refreshRecords() {
    const rows = await api(`/modulos/${moduleName}`);
    select.replaceChildren(new Option('Novo registro', ''));
    rows.forEach((row) => {
      const updated = row.updated_at ? new Date(row.updated_at).toLocaleString('pt-BR') : '';
      select.add(new Option(`${row.paciente} · ${updated}`, String(row.id)));
    });
    if (activeId && rows.some((row) => String(row.id) === activeId)) select.value = activeId;
    setStatus(`${rows.length} registro(s) no banco`);
    return rows;
  }

  function controls() {
    if (!form) return [];
    return [...form.querySelectorAll('input,select,textarea')].filter((control) =>
      !control.closest('#configModal') && !control.closest('#prescTable') && !control.matches('[type="button"],[type="submit"],[type="reset"]'));
  }

  function readControl(control, index) {
    const key = control.id || control.name || `pos:${index}`;
    let value = control.value;
    if (control.type === 'checkbox' || control.type === 'radio') value = control.checked;
    if (control.multiple) value = [...control.selectedOptions].map((option) => option.value);
    return { key, type: control.type, value };
  }

  function captureTable() {
    const table = form?.querySelector('#prescTable tbody');
    if (!table) return null;
    return [...table.rows].map((row) => [...row.querySelectorAll('input,select,textarea')].map((control) => ({
      type: control.type,
      value: control.type === 'checkbox' || control.type === 'radio' ? control.checked : control.value,
    })));
  }

  function snapshot() {
    const fields = controls().map(readControl);
    const tables = captureTable();
    return { fields, ...(tables ? { prescriptionRows: tables } : {}) };
  }

  function setControl(control, item) {
    if (control.type === 'checkbox' || control.type === 'radio') control.checked = Boolean(item.value);
    else if (control.multiple && Array.isArray(item.value)) {
      [...control.options].forEach((option) => { option.selected = item.value.includes(option.value); });
    } else control.value = item.value ?? '';
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function restoreTable(rows) {
    const tbody = form?.querySelector('#prescTable tbody');
    if (!tbody || !Array.isArray(rows) || typeof window.addPresc !== 'function') return;
    tbody.replaceChildren();
    rows.forEach(() => {
      if (moduleName === 'processo-enfermagem') window.addPresc('', '', '', '');
      else window.addPresc('', '');
    });
    [...tbody.rows].forEach((row, rowIndex) => {
      [...row.querySelectorAll('input,select,textarea')].forEach((control, controlIndex) => {
        const item = rows[rowIndex]?.[controlIndex];
        if (item) setControl(control, item);
      });
    });
  }

  function restore(data) {
    const fields = controls();
    const keyed = new Map((data.fields || []).map((item) => [item.key, item]));
    fields.forEach((control, index) => {
      const item = keyed.get(control.id || control.name || `pos:${index}`) || data.fields?.[index];
      if (item) setControl(control, item);
    });
    restoreTable(data.prescriptionRows);
    if (typeof window.atualizar === 'function') window.atualizar();
    if (typeof window.atualizaAlertas === 'function') window.atualizaAlertas();
  }

  function patientName() {
    const patient = form?.querySelector('#nome, #paciente, [name="paciente"]');
    return String(patient?.value || '').trim();
  }

  toolbar.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    try {
      if (action === 'cancel') {
        dialog.close();
        loginResolver?.(false);
        loginResolver = null;
        return;
      }
      if (action === 'connect') {
        if (await connect()) await refreshRecords();
        return;
      }
      if (action === 'load') {
        const recordId = select.value;
        if (!recordId) return setStatus('Selecione um registro salvo.', true);
        if (!await connect()) return;
        const rows = await refreshRecords();
        const record = rows.find((row) => String(row.id) === recordId);
        if (!record) throw new Error('Registro não encontrado. Atualize a lista.');
        restore(record.dados);
        activeId = recordId;
        select.value = activeId;
        setStatus(`Registro de ${record.paciente} carregado`);
        return;
      }
      if (action === 'save') {
        if (!form) throw new Error('Formulário não encontrado nesta página.');
        const paciente = patientName();
        if (!paciente) throw new Error('Preencha o nome do paciente antes de salvar.');
        if (!await connect()) return;
        const method = activeId ? 'PUT' : 'POST';
        const path = `/modulos/${moduleName}${activeId ? `/${activeId}` : ''}`;
        const result = await api(path, { method, body: JSON.stringify({ paciente, dados: snapshot() }) });
        activeId = String(result.id || activeId);
        await refreshRecords();
        select.value = activeId;
        setStatus('Registro salvo no banco compartilhado');
        return;
      }
      if (action === 'delete') {
        if (!activeId) throw new Error('Selecione e abra um registro antes de excluir.');
        if (!window.confirm('Excluir definitivamente este registro do banco?')) return;
        if (!await connect()) return;
        await api(`/modulos/${moduleName}/${activeId}`, { method: 'DELETE' });
        activeId = '';
        await refreshRecords();
        setStatus('Registro excluído');
      }
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const errorBox = loginForm.querySelector('.module-db-error');
    const submit = loginForm.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const response = await fetch(`${apiBase}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginForm.elements.username.value.trim(), password: loginForm.elements.password.value }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Usuário ou senha incorretos.');
      sessionStorage.setItem('dieta-session', result.token);
      dialog.close();
      loginResolver?.(true);
      loginResolver = null;
      setStatus('Conectado ao banco compartilhado');
    } catch (error) {
      errorBox.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });

  dialog.addEventListener('cancel', () => {
    loginResolver?.(false);
    loginResolver = null;
  });

  if (sessionStorage.getItem('dieta-session')) {
    connect().then((connected) => connected && refreshRecords()).catch((error) => setStatus(error.message, true));
  }
})();
