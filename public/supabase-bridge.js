(function () {
  const script = document.currentScript;
  const systemId = script && script.dataset.app;
  if (!systemId) return;
  document.documentElement.dataset.clinicalUi = systemId;

  if (window.parent === window) {
    document.documentElement.style.visibility = "hidden";
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        document.title = "Acesso pelo portal";
        document.body.innerHTML =
          '<main style="max-width:560px;margin:12vh auto;padding:24px;font:16px Arial,sans-serif;line-height:1.5"><h1>Acesso pelo portal</h1><p>Entre no portal UPA Central para acessar este sistema.</p></main>';
        document.documentElement.style.visibility = "visible";
      },
      { once: true },
    );
    return;
  }

  const prefix = `upa:${systemId}:`;
  const systemNames = {
    cabecalho: "Cabeceira do Paciente",
    dietas: "Mapa de Dietas",
    processo: "Processo de Enfermagem",
    sae: "SAE Enfermagem",
  };
  const storage = window.localStorage;
  const prototype = Storage.prototype;
  const originalGetItem = prototype.getItem;
  const originalSetItem = prototype.setItem;
  const originalRemoveItem = prototype.removeItem;
  const originalClear = prototype.clear;
  const originalKey = prototype.key;
  const lengthDescriptor = Object.getOwnPropertyDescriptor(prototype, "length");

  function isPageStorage(target) {
    return target === storage;
  }

  function scopedKey(key) {
    const value = String(key);
    return value.startsWith(prefix) ? value : `${prefix}${value}`;
  }

  function notifyParent(key) {
    if (window.parent === window) return;
    window.parent.postMessage(
      { type: "upa-system-storage-changed", systemId, key },
      window.location.origin,
    );
  }

  prototype.getItem = function (key) {
    return originalGetItem.call(
      this,
      isPageStorage(this) ? scopedKey(key) : key,
    );
  };

  prototype.setItem = function (key, value) {
    const isolated = isPageStorage(this);
    const keyToSet = isolated ? scopedKey(key) : key;
    const result = originalSetItem.call(this, keyToSet, value);
    if (isolated) notifyParent(keyToSet);
    return result;
  };

  prototype.removeItem = function (key) {
    const isolated = isPageStorage(this);
    const keyToRemove = isolated ? scopedKey(key) : key;
    const result = originalRemoveItem.call(this, keyToRemove);
    if (isolated) notifyParent(keyToRemove);
    return result;
  };

  prototype.clear = function () {
    if (!isPageStorage(this)) return originalClear.call(this);

    const keys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = originalKey.call(storage, index);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => originalRemoveItem.call(storage, key));
    if (keys.length > 0) notifyParent("*");
  };

  prototype.key = function (index) {
    if (!isPageStorage(this)) return originalKey.call(this, index);

    const keys = [];
    for (let current = 0; current < storage.length; current += 1) {
      const key = originalKey.call(storage, current);
      if (key && key.startsWith(prefix)) keys.push(key.slice(prefix.length));
    }
    return keys[index] || null;
  };

  if (lengthDescriptor && lengthDescriptor.get) {
    Object.defineProperty(prototype, "length", {
      configurable: lengthDescriptor.configurable,
      enumerable: lengthDescriptor.enumerable,
      get() {
        if (!isPageStorage(this)) return lengthDescriptor.get.call(this);

        let count = 0;
        for (let index = 0; index < storage.length; index += 1) {
          const key = originalKey.call(storage, index);
          if (key && key.startsWith(prefix)) count += 1;
        }
        return count;
      },
    });
  }

  function getFormControls(form) {
    return Array.from(form.querySelectorAll("input[id], select[id], textarea[id]"))
      .filter(
        (control) =>
          !["password", "file", "button", "submit", "reset"].includes(
            control.type,
          ),
      );
  }

  function saveForm(form) {
    const state = {};
    getFormControls(form).forEach((control) => {
      state[control.id] =
        control.type === "checkbox" || control.type === "radio"
          ? control.checked
          : control.value;
    });
    storage.setItem(`${prefix}__form_state`, JSON.stringify(state));
  }

  function sendHistoryMessage(type, details) {
    window.parent.postMessage(
      { type, systemId, ...details },
      window.location.origin,
    );
  }

  function normalizedPatientKey(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLocaleUpperCase("pt-BR");
  }

  function getControlLabel(control) {
    const label =
      control.labels?.[0] ||
      (control.id && document.querySelector(`label[for="${control.id}"]`)) ||
      control.closest("label");
    const text = label?.innerText?.trim().replace(/\s+/g, " ");
    return text || control.name || control.id;
  }

  function snapshotForm(form) {
    const fields = {};
    const labels = {};
    getFormControls(form).forEach((control) => {
      fields[control.id] =
        control.type === "checkbox" || control.type === "radio"
          ? control.checked
          : control.value;
      labels[control.id] = getControlLabel(control);
    });

    return { fields, labels };
  }

  function capturePatientForm(form) {
    const isHeader = systemId === "cabecalho";
    const nameControl = form.querySelector(isHeader ? "#nome" : "#paciente");
    const recordControl = form.querySelector(isHeader ? "#pront" : "#registro");
    const patientName = nameControl?.value.trim();
    const recordNumber = recordControl?.value.trim();
    if (!patientName || !recordNumber) return;

    sendHistoryMessage("upa-patient-history-save", {
      patientKey: `registro:${normalizedPatientKey(recordNumber)}`,
      patientName,
      recordNumber,
      snapshot: snapshotForm(form),
    });
  }

  function addDietRecordToHistory(draft, previousRecords) {
    window.setTimeout(() => {
      let records;
      try {
        records = JSON.parse(storage.getItem("mapaDietasRegistros") || "[]");
      } catch (error) {
        sendHistoryMessage("upa-patient-history-save", {
          error: "Não foi possível ler o paciente recém-adicionado ao mapa.",
        });
        return;
      }

      if (!Array.isArray(records)) return;
      const current = records.find(
        (record) =>
          (draft.prontuario &&
            normalizedPatientKey(record.prontuario) ===
              normalizedPatientKey(draft.prontuario)) ||
          (record.leito === draft.leito && record.setor === draft.setor),
      );
      if (!current || !current.nome) return;

      const previous = previousRecords.find(
        (record) =>
          (draft.prontuario &&
            normalizedPatientKey(record.prontuario) ===
              normalizedPatientKey(draft.prontuario)) ||
          (record.leito === draft.leito && record.setor === draft.setor),
      );
      if (previous && JSON.stringify(previous) === JSON.stringify(current)) {
        return;
      }

      const recordNumber = String(current.prontuario || "").trim();
      const locationKey = `${current.setor || ""}|${current.leito || ""}`;
      const fields = Object.fromEntries(
        Object.entries(current).map(([key, value]) => [
          key,
          Array.isArray(value) ? value.join(", ") : value,
        ]),
      );
      const labels = {
        leito: "Leito",
        status: "Horário da refeição",
        nome: "Nome",
        nascimento: "Data de nascimento",
        idade: "Idade",
        mae: "Nome da mãe",
        prontuario: "Prontuário",
        setor: "Setor",
        acompanhante: "Acompanhante",
        justAcompanhante: "Justificativa do acompanhante",
        internacao: "Data e hora da internação",
        dieta: "Dieta",
        via: "Via",
        restricao: "Restrição alimentar",
        alergias: "Alergias",
        obs: "Observações",
      };

      sendHistoryMessage("upa-patient-history-save", {
        patientKey: recordNumber
          ? `registro:${normalizedPatientKey(recordNumber)}`
          : `leito:${normalizedPatientKey(locationKey)}:${normalizedPatientKey(current.nome)}`,
        patientName: current.nome,
        recordNumber,
        snapshot: { fields, labels },
      });
    }, 0);
  }

  function addHistoryInterface() {
    const trigger = document.createElement("button");
    trigger.className = "upa-history-trigger";
    trigger.type = "button";
    trigger.textContent = "Histórico (7 dias)";
    trigger.setAttribute("aria-haspopup", "dialog");

    const overlay = document.createElement("div");
    overlay.className = "upa-history-overlay";
    overlay.hidden = true;
    overlay.innerHTML =
      '<section class="upa-history-dialog" role="dialog" aria-modal="true" aria-labelledby="upa-history-title">' +
      '<header class="upa-history-header"><div><h2 id="upa-history-title">Histórico de pacientes</h2><p>Registros disponíveis por 7 dias após a última atualização.</p></div>' +
      '<button class="upa-history-close" type="button" aria-label="Fechar histórico">×</button></header>' +
      '<div class="upa-history-filters" role="search" aria-label="Filtros do histórico">' +
      '<label class="upa-history-search">Buscar paciente, prontuário, setor ou leito<input class="upa-history-query" type="search" placeholder="Digite para buscar" autocomplete="off"></label>' +
      '<label>Atualizado a partir de<input class="upa-history-from" type="date"></label>' +
      '<label>Atualizado até<input class="upa-history-to" type="date"></label>' +
      '<button class="upa-history-print-all" type="button" disabled>Imprimir histórico</button></div>' +
      '<p class="upa-history-message" role="status" aria-live="polite"></p>' +
      '<div class="upa-history-list"></div></section>';

    const toast = document.createElement("div");
    toast.className = "upa-history-toast";
    toast.hidden = true;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    const headerActions =
      document.querySelector(".bar .actions") ||
      document.querySelector(".topbar") ||
      document.body;
    headerActions.append(trigger);
    document.body.append(overlay, toast);

    const message = overlay.querySelector(".upa-history-message");
    const list = overlay.querySelector(".upa-history-list");
    const closeButton = overlay.querySelector(".upa-history-close");
    const searchInput = overlay.querySelector(".upa-history-query");
    const fromInput = overlay.querySelector(".upa-history-from");
    const toInput = overlay.querySelector(".upa-history-to");
    const printAllButton = overlay.querySelector(".upa-history-print-all");
    const pending = new Map();
    let requestCounter = 0;
    let toastTimer;
    let historyRecords = [];
    let filteredRecords = [];

    function showToast(text, isError = false) {
      toast.textContent = text;
      toast.classList.toggle("upa-history-toast-error", isError);
      toast.hidden = false;
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        toast.hidden = true;
      }, 5000);
    }

    function requestHistory() {
      const requestId = `${Date.now()}-${++requestCounter}`;
      return new Promise((resolve, reject) => {
        pending.set(requestId, { resolve, reject });
        sendHistoryMessage("upa-patient-history-list", { requestId });
      });
    }

    function renderHistory() {
      list.replaceChildren();
      const query = searchInput.value.trim().toLocaleLowerCase("pt-BR");
      const from = fromInput.value;
      const to = toInput.value;

      if (from && to && from > to) {
        filteredRecords = [];
        printAllButton.disabled = true;
        printAllButton.textContent = "Imprimir histórico";
        message.textContent = "A data inicial deve ser anterior à data final.";
        return;
      }

      filteredRecords = historyRecords.filter((record) => {
        const fields = record.snapshot?.fields || record.snapshot || {};
        const searchableValues = Object.values(fields)
          .flat(Infinity)
          .filter((value) => value !== null && value !== undefined)
          .map((value) =>
            typeof value === "object" ? JSON.stringify(value) : String(value),
          );
        const searchText = [
          record.patient_name,
          record.record_number,
          ...searchableValues,
        ]
          .join(" ")
          .toLocaleLowerCase("pt-BR");
        const updatedDate = record.updated_at.slice(0, 10);

        return (
          (!query || searchText.includes(query)) &&
          (!from || updatedDate >= from) &&
          (!to || updatedDate <= to)
        );
      });

      printAllButton.disabled = filteredRecords.length === 0;
      printAllButton.textContent = `Imprimir histórico (${filteredRecords.length})`;

      if (filteredRecords.length === 0) {
        message.textContent = historyRecords.length
          ? "Nenhum registro corresponde aos filtros."
          : "Nenhum registro nos últimos 7 dias.";
        return;
      }

      message.textContent = `${filteredRecords.length} de ${historyRecords.length} registro(s) encontrado(s).`;
      filteredRecords.forEach((record) => {
        const card = document.createElement("article");
        card.className = "upa-history-card";

        const details = document.createElement("div");
        details.className = "upa-history-card-details";
        const name = document.createElement("h3");
        name.textContent = record.patient_name;
        const meta = document.createElement("p");
        const updatedAt = new Date(record.updated_at).toLocaleString("pt-BR");
        const expiresAt = new Date(record.expires_at).toLocaleString("pt-BR");
        meta.textContent = [
          systemNames[record.system_id],
          record.record_number ? `Prontuário: ${record.record_number}` : "",
          `Atualizado: ${updatedAt}`,
          `Expira: ${expiresAt}`,
        ]
          .filter(Boolean)
          .join(" · ");
        details.append(name, meta);

        card.append(details);
        list.append(card);
      });
    }

    function printHistoryRecords(records) {
      const popup = window.open("", "_blank");
      if (!popup) {
        showToast("Permita janelas pop-up para imprimir o histórico.", true);
        return;
      }

      const escapeHtml = (value) =>
        String(value).replace(/[&<>"']/g, (character) => {
          const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          };
          return entities[character];
        });
      const recordSections = records.map((record) => {
        const snapshot = record.snapshot || {};
        const fields = snapshot.fields || snapshot;
        const labels = snapshot.labels || {};
        const rows = Object.entries(fields)
          .filter(([, value]) => value !== "" && value !== null && value !== undefined)
          .map(([key, value]) => {
            const displayValue =
              typeof value === "boolean"
                ? value
                  ? "Sim"
                  : "Não"
                : Array.isArray(value)
                  ? value.join(", ")
                  : typeof value === "object"
                    ? JSON.stringify(value)
                    : value;
            return `<tr><th>${escapeHtml(labels[key] || key)}</th><td>${escapeHtml(displayValue)}</td></tr>`;
          })
          .join("");

        return `<section class="record"><h2>${escapeHtml(systemNames[record.system_id] || "Histórico de pacientes")} — ${escapeHtml(record.patient_name)}</h2><p><strong>Prontuário:</strong> ${escapeHtml(record.record_number || "Não informado")}<br><strong>Atualizado:</strong> ${escapeHtml(new Date(record.updated_at).toLocaleString("pt-BR"))}<br><strong>Expira:</strong> ${escapeHtml(new Date(record.expires_at).toLocaleString("pt-BR"))}</p><table><tbody>${rows}</tbody></table></section>`;
      }).join("");

      popup.document.write(
        `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Histórico completo de pacientes</title><style>body{font:14px Arial,sans-serif;color:#172033;margin:28px}h1{font-size:24px;color:#1e40af}.summary{color:#5b677a}.actions{margin:18px 0}.actions button{border:0;border-radius:8px;padding:10px 16px;background:#1d4ed8;color:#fff;font-weight:700;cursor:pointer}.record{margin-top:28px}.record+ .record{break-before:page}h2{font-size:18px;color:#1e40af}p{color:#5b677a;line-height:1.6}table{width:100%;border-collapse:collapse}th,td{border:1px solid #d7dfeb;padding:8px;text-align:left;vertical-align:top}th{width:30%;background:#f3f6fa}tr{break-inside:avoid}@media print{body{margin:10mm}.actions{display:none}}</style></head><body><h1>Histórico completo de pacientes</h1><p class="summary">${records.length} registro(s) incluído(s), conforme os filtros aplicados.</p><div class="actions"><button type="button" onclick="window.print()">Imprimir histórico</button></div>${recordSections}</body></html>`,
      );
      popup.document.close();
      popup.focus();
    }

    async function openHistory() {
      overlay.hidden = false;
      message.textContent = "Carregando histórico...";
      list.replaceChildren();
      closeButton.focus();
      try {
        historyRecords = await requestHistory();
        renderHistory();
      } catch (error) {
        message.textContent = error.message || "Não foi possível carregar o histórico.";
      }
    }

    [searchInput, fromInput, toInput].forEach((input) => {
      input.addEventListener("input", renderHistory);
      input.addEventListener("change", renderHistory);
    });
    printAllButton.addEventListener("click", () => {
      if (filteredRecords.length > 0) printHistoryRecords(filteredRecords);
    });

    trigger.addEventListener("click", openHistory);
    closeButton.addEventListener("click", () => {
      overlay.hidden = true;
      trigger.focus();
    });
    overlay.addEventListener("click", (event) => {
      if (event.target !== overlay) return;
      overlay.hidden = true;
      trigger.focus();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !overlay.hidden) {
        overlay.hidden = true;
        trigger.focus();
      }
    });

    window.addEventListener("message", (event) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        !event.data ||
        event.data.systemId !== systemId
      ) {
        return;
      }

      const data = event.data;
      if (data.type === "upa-patient-history-response") {
        const request = pending.get(data.requestId);
        if (!request) return;
        pending.delete(data.requestId);
        if (data.error) request.reject(new Error(data.error));
        else request.resolve(data.records || []);
      } else if (data.type === "upa-patient-history-save-result") {
        showToast(
          data.error
            ? `Falha ao salvar no histórico: ${data.error}`
            : `Histórico salvo por 7 dias · ${data.patientName}`,
          Boolean(data.error),
        );
      }
    });
  }

  function setupHistoryCapture(form) {
    if (systemId === "dietas") {
      document.addEventListener(
        "click",
        (event) => {
          if (!(event.target instanceof Element) || !event.target.closest("#salvar")) {
            return;
          }
          const draft = {
            prontuario: document.getElementById("prontuario")?.value.trim(),
            setor: document.getElementById("setor")?.value,
            leito: document.getElementById("leito")?.value,
          };
          let previousRecords = [];
          try {
            previousRecords = JSON.parse(
              storage.getItem("mapaDietasRegistros") || "[]",
            );
          } catch (error) {
            showHistoryCaptureError(
              "Não foi possível ler os registros atuais do mapa.",
            );
            return;
          }
          if (!Array.isArray(previousRecords)) previousRecords = [];
          addDietRecordToHistory(draft, previousRecords);
        },
        true,
      );
      return;
    }

    let timeout;
    const scheduleCapture = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => capturePatientForm(form), 2000);
    };
    form.addEventListener("input", scheduleCapture, true);
    form.addEventListener("change", scheduleCapture, true);
  }

  function showHistoryCaptureError(text) {
    const toast = document.querySelector(".upa-history-toast");
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("upa-history-toast-error");
    toast.hidden = false;
  }

  function addSectionNavigation() {
    const form = document.querySelector("#saeForm");
    const sections = form
      ? Array.from(form.querySelectorAll(":scope > .section"))
      : [];
    if (sections.length < 3 || document.querySelector(".section-nav")) return;

    const nav = document.createElement("nav");
    nav.className = "section-nav";
    nav.setAttribute("aria-label", "Navegação pelas seções do formulário");

    const label = document.createElement("span");
    label.className = "section-nav-title";
    label.textContent = "Ir para:";
    nav.appendChild(label);

    const links = sections.map((section, index) => {
      const heading = section.querySelector("h2");
      if (!heading) return null;

      const id = `clinical-section-${index + 1}`;
      section.id = id;
      const link = document.createElement("a");
      link.href = `#${id}`;
      link.textContent = heading.textContent.trim();
      link.setAttribute("aria-label", `Ir para ${heading.textContent.trim()}`);
      nav.appendChild(link);
      return [link, section];
    }).filter(Boolean);

    if (links.length < 3) return;
    form.before(nav);

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            links.forEach(([link, section]) => {
              if (section === entry.target) {
                link.setAttribute("aria-current", "location");
              } else {
                link.removeAttribute("aria-current");
              }
            });
          });
        },
        { rootMargin: "-25% 0px -65% 0px" },
      );
      links.forEach(([, section]) => observer.observe(section));
    }
  }

  function associateStandaloneLabels() {
    document.querySelectorAll("label:not([for])").forEach((label, index) => {
      if (label.querySelector("input, select, textarea, button")) return;
      const control = label.nextElementSibling;
      if (!control || !control.matches("input, select, textarea")) return;
      if (!control.id) control.id = `clinical-${systemId}-field-${index}`;
      label.htmlFor = control.id;
    });
  }

  function makeHeaderLogosNavigable() {
    document.querySelectorAll(".topbar-logo, .brand-mark").forEach((logo) => {
      logo.setAttribute("role", "link");
      logo.setAttribute("tabindex", "0");
      logo.setAttribute("aria-label", "Voltar ao menu principal do Fluxo UPA");
      logo.title = "Voltar ao menu principal do Fluxo UPA";

      const returnToPortal = () => {
        window.parent.location.hash = "#/";
      };

      logo.addEventListener("click", returnToPortal);
      logo.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        returnToPortal();
      });
    });
  }

  document.addEventListener(
    "DOMContentLoaded",
    function () {
      const form =
        document.querySelector("#saeForm") ||
        document.querySelector(".form");
      associateStandaloneLabels();
      addSectionNavigation();
      makeHeaderLogosNavigable();
      addHistoryInterface();
      if (!form) return;

      const saved = storage.getItem(`${prefix}__form_state`);
      if (saved) {
        let state;
        try {
          state = JSON.parse(saved);
        } catch (error) {
          alert("Não foi possível restaurar os campos salvos deste sistema.");
          throw error;
        }
        if (!state || typeof state !== "object" || Array.isArray(state)) {
          throw new Error("Os campos salvos deste sistema estão inválidos.");
        }
        getFormControls(form).forEach((control) => {
          if (!Object.prototype.hasOwnProperty.call(state, control.id)) return;

          if (control.type === "checkbox" || control.type === "radio") {
            control.checked = Boolean(state[control.id]);
          } else {
            control.value = state[control.id];
          }
          control.dispatchEvent(new Event("input", { bubbles: true }));
          control.dispatchEvent(new Event("change", { bubbles: true }));
        });
      }

      form.addEventListener("input", () => saveForm(form), true);
      form.addEventListener("change", () => saveForm(form), true);
      setupHistoryCapture(form);
    },
    { once: true },
  );
})();
