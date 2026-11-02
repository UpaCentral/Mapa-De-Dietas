# Portal UPA Central 24h

Portal em React com build estático do Vite. Os sistemas clínicos existentes são servidos como páginas independentes dentro do portal. O login e os dados dos quatro sistemas são integrados ao Supabase.

## Desenvolvimento

Requer Node.js 20.19 ou superior.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Preencha `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env.local` com a chave pública anon/publishable do projeto. Antes do primeiro acesso, execute `supabase/schema.sql` no SQL Editor do Supabase. Nunca use a chave `service_role` no aplicativo.

O comando `prepare:legacy` copia as páginas existentes para `public/legacy` e injeta a ponte de armazenamento antes do desenvolvimento e da build.

## GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` compila e publica `main` automaticamente em `https://upacentral.github.io/Mapa-De-Dietas/`.

1. Em **Settings → Pages**, altere a fonte para **GitHub Actions**.
2. Em **Settings → Secrets and variables → Actions**, crie o secret `VITE_SUPABASE_PUBLISHABLE_KEY` com a chave pública `sb_publishable_`. O workflow já usa a URL pública deste projeto; se preferir, ela também pode ser definida como variável `VITE_SUPABASE_URL`.
3. Faça push para `main` ou execute **Actions → Deploy GitHub Pages → Run workflow**.

O build falha explicitamente se a chave pública estiver ausente. Não use a chave `sb_secret_` ou `service_role` no site.

## Build de produção

```powershell
npm run build
npm run preview
```

O resultado publicável fica em `dist/`. O preview local abre em `http://localhost:4173`.

## Sistemas incluídos

- Cabeceira do Paciente
- Mapa de Dietas 3.0
- Processo de Enfermagem
- SAE Enfermagem
- Notificação de Eventos Adversos (formulário externo)

As quatro primeiras telas continuam implementadas nos HTMLs originais e são abertas dentro do portal React. Essa etapa preserva o comportamento e os dados locais enquanto a migração de cada formulário para componentes React pode ser feita gradualmente.

## Supabase e acesso

- As telas exigem login por e-mail e senha do Supabase Auth. Crie a conta compartilhada em **Authentication → Users** no painel do projeto e inclua o UUID dela em `upa_authorized_users` (veja o SQL abaixo). Não coloque a senha no código.
- As tabelas `cabecalho_paciente`, `mapa_dietas`, `processo_enfermagem` e `sae_enfermagem` têm políticas RLS; somente UUIDs cadastrados e habilitados em `upa_authorized_users` podem ler e gravar.
- Cada tabela guarda o estado do respectivo sistema em uma linha compartilhada (`id = 'shared'`, coluna `payload` JSONB). O mapa de dietas e os formulários são sincronizados quando há alterações.
- Como o acesso foi configurado com uma conta compartilhada, não é possível identificar qual profissional fez cada alteração. Alterações simultâneas na mesma tela podem se sobrescrever; contas individuais são recomendadas para uso clínico.
- Os dados locais existentes são migrados para a tabela correspondente na primeira abertura quando a tabela ainda não possui uma linha.
- Ao sair, o cache local dos quatro sistemas é removido; as páginas clínicas abertas fora do portal não exibem os dados.

Para autorizar a conta criada no Supabase, substitua o UUID pelo ID exibido em **Authentication → Users** e execute no SQL Editor:

```sql
insert into public.upa_authorized_users (user_id)
values ('UUID-DA-CONTA');
```
