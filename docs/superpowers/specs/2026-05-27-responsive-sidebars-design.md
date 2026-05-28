# Responsive Sidebars — CampaignPage & MatchPage

**Data:** 2026-05-27  
**Escopo:** Front-end React (`System_X_System_React`)  
**Páginas afetadas:** `CampaignPage`, `MatchPage`

---

## Problema

`DetailPageTemplate` renderiza 3 colunas fixas (300px + flex + 400px) sem comportamento responsivo. Em viewports menores, o layout causa scroll horizontal — especificamente, a label "Agendada para:" em `MatchPage` fica fora da tela em tablets e celulares.

---

## Solução: Colapso em cascata com drawers por edge tab

As duas sidebars colapsam em ordem conforme o viewport encolhe. Cada sidebar colapsada vira um painel drawer acionado por uma aba vertical (edge tab) na borda do layout.

### Breakpoints

| Viewport | Colunas | Sidebars |
|---|---|---|
| ≥ 1150px | 3 colunas | `CharactersSidebar` inline (esq.) + main + `RulesSidebar` inline (dir.) |
| 609–1149px | 2 colunas | `CharactersSidebar` inline + main. `RulesSidebar` colapsa → edge tab direito |
| < 609px | 1 coluna | Só main. Ambas colapsam → edge tab esquerdo (chars) + edge tab direito (rules) |

Os valores 1150px e 609px derivam das larguras reais dos componentes: 300 (chars) + ~450 (main mínimo) + 400 (rules) = 1150; 300 (chars) + ~309 (main mínimo) = 609.

---

## Arquitetura

### Abordagem: Template responsivo (Abordagem A)

`DetailPageTemplate` assume toda a responsabilidade de layout responsivo. As páginas (`CampaignPage`, `MatchPage`) não mudam sua lógica — apenas passam dois labels opcionais novos.

### `DetailPageTemplate` — mudanças

**Novos props:**
```tsx
leftSidebarLabel?: string   // padrão: "PERSONAGENS"
rightSidebarLabel?: string  // padrão: "REGRAS"
```

**Novo estado interno:**
```tsx
isRightOpen: boolean  // controla drawer de rules
isLeftOpen: boolean   // controla drawer de chars (só relevante quando colapsado)
```

**Detecção de colapso:**
- `useMediaQuery("(max-width: 1149px)")` → `isRightCollapsed`
- `useMediaQuery("(max-width: 608px)")` → `isLeftCollapsed`

Quando `isRightCollapsed === true`, `rightSidebar` é renderizado **dentro do drawer**, não inline. Idem para `isLeftCollapsed` e `leftSidebar`. A sidebar nunca está no DOM duas vezes — ou é inline, ou é drawer. Isso preserva o funcionamento de `containerRef` passado pelo `CampaignPage`.

**Novos elementos renderizados pelo template:**

| Elemento | Quando aparece |
|---|---|
| `RightEdgeTab` | `isRightCollapsed` — aba verde na borda direita do main |
| `LeftEdgeTab` | `isLeftCollapsed` — aba verde na borda esquerda do main |
| `DrawerBackdrop` | qualquer drawer aberto — overlay escuro sobre todo o `PageBody` |
| `RightDrawerPanel` | `isRightCollapsed && isRightOpen` — painel desliza da direita |
| `LeftDrawerPanel` | `isLeftCollapsed && isLeftOpen` — painel desliza da esquerda |

**Comportamento do drawer:**
- Abre: clique no edge tab
- Fecha: clique no backdrop, clique no `CloseButton` dentro do drawer
- Abre um → fecha o outro (mutuamente exclusivos)
- Animação: `transform: translateX(±100%)` → `translateX(0)` em 250ms ease

**Dimensões dos drawers:** iguais às sidebars originais (300px chars, 400px rules).

**Z-index:** backdrop = 200, drawer panel = 201 (acima do `ConfirmDialog` que usa z-index 100).

### Edge tab

- Cor: `colors.brandAccent` (`#107135`) em ambas
- Dimensões: 24px largura × 80px altura
- Texto rotacionado 90° (`writing-mode: vertical-lr`)
- `border-radius`: arredondado no lado interno (voltado para o main)
- Posicionado `absolute` no `PageBody` (`position: relative`), centrado verticalmente

### Botão fechar (novo ion `CloseButton`)

Padrão idêntico ao `ExpandButton`: `styled.img` importando `x.svg` de `assets/icons/x.svg`.

```tsx
// src/components/ions/CloseButton.tsx
import closeIcon from "../../assets/icons/x.svg";
const CloseButton = styled.img` cursor: pointer; width: 24px; height: 24px; ... `;
```

Colocado no topo do drawer panel (alinhado à direita).

---

## Fix: MatchHeader e CampaignHeader

**Problema:** flex row com `justify-content: space-between` e `flex-shrink: 0` em ambos os filhos → overflow em viewports estreitos.

**Fix em `MatchPage.tsx` (`MatchHeader` + `MatchTitle`):**
```css
/* MatchTitle */
flex: 1;
min-width: 0;
overflow-wrap: break-word;

/* MatchHeader — empilha em viewports ≤ 750px
   Cobre dois casos:
   - 609–750px: chars sidebar visível (300px), main fica com 309–450px — espaço insuficiente para inline
   - < 609px: chars colapsa, main = viewport; abaixo de ~420px começa a ficar apertado */
@media (max-width: 750px) {
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}
```

`DateSection` mantém `flex-shrink: 0`; com `MatchTitle` crescendo e quebrando, o overflow some. Abaixo de 750px os dois empilham verticalmente.

**Fix idêntico** em `CampaignPage.tsx` (`CampaignHeader` + `CampaignTitle`), mesmo breakpoint de 750px.

---

## Arquivos alterados

| Arquivo | Natureza da mudança |
|---|---|
| `src/hooks/useMediaQuery.ts` | Novo hook — `window.matchMedia` + listener de resize |
| `src/components/templates/DetailPageTemplate.tsx` | Principal: breakpoints, estado, edge tabs, drawers, backdrop |
| `src/components/ions/CloseButton.tsx` | Novo ion (styled img de x.svg) |
| `src/pages/MatchPage.tsx` | Fix overflow no MatchHeader |
| `src/pages/CampaignPage.tsx` | Fix overflow no CampaignHeader |

`CharactersSidebar.tsx` e `RulesSidebar.tsx` **não mudam**.  
As chamadas nas páginas **não mudam** (exceto passar `leftSidebarLabel`/`rightSidebarLabel` opcionais se quiserem sobrescrever o padrão).

---

## Fora de escopo

- Animação de fechamento (unmount sem delay) — suficiente para MVP
- Persistir estado de drawer aberto entre navegações
- Sidebar de regras com dados reais (é feature futura separada)
