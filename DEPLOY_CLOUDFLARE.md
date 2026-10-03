# Frontend Cloudflare

O frontend e servido por um Worker de assets estaticos em `https://mapa-de-dietas.tiupacentral.workers.dev`. O backend pode continuar no Netlify e a app usa `VITE_API_BASE` para apontar para a API correta.

## Publicacao

1. Na pasta `Diestas`, instale as dependencias com `npm install`.
2. Crie o banco D1 e substitua o `database_id` em `wrangler.jsonc` pelo valor real do Cloudflare.
3. Copie `.env.cloudflare.example` para `.env.cloudflare` e ajuste `VITE_API_BASE` com o endereco do backend real, ou deixe `/api` para usar o Worker do proprio projeto.
4. Autentique o Wrangler na conta Cloudflare com `npx wrangler login`.
5. Execute `npm run deploy:cloudflare`.

O nome em `wrangler.jsonc` determina o subdominio do Worker. A conta Cloudflare precisa ter o subdominio `tiupacentral` ativo para gerar exatamente o endereco informado. Se o backend Netlify usar outro dominio, atualize `VITE_API_BASE` em `.env.cloudflare` e inclua a origem Cloudflare no allowlist de `netlify/functions/cors.js`.

## Variaveis de ambiente

- `.env.cloudflare.example` define a URL do backend usado pelo front em producao.
- `.dev.vars.example` guarda os valores locais do Worker para login e D1 durante desenvolvimento.
- Nao commite segredos reais; mantenha os arquivos de ambiente fora do Git e use `wrangler secret put` quando necessario.
