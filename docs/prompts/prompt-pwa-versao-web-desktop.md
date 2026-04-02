# Prompt: Versão Web Responsiva para PWA Mobile-First

> Use este prompt como instrução ao adaptar um PWA originalmente mobile para funcionar também como aplicação web desktop, detectando automaticamente o ambiente.

---

## O Prompt

```
Você vai adaptar um PWA que hoje é mobile-first para ter uma versão web completa quando aberto em navegador desktop. O app deve detectar automaticamente o ambiente e se adaptar. Siga todas as diretrizes abaixo com rigor.

---

### 1. DETECÇÃO DE AMBIENTE

**Estratégia principal: CSS Media Queries (não JS User-Agent)**
- Nunca dependa de `navigator.userAgent` como método primário — é unreliable e deprecated.
- Use media queries como fonte de verdade para adaptar layout:

```css
/* Mobile-first (padrão) */
/* ... estilos mobile ... */

/* Tablet */
@media (min-width: 768px) { /* ... */ }

/* Desktop */
@media (min-width: 1024px) { /* ... */ }

/* Desktop grande */
@media (min-width: 1440px) { /* ... */ }
```

**Detecção complementar em JS (para lógica condicional):**
```javascript
const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;
const hasHover = () => window.matchMedia('(hover: hover)').matches;
const hasFineMouse = () => window.matchMedia('(pointer: fine)').matches;

// Listener reativo para mudanças
const mq = window.matchMedia('(min-width: 1024px)');
mq.addEventListener('change', (e) => {
  if (e.matches) {
    // entrou em modo desktop
  } else {
    // voltou para mobile
  }
});
```

**Combinação recomendada para distinguir desktop real:**
```css
@media (min-width: 1024px) and (hover: hover) and (pointer: fine) {
  /* Só aplica em dispositivos com mouse e tela grande */
}
```

**Variável global de estado (útil para lógica JS):**
```javascript
function getDeviceMode() {
  const w = window.innerWidth;
  const hasPointer = window.matchMedia('(pointer: fine)').matches;
  if (w >= 1024 && hasPointer) return 'desktop';
  if (w >= 768) return 'tablet';
  return 'mobile';
}

// Atualiza em resize (com debounce)
let deviceMode = getDeviceMode();
window.addEventListener('resize', debounce(() => {
  const newMode = getDeviceMode();
  if (newMode !== deviceMode) {
    deviceMode = newMode;
    document.documentElement.setAttribute('data-mode', deviceMode);
    onDeviceModeChange(deviceMode);
  }
}, 250));

// Seta no HTML pra usar em CSS também
document.documentElement.setAttribute('data-mode', deviceMode);
```

Isso permite seletores CSS como:
```css
[data-mode="desktop"] .sidebar { display: flex; }
[data-mode="mobile"] .bottom-nav { display: flex; }
```

---

### 2. ESTRUTURA DE LAYOUT

**Mobile (padrão):**
```
┌──────────────────────┐
│  Header / Top Bar     │
├──────────────────────┤
│                      │
│   Conteúdo único     │
│   tela cheia         │
│   scroll vertical    │
│                      │
├──────────────────────┤
│  Bottom Navigation   │
└──────────────────────┘
```

**Desktop:**
```
┌──────────────────────────────────────────────────┐
│  Top Bar (breadcrumbs, busca global, user menu)  │
├────────┬─────────────────────────────────────────┤
│        │                                         │
│  Side  │   Área principal com max-width          │
│  bar   │   (conteúdo centralizado)               │
│  nav   │                                         │
│  fixa  │   Pode ter layout em grid/colunas       │
│  220-  │   para aproveitar espaço horizontal     │
│  280px │                                         │
│        │                                         │
├────────┴─────────────────────────────────────────┤
│  Footer (opcional)                               │
└──────────────────────────────────────────────────┘
```

**Implementação do shell:**
```css
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* dvh para mobile com barra de endereço */
  min-height: 100dvh;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  display: none; /* oculta no mobile */
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.bottom-nav {
  display: flex; /* visível no mobile */
}

