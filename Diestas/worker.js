import { handleApiRequest } from './server/api.js';

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return handleApiRequest(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};