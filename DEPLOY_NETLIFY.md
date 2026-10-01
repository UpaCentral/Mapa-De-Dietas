# Deploy no Netlify

O site e a API usam a mesma origem. A funcao em `Diestas/netlify/functions/api.ts` atende `/api/*` e acessa o PostgreSQL pelo Netlify DB.

## Configuracao

1. Ative e associe o Netlify DB ao site antes de executar as migracoes.
2. Confirme que as migracoes em `Diestas/netlify/database/migrations` foram aplicadas ao banco do site.
3. O acesso padrão usa o usuário `UPADieta` e a senha definida para este projeto. Para substituir essa credencial no deploy, configure `DIETA_USERNAME`, `DIETA_PASSWORD_SALT` e `DIETA_PASSWORD_HASH` em Site configuration > Environment variables. Use os campos `username`, `salt` e `passwordHash` do arquivo local `dieta-auth.json`; nunca publique esse arquivo ou a senha.
4. Publique o site. O build usa `Diestas` como base e gera o frontend em `dist`.

As sessoes expiram em oito horas e seus tokens sao armazenados como hashes no banco. O arquivo local `Diestas/data/Dieta.db` nao e usado pelo deploy e fica ignorado pelo Git para preservar dados locais sem inclui-los no site.