@media (min-width: 1024px) and (hover: hover) {
  .sidebar {
    display: flex;
    flex-direction: column;
    width: 260px;
    min-width: 260px;
    border-right: 1px solid rgba(0,0,0,0.08);
    padding: 16px 0;
    overflow-y: auto;
    position: sticky;
    top: 0;
    height: 100vh;
  }

  .bottom-nav {
    display: none; /* oculta no desktop */
  }

  .main-content {
    padding: 32px 48px;
    max-width: 1200px;
  }
}
```

---

### 3. NAVEGAÇÃO

**Mobile → Bottom Navigation Bar:**
- 3 a 5 itens máximo.
- Ícone + label curta embaixo.
- Item ativo com cor primária.
- Altura: 56–64px + safe-area-inset-bottom.

**Desktop → Sidebar fixa à esquerda:**
- Logo/nome do app no topo.
- Itens de navegação com ícone + texto ao lado.
- Agrupamento por seções com labels pequenos (uppercase, muted).
- Item ativo: fundo sutil + cor primária no texto/ícone.
- Hover: fundo levemente destacado.
- Pode ter seção colapsável para itens secundários.
- Rodapé da sidebar: versão do app, link de ajuda, etc.

**Transição entre os dois:**
- Ambos devem refletir exatamente as mesmas rotas/telas.
- O estado ativo deve ser sincronizado (mesma lógica de rota).
- Nunca mostre sidebar E bottom-nav ao mesmo tempo.

---

### 4. CONTEÚDO ADAPTATIVO

**Listas → Tabelas:**
No mobile, listas verticais com cards. No desktop, transforme em tabelas ricas:

```css
/* Mobile: cada item é um card empilhado */
.item-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item-card {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.06);
}

/* Desktop: vira tabela */
@media (min-width: 1024px) {
  .item-list {
    display: table;
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
  }

  .item-card {
    display: table-row;
    border-radius: 0;
    border: none;
  }

  .item-card > * {
    display: table-cell;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(0,0,0,0.06);
    vertical-align: middle;
  }
}
```

**Ou use grids adaptativos:**
```css
.cards-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr; /* mobile: 1 coluna */
}

@media (min-width: 768px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .cards-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
}

