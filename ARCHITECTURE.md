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
- extracao inicial de utilitarios em `js/utils/format.js`
- extracao inicial de estado em `js/core/state.js`
- extracao de navegacao em `js/core/router.js`
- extracao de dados em `js/data/salas.js`
- extracao de features em `js/features/busca.js`, `js/features/salas.js`, `js/features/scanner.js`, `js/features/sync.js`, `js/features/nopat.js`, `js/features/admin.js` e `js/features/dashboard.js`
- inicio da separacao de estilos em `css/base.css`, `css/components.css` e `css/screens.css`
- ajustes visuais compartilhados em `js/ui/enterprise-overrides.js`

## Proximas extracoes sugeridas

1. remover os blocos inline antigos duplicados do `index.html`
2. aprofundar a separacao de CSS por tela
3. consolidar helpers compartilhados em `js/utils`
4. criar testes para fluxos criticos de scan e sync
5. continuar a quebra do `index.html` em templates/componentes

## Risco conhecido

`index.html` ainda concentra estrutura, estilo e comportamento. A migracao precisa continuar incremental para evitar regressao nas telas de scanner, sync e offline.
