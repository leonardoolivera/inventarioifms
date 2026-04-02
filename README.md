# Inventario IFMS

Projeto web/PWA do inventario, com frontend estatico e integracoes auxiliares via Supabase e Apps Script.

## Estrutura principal

- `index.html`: interface principal do app.
- `dashboard.html`: visao de dashboard.
- `sw.js` e `manifest.json`: recursos do PWA.
- `code.gs`: automacoes em Google Apps Script.
- `supabase/`: schema, client e Edge Functions.
- `docs/prompts/`: prompts e referencias de trabalho usados durante a evolucao do projeto.

## O que foi versionado para continuar em outro computador

O repositorio ja inclui os arquivos do app e tambem os prompts de apoio que estavam fora da pasta do projeto, para facilitar a continuidade do trabalho em outra maquina com um contexto parecido com o atual.

## O que continua local por seguranca

Algumas configuracoes da maquina atual nao devem ir para o GitHub, especialmente arquivos com permissoes locais, tokens e credenciais. Exemplo:

- `.claude/settings.local.json`

Se voce for usar outro computador, o ideal e recriar esse tipo de configuracao localmente e manter tokens fora do repositorio.
