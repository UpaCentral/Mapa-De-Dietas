export function resolveApiBase(configuredBase = import.meta.env?.VITE_API_BASE) {
  return (configuredBase || '/api').replace(/\/+$/, '');
}
