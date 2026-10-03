export function resolveApiBase() {
  const configured =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE)
      ? String(import.meta.env.VITE_API_BASE).trim()
      : '';

  return configured || '/api';
}
