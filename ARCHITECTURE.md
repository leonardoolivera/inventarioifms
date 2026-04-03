# Arquitetura

## Visao geral

PWA de inventario patrimonial do IFMS com:

- frontend estatico em HTML/CSS/JS
- Supabase para banco, auth e edge functions
- Google Apps Script ainda presente como legado de integracao com planilha

## Direcao tecnica

O projeto esta migrando de um modelo concentrado em `index.html` para uma organizacao gradual por responsabilidade.

## Principios

1. Nao reescrever tudo de uma vez.
2. Extrair primeiro o que ja esta mais isolado.
3. Preservar IDs, funcoes globais e fluxos atuais durante a migracao.
4. Documentar decisoes para facilitar colaboracao humana e com IA.

## Etapa atual

Etapa 1 em andamento:

- guia de organizacao em `docs/organizacao-codigo-enterprise.md`
- primeiro modulo externo em `js/ui/enterprise-overrides.js`

## Proximas extracoes sugeridas

1. `js/utils/format.js`
2. `js/features/busca.js`
3. `js/features/dashboard.js`
4. `js/features/admin.js`
5. `css/base.css`, `css/components.css`, `css/screens.css`

## Risco conhecido

`index.html` ainda concentra estrutura, estilo e comportamento. A migracao precisa continuar incremental para evitar regressao nas telas de scanner, sync e offline.
