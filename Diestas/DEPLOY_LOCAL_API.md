# API local e túnel Cloudflare

O Worker `mapa-de-dietas` continua servindo o frontend. A API roda no computador que alcança o PostgreSQL local e é publicada pelo hostname `api-dieta.upacentral.co.uk`, sem alterar `api.upacentral.co.uk`.

## PostgreSQL

1. Confirme que o PostgreSQL Server está instalado e iniciado; pgAdmin 4 é apenas o aplicativo de administração, não o servidor do banco. No pgAdmin, crie ou selecione o banco `dieta`.
2. Copie `.env.local.example` para `.env.local` e preencha a senha do usuário PostgreSQL, o usuário e uma senha forte exclusiva para o login do sistema.
3. Instale as dependências com `npm install` e inicie a API com `npm run start:api`.

Na primeira inicialização, a API cria as tabelas e insere os setores, leitos e opções padrão. `CREATE TABLE IF NOT EXISTS` e `ON CONFLICT DO NOTHING` preservam registros existentes. O arquivo SQLite `data/Dieta.db` não é importado nem modificado.

## Rota do túnel

Na rota `api-dieta.upacentral.co.uk` do túnel existente, configure o serviço de origem como `http://127.0.0.1:8787` se o conector `cloudflared` roda neste mesmo computador. Se o conector estiver no servidor `ServidorBackup`, use um endereço LAN deste computador acessível pelo servidor, por exemplo `http://192.168.x.x:8787`, e permita essa conexão no Firewall do Windows. Não aponte o túnel para a porta `5432` do PostgreSQL.

Mantenha PostgreSQL, API Node e o conector do túnel ativos. Teste `https://api-dieta.upacentral.co.uk/api/health`; uma resposta `{"ok":true}` confirma API e banco. O CORS aceita por padrão apenas o frontend `https://mapa-de-dietas.tiupacentral.workers.dev`.

## Publicação do frontend

`.env.cloudflare` e `.env.cloudflare.example` apontam para `https://api-dieta.upacentral.co.uk/api`. Depois de confirmar que a API responde pelo túnel, publique o frontend com `npm run deploy:cloudflare`.

Como o túnel expõe uma API com dados de saúde à internet, mantenha uma senha forte e exclusiva, limite o acesso por Cloudflare Access/rede conforme a política da instituição e configure backup e controle de acesso no PostgreSQL. Não exponha o próprio PostgreSQL pelo túnel.