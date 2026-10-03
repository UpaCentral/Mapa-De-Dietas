# Deploy Cloudflare

O Worker publica a interface, a API `/api/*` e usa o banco D1 `mapa-de-dietas-db`. Todas as chamadas do navegador ficam no mesmo domínio, sem dependência do Netlify ou preflight CORS.

## Primeiro deploy

Na pasta `Diestas`, instale as dependências e autentique o Wrangler:

```powershell
npm install
npx wrangler login
npx wrangler d1 create mapa-de-dietas-db
```

Copie o `database_id` retornado pelo D1 para `d1_databases[0].database_id` em `wrangler.jsonc`. Depois aplique o schema e publique:

```powershell
npm run d1:migrate:remote
npm run deploy:cloudflare
```

O nome do Worker em `wrangler.jsonc` deve permanecer `mapa-de-dietas` para publicar em `https://mapa-de-dietas.tiupacentral.workers.dev`.

## Acesso

O acesso padrão permanece `UPADieta` / `Upa@2026`. Configure credenciais próprias como secrets antes de usar em produção:

```powershell
npx wrangler secret put DIETA_USERNAME
npx wrangler secret put DIETA_PASSWORD_SALT
npx wrangler secret put DIETA_PASSWORD_HASH
```

`DIETA_PASSWORD_HASH` deve ser PBKDF2-HMAC-SHA256, 210.000 iterações e 32 bytes em hexadecimal; `DIETA_PASSWORD_SALT` deve ser o salt correspondente em Base64. Sessões expiram em oito horas e seus tokens são armazenados como hashes no D1.

Para desenvolvimento local, `npm run dev` compila o frontend e inicia o Worker com D1 local. Aplique as migrations locais com `npm run d1:migrate:local`.