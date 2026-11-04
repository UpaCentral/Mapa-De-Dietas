import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);
export const supabase = supabaseConfigured
  ? createClient(url, key, {
      auth: {
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  : null;

export function clearPersistedSupabaseSession() {
  if (typeof window === "undefined" || !url) return;

  const projectReference = new URL(url).hostname.split(".")[0];
  const storageKey = `sb-${projectReference}-auth-token`;
  localStorage.removeItem(storageKey);
  localStorage.removeItem(`${storageKey}-user`);
}

export const systemTables = {
  cabecalho: "cabecalho_paciente",
  dietas: "mapa_dietas",
  processo: "processo_enfermagem",
  sae: "sae_enfermagem",
};
