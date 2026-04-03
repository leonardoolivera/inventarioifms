# Organizacao de Codigo Enterprise

Guia interno para a migracao gradual do projeto para uma estrutura mais sustentavel.

## Objetivo

Separar responsabilidades sem reescrever o app inteiro de uma vez:

- HTML para estrutura
- CSS para aparencia
- JS para comportamento
- services para comunicacao externa
- docs para memoria tecnica

## Estrutura alvo

```text
inventarioifms/
|-- index.html
|-- dashboard.html
|-- manifest.json
|-- sw.js
|-- css/
|-- js/
|   |-- services/
|   |-- features/
|   |-- ui/
|   `-- utils/
|-- docs/
`-- supabase/
```

## Regras

1. Cada arquivo deve ter uma razao clara para existir.
2. Evitar logica de negocio no HTML.
3. Evitar CSS inline, exceto quando o valor for realmente dinamico.
4. Evitar chamadas externas direto em handlers de UI.
5. Migrar por etapas, sempre preservando compatibilidade.

## Fases

### Fase 1

- criar documentacao de arquitetura
- criar a estrutura inicial em `js/` e `css/`
- mover blocos reutilizaveis para arquivos externos

### Fase 2

- separar por feature: auth, scan, sync, rooms, busca, campus, dashboard
- centralizar estado, formatacao e constantes

### Fase 3

- consolidar CSS em modulos
- reduzir `index.html` para estrutura e pontos de montagem

## Etapa ja iniciada

Nesta etapa do projeto:

- este guia foi adicionado em `docs/`
- foi criado `ARCHITECTURE.md`
- os overrides de UI foram extraidos para `js/ui/enterprise-overrides.js`
