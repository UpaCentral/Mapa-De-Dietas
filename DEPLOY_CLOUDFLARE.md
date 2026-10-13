# Frontend Cloudflare

O frontend e servido por um Worker de assets estaticos em `https://mapa-de-dietas.tiupacentral.workers.dev`. O backend pode continuar no Netlify e a app usa `VITE_API_BASE` para apontar para a API correta.

## Publicacao

1. Na pasta `Diestas`, instale as dependencias com `npm install`.
2. Confirme o banco D1 vinculado em `wrangler.jsonc` e aplique as migracoes pendentes com `npx wrangler d1 migrations apply mapa-de-dietas-db --remote`.
3. Configure credenciais novas executando `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\configure-cloudflare-auth.ps1`. O script solicita a senha sem exibi-la, exige pelo menos 14 caracteres, gera salt/hash PBKDF2-SHA256 com 210000 iteracoes e envia os tres secrets direto ao Wrangler sem gravar valores em arquivos.
4. Copie `.env.cloudflare.example` para `.env.cloudflare` e mantenha `VITE_API_BASE=/api` para usar a API do proprio Worker.
5. Autentique o Wrangler na conta Cloudflare com `npx wrangler login`.
6. Execute `npm run deploy:cloudflare`.

O Worker usa `APP_ENV=production`: sem D1 ou sem os secrets de autenticacao, a API responde com erro de configuracao em vez de aceitar dados temporarios ou uma senha padrao. O script de configuracao requer que o Wrangler ja esteja autenticado com `npx wrangler login` e nunca mostra ou grava os valores secretos.

O nome em `wrangler.jsonc` determina o subdominio do Worker. A conta Cloudflare precisa ter o subdominio `tiupacentral` ativo para gerar exatamente o endereco informado. Se o backend Netlify usar outro dominio, atualize `VITE_API_BASE` em `.env.cloudflare` e inclua a origem Cloudflare no allowlist de `netlify/functions/cors.js`.

## Variaveis de ambiente

- `.env.cloudflare.example` define a URL do backend usado pelo front em producao.
- `.dev.vars.example` guarda os valores locais do Worker para login e D1 durante desenvolvimento.
- Nao commite segredos reais; mantenha os arquivos de ambiente fora do Git e use `wrangler secret put` quando necessario.
