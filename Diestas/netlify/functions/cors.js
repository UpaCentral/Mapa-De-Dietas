const allowedOrigins = new Set([
  "https://mapa-de-dietas.tiupacentral.workers.dev",
  "https://upadieta.netlify.app",
  "https://dieta.upacentral.co.uk",
  "https://www.dieta.upacentral.co.uk",
]);

export function corsHeaders(origin) {
  if (!origin) return null;
  if (!allowedOrigins.has(origin) && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return null;
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}