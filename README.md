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

Para ativar o histórico clínico de 7 dias, execute também `supabase/history.sql` no SQL Editor. Esse script cria a tabela protegida por RLS, permite apenas leitura/inserção/atualização para usuários autorizados e agenda a exclusão horária de registros vencidos com a extensão `pg_cron`. O navegador não tem permissão para excluir registros.

Se já executou esses scripts, execute novamente `supabase/schema.sql` e `supabase/history.sql` após atualizar para aplicar as políticas e permissões reforçadas.

O comando `prepare:legacy` copia as páginas existentes para `public/legacy` e injeta a ponte de armazenamento antes do desenvolvimento e da build.

As quatro telas usam tokens de cor e espaçamento compartilhados, controles com estados de foco, componentes responsivos e navegação rápida entre as seções de enfermagem. A sincronização informa quando os dados estão sendo salvos e oferece uma nova tentativa em caso de falha.

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
- O login não é restaurado após recarregar ou reabrir o portal: cada carregamento exige autenticação novamente. A sessão fica somente em memória; o portal também remove uma sessão persistida por versões anteriores e limpa o cache local dos sistemas.
- Desative o cadastro público de usuários no Supabase se novos usuários não devem criar contas. Prefira uma conta individual por profissional, habilite MFA quando disponível e remova o acesso de quem não precisa mais usar o portal.
- As tabelas `cabecalho_paciente`, `mapa_dietas`, `processo_enfermagem` e `sae_enfermagem` têm políticas RLS; somente UUIDs cadastrados e habilitados em `upa_authorized_users` podem ler e gravar.
- Cada tabela guarda o estado do respectivo sistema em uma linha compartilhada (`id = 'shared'`, coluna `payload` JSONB). O mapa de dietas e os formulários são sincronizados quando há alterações.
- Os dados clínicos e o histórico são compartilhados entre todos os usuários autorizados. Contas individuais permitem identificar o usuário que gravou cada registro, mas não evitam que alterações simultâneas na mesma tela se sobrescrevam.
- Os dados locais existentes são migrados para a tabela correspondente na primeira abertura quando a tabela ainda não possui uma linha.
- Ao abrir o portal ou sair, o cache ativo (`upa:`) dos quatro sistemas é removido. Chaves antigas sem esse prefixo são mantidas para permitir a migração de dados ainda não sincronizados; confirme que foram migradas antes de limpar esses dados ou compartilhar o dispositivo. As páginas clínicas devem ser abertas dentro do portal autenticado.
- O botão **Histórico (7 dias)** aparece em cada sistema. Cabeceira, Processo e SAE atualizam automaticamente uma ficha após 2 segundos sem alterações, quando nome e prontuário estão preenchidos; o Mapa de Dietas registra a ficha ao adicioná-la ao mapa. A ficha é compartilhada pelo Supabase e expira 7 dias após a última atualização. No histórico, um único botão imprime todos os registros encontrados ou somente os que correspondem aos filtros aplicados.
- A CSP adicionada no HTML oferece proteção parcial e mantém `unsafe-inline` por compatibilidade com os formulários antigos. GitHub Pages não permite configurar, neste projeto estático, todos os cabeçalhos HTTP de segurança. Isso não constitui certificação de conformidade nem substitui uma revisão de segurança e privacidade; confirme os requisitos legais e contratuais aplicáveis antes de usar dados reais de pacientes.

Para autorizar a conta criada no Supabase, substitua o UUID pelo ID exibido em **Authentication → Users** e execute no SQL Editor:

```sql
insert into public.upa_authorized_users (user_id)
values ('UUID-DA-CONTA');
```
