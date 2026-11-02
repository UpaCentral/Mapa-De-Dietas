import { supabase, systemTables } from "./supabase";

const storagePrefix = (systemId) => `upa:${systemId}:`;

const previousStorageKeys = {
  cabecalho: ["cabPacienteMaoAmigaFinal"],
  dietas: [],
  processo: ["saeConfig", "saeEdicoes", "saeOcultos", "saeCampos"],
  sae: ["saeConfig", "saeEdicoes", "saeOcultos", "saeCampos"],
};

function readLocalState(systemId) {
  const prefix = storagePrefix(systemId);
  const state = {};

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(prefix)) {
      state[key.slice(prefix.length)] = localStorage.getItem(key);
    }
  }

  return state;
}

function applyLocalState(systemId, state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new Error("Os dados recebidos do Supabase têm um formato inválido.");
  }

  const entries = Object.entries(state);
  if (entries.some(([, value]) => typeof value !== "string")) {
    throw new Error("Os dados do sistema estão inválidos no Supabase.");
  }

  const prefix = storagePrefix(systemId);
  const existingKeys = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(prefix)) existingKeys.push(key);
  }

  existingKeys.forEach((key) => localStorage.removeItem(key));

  entries.forEach(([key, value]) => {
    localStorage.setItem(`${prefix}${key}`, value);
  });
}

async function saveSystemState(systemId, userId, state = readLocalState(systemId)) {
  const table = systemTables[systemId];
  if (!table || !supabase) {
    throw new Error("A integração com o Supabase não está configurada.");
  }

  const { error } = await supabase.from(table).upsert(
    {
      id: "shared",
      payload: state,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    },
    { onConflict: "id" },
  );

  if (error) throw error;
}

export async function loadSystemState(systemId, userId) {
  const table = systemTables[systemId];
  if (!table || !supabase) {
    throw new Error("A integração com o Supabase não está configurada.");
  }

  const { data, error } = await supabase
    .from(table)
    .select("payload")
    .eq("id", "shared")
    .maybeSingle();

  if (error) throw error;

  if (data) {
    applyLocalState(systemId, data.payload);
    return;
  }

  const oldKeys = previousStorageKeys[systemId] || [];
  const previousState = Object.fromEntries(
    oldKeys
      .map((key) => [key, localStorage.getItem(key)])
      .filter(([, value]) => value !== null),
  );

  const localState = readLocalState(systemId);
  const stateToMigrate = { ...localState, ...previousState };
  if (Object.keys(stateToMigrate).length > 0) {
    applyLocalState(systemId, stateToMigrate);
    await saveSystemState(systemId, userId, stateToMigrate);
  }
}

export function saveLoadedSystemState(systemId, userId) {
  return saveSystemState(systemId, userId);
}

export function getSystemStoragePrefix(systemId) {
  return storagePrefix(systemId);
}

export function clearSystemStorageCache() {
  const prefixes = Object.keys(systemTables).map(storagePrefix);
  const keysToRemove = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && prefixes.some((prefix) => key.startsWith(prefix))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
