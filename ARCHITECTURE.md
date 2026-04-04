# Arquitetura

## Visao geral

PWA de inventario patrimonial do IFMS com:

- frontend estatico em HTML/CSS/JS
- Supabase para banco, auth e edge functions
- Google Apps Script ainda presente como legado de integracao com planilha

## Direcao tecnica

O projeto saiu do modelo centrado em `index.html` e agora opera com organizacao modular por responsabilidade.

## Principios

1. Nao reescrever tudo de uma vez.
2. Extrair primeiro o que ja esta mais isolado.
3. Preservar IDs, funcoes globais e fluxos atuais durante a migracao.
4. Documentar decisoes para facilitar colaboracao humana e com IA.

## Estado atual

A fase principal da modularizacao estrutural foi concluida.

### Shell principal

- `index.html` ficou como shell da aplicacao
- o inline restante foi reduzido a bootstrap, estado inicial e listeners globais
- a lista SUAP foi movida para `js/data/suap-rooms.js`

### Core

- `js/core/state.js`
- `js/core/router.js`
- `js/core/bootstrap.js`
- `js/core/pwa.js`

### Utils e dados

- `js/utils/format.js`
- `js/data/salas.js`
- `js/data/suap-rooms.js`

### Features

- `js/features/home.js`
- `js/features/history.js`
- `js/features/auth.js`
- `js/features/media-ai.js`
- `js/features/app-ui.js`
- `js/features/busca.js`
- `js/features/comparison.js`
- `js/features/room-alerts.js`
- `js/features/salas.js`
- `js/features/scan-core.js`
- `js/features/scanner.js`
- `js/features/sync.js`
- `js/features/nopat.js`
- `js/features/admin.js`
- `js/features/dashboard.js`

### UI e estilos

- `css/base.css`
- `css/components.css`
- `css/screens.css`
- `js/ui/enterprise-overrides.js`

## Proximos passos recomendados

1. Separar melhor o CSS por dominio ou tela.
2. Criar testes para fluxos criticos de scan, sync, auth e offline.
3. Revisar encoding legado em dados antigos e strings herdadas do projeto original.
4. Reduzir acoplamento entre modulos globais antes de uma refatoracao maior.

## Riscos e dividas tecnicas

- Ainda existe divida de encoding em alguns dados e textos legados, principalmente na base antiga de salas.
- O app continua dependente de funcoes globais entre modulos por compatibilidade incremental.
- A proxima fase ideal e consolidar contratos entre features antes de qualquer reescrita ampla.