@media (min-width: 1440px) {
  .cards-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

**Modais e diálogos:**
- Mobile: tela cheia (bottom sheet ou fullscreen).
- Desktop: modal centralizado com max-width 480–640px, backdrop escuro, border-radius 16px.

**Formulários:**
- Mobile: campos em coluna única, teclado virtual considerado.
- Desktop: pode usar 2 colunas para campos curtos (nome + sobrenome lado a lado).
- Labels sempre acima dos campos em ambos.

---

### 5. FUNCIONALIDADES EXCLUSIVAS POR PLATAFORMA

**Scanner de código de barras:**
- Mobile: câmera nativa (usando API como QuaggaJS, Html5-QrCode, ou ZXing).
- Desktop: permitir digitação manual como método primário.
- Mostrar campo de input grande e visível com autofocus.
- Suporte a leitores USB de código de barras (eles simulam teclado, então o input captura automaticamente).
- Dica visual: "Conecte um leitor USB ou digite o código manualmente."

```javascript
function renderBarcodeInput(mode) {
  if (mode === 'mobile') {
    // Mostra botão de câmera + input secundário
    return `
      <button onclick="startCamera()" class="btn-primary btn-lg w-full">
        📷 Escanear com Câmera
      </button>
      <input type="text" inputmode="numeric" placeholder="Ou digite o código..."
             class="mt-3 input-secondary">
    `;
  } else {
    // Desktop: input principal com foco automático
    return `
      <div class="barcode-desktop-input">
        <input type="text" id="barcodeInput" autofocus
               placeholder="Leia com scanner USB ou digite o patrimônio..."
               class="input-primary input-lg w-full font-mono text-lg">
        <p class="text-muted mt-2">
          💡 Leitores USB funcionam automaticamente neste campo
        </p>
      </div>
    `;
  }
}
```

**Atalhos de teclado (só desktop):**
- Implemente atalhos para ações frequentes.
- Mostre hints visuais (ex: badge "⌘K" ao lado da busca).

```javascript
if (hasHover()) {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K = abrir busca
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
    // Ctrl/Cmd + N = novo registro
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      newRecord();
    }
    // Esc = fechar modal/voltar
    if (e.key === 'Escape') {
      closeModal();
    }
  });
}
```

**Tooltips:**
- Mobile: nunca (não existe hover persistente).
- Desktop: tooltips suaves em ícones e ações com delay de 300ms.

**Hover states:**
- Só aplique estilos hover em dispositivos com hover:
```css
@media (hover: hover) {
  .btn:hover {
    background-color: var(--primary-hover);
    transform: translateY(-1px);
  }

  .card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }

  tr:hover {
    background-color: rgba(0,0,0,0.02);
  }
}
```

---

### 6. BARRA SUPERIOR (DESKTOP)

No desktop, o top bar ganha mais funções:

```
┌──────────────────────────────────────────────────────┐
│  📦 Nome do App    │  🔍 Busca global (⌘K)  │  👤 User │
└──────────────────────────────────────────────────────┘
```

- Busca global com comando de teclado.
- Breadcrumbs mostrando navegação contextual.
- Informações do usuário / campus / setor.
- Indicador de conexão (online/offline) — útil para PWA.

---

### 7. DASHBOARD / TELA INICIAL (DESKTOP)

Aproveite o espaço horizontal para criar um painel de visão geral:

**Mobile:** lista vertical de cards resumo empilhados.

**Desktop:** grid com widgets lado a lado:
```
┌──────────┬──────────┬──────────┐
│  Total   │  Salas   │  Progres-│
│  bens    │  conclu- │  so      │
│  escane- │  ídas    │  geral   │
│  ados    │          │  (%)     │
├──────────┴──────────┴──────────┤
│                                │
│  Tabela: últimas atividades    │
│  (com ordenação e filtros)     │
│                                │
├────────────────┬───────────────┤
│  Salas por     │  Gráfico de   │
│  bloco (lista) │  progresso    │
└────────────────┴───────────────┘
```

---

### 8. PERFORMANCE E PWA

**Service Worker:**
- Funciona igual em mobile e desktop.
- Cache estratégico: app shell + dados offline.
- Sync em background quando voltar online.

**Instalação:**
- Mobile: banner de "Adicionar à tela inicial".
- Desktop: o navegador mostra ícone de instalar na barra de endereço.
- Ambos devem estar cobertos no manifest.json:

```json
{
  "display": "standalone",
  "display_override": ["window-controls-overlay", "standalone"],
  "screenshots": [
    {
      "src": "screenshot-mobile.png",
      "sizes": "390x844",
      "form_factor": "narrow"
    },
    {
      "src": "screenshot-desktop.png",
      "sizes": "1280x800",
      "form_factor": "wide"
    }
  ]
}
```

**Viewport e meta tags (já devem existir):**
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#1a1a2e">
```

---

### 9. TRANSIÇÕES ENTRE TELAS

**Mobile:**
- Transições de slide horizontal (push/pop estilo nativo).
- Ou fade simples de 150–200ms.

**Desktop:**
- Transição de conteúdo dentro da área principal (sem mover sidebar).
- Fade ou crossfade sutil de 150ms.
- Nunca faça a sidebar ou top bar transicionar junto — devem ser estáticos.

```css
.page-transition-enter {
  opacity: 0;
  transform: translateY(8px);
}

.page-transition-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: all 200ms ease-out;
}
```

---

### 10. IMPRESSÃO (BÔNUS DESKTOP)

Se o app tem relatórios ou inventários, adicione print styles:

```css
@media print {
  .sidebar,
  .bottom-nav,
  .top-bar,
  .btn,
  .no-print {
    display: none !important;
  }

  .main-content {
    padding: 0;
    max-width: 100%;
  }

  body {
    font-size: 11pt;
    color: #000;
  }

  table {
    page-break-inside: auto;
  }

  tr {
    page-break-inside: avoid;
  }
}
```

---

### 11. CHECKLIST DE IMPLEMENTAÇÃO

- [ ] CSS media queries como método primário de detecção
- [ ] Variável `data-mode` no HTML atualizada reativamente
- [ ] Sidebar desktop com todas as rotas do bottom-nav mobile
- [ ] Bottom-nav e sidebar nunca visíveis ao mesmo tempo
- [ ] Cards mobile → tabelas desktop para listagens
- [ ] Modais fullscreen (mobile) → modais centralizados (desktop)
- [ ] Scanner: câmera no mobile, input com suporte USB no desktop
- [ ] Atalhos de teclado para ações principais (desktop)
- [ ] Hover states apenas em `@media (hover: hover)`
- [ ] Dashboard com grid de widgets no desktop
- [ ] Espaçamento aumentado no desktop (mais respiro visual)
- [ ] Touch targets ≥44px mantidos no mobile
- [ ] max-width no conteúdo principal do desktop
- [ ] Manifest com screenshots mobile e desktop
- [ ] Print styles para relatórios/inventários
- [ ] Testado de 320px a 1920px sem quebras
```
