# Publicação

## GitHub Pages

O repositório publica automaticamente a pasta `dist/` no endereço `https://upacentral.github.io/Mapa-De-Dietas/` pelo workflow `.github/workflows/deploy-pages.yml`.

1. Em **Settings → Pages**, selecione **GitHub Actions** como fonte de publicação.
2. Em **Settings → Secrets and variables → Actions**, configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` usando a URL do projeto e a chave pública `sb_publishable_`.
3. Faça push para `main` ou inicie manualmente o workflow **Deploy GitHub Pages** na aba **Actions**.

O workflow exige os dois secrets e falha se algum estiver ausente. Nunca configure uma chave `sb_secret_` ou `service_role` no front-end.

## Preparar a versão de produção

Na pasta `Mapa-De-Dietas`, execute:

```powershell
npm ci
npm run build
```

Publique o conteúdo de `dist/` em um host de arquivos estáticos. Em Cloudflare Pages, configure a raiz do projeto como `Mapa-De-Dietas`, o comando de build como `npm run build` e o diretório de saída como `dist`. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` como variáveis de ambiente de build; não configure uma chave `service_role` no front-end.

Antes de publicar, valide o portal e cada formulário em um ambiente de homologação. O build inclui as páginas clínicas em `dist/legacy/`; os comandos `predev` e `prebuild` mantêm essas cópias sincronizadas com os HTMLs originais.

## Dados e integração

- Execute `supabase/schema.sql` no SQL Editor do projeto Supabase antes de abrir o portal. O script cria quatro tabelas separadas com RLS para registros autenticados.
- Crie a conta de acesso em **Authentication → Users** no painel do Supabase e insira o UUID dessa conta em `public.upa_authorized_users` (consulte o README). O portal não cria contas nem armazena a senha no código; usuários fora da lista não acessam as tabelas mesmo se conseguirem autenticar.
- Cada sistema mantém uma linha compartilhada JSONB na tabela correspondente. O estado local anterior é enviado à tabela na primeira abertura quando ainda não existe registro remoto.
- A conta compartilhada permite que qualquer profissional autenticado acesse os mesmos dados e não registra qual profissional fez cada alteração. Alterações simultâneas podem se sobrescrever; prefira contas individuais antes de uso clínico.
- Ao sair do portal, o cache local dos quatro sistemas é removido. As páginas clínicas acessadas diretamente, fora do portal, não exibem os dados.
- Os dados são sensíveis: restrinja o acesso às contas autorizadas e use apenas HTTPS em produção.
- O formulário de Eventos Adversos é externo e continua abrindo no Google Forms.
- Nenhum deploy é executado por `npm run build`; o comando apenas gera os arquivos em `dist/`.
