# Responsive Sidebars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `CampaignPage` e `MatchPage` totalmente responsivos: `RulesSidebar` colapsa para edge tab + drawer em viewports < 1150px, `CharactersSidebar` colapsa em < 609px, e os headers param de causar scroll horizontal.

**Architecture:** `DetailPageTemplate` assume toda a lógica responsiva via `useMediaQuery`. As sidebars são renderizadas inline (estado atual) ou dentro de um drawer — nunca os dois ao mesmo tempo. Edge tabs posicionadas absolutamente no `PageBody` acionam os drawers.

**Tech Stack:** React 18, styled-components, Vitest + Testing Library, TypeScript (`verbatimModuleSyntax` on).

**Spec:** `docs/superpowers/specs/2026-05-27-responsive-sidebars-design.md`

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/test/setup.ts` | Modificar | Adicionar mock de `window.matchMedia` para Vitest/jsdom |
| `src/hooks/useMediaQuery.ts` | Criar | Hook que retorna `boolean` via `window.matchMedia` + listener |
| `src/components/ions/CloseButton.tsx` | Criar | `styled.img` de `x.svg` — botão de fechar drawer |
| `src/components/templates/DetailPageTemplate.tsx` | Modificar | Breakpoints, estado, edge tabs, backdrop, drawer panels |
| `src/pages/MatchPage.tsx` | Modificar | Fix overflow em `MatchHeader` / `MatchTitle` |
| `src/pages/CampaignPage.tsx` | Modificar | Fix overflow em `CampaignHeader` / `CampaignTitle` |

---

## Task 1: Mock de `window.matchMedia` no setup de testes

O hook `useMediaQuery` usa `window.matchMedia`, que não existe no jsdom. Sem o mock, os testes de integração existentes quebram ao renderizar qualquer página que use `DetailPageTemplate`.

**Files:**
- Modify: `src/test/setup.ts`

- [ ] **Step 1: Rodar os testes para confirmar que passam antes da mudança**

```bash
npm run test
```

Expected: todos os testes passam (baseline).

- [ ] **Step 2: Adicionar mock de `matchMedia` no setup**

Em `src/test/setup.ts`, adicione logo após os imports (antes do `beforeAll`):

```ts
// --- window.matchMedia mock --------------------------------------------------
// jsdom não implementa matchMedia. O mock abaixo sempre retorna matches: false,
// colocando o layout no estado "desktop" (sem colapso de sidebars) nos testes.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
```

- [ ] **Step 3: Rodar os testes para confirmar que continuam passando**

```bash
npm run test
```

Expected: todos os testes passam.

- [ ] **Step 4: Commit**

```bash
git add src/test/setup.ts
git commit -m "test: add window.matchMedia mock for jsdom compatibility"
```

---

## Task 2: Hook `useMediaQuery`

**Files:**
- Create: `src/hooks/useMediaQuery.ts`

- [ ] **Step 1: Criar o hook**

```ts
// src/hooks/useMediaQuery.ts
import { useState, useEffect } from "react";

export default function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia(query);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
```

- [ ] **Step 2: Verificar compilação TypeScript**

```bash
npm run build
```

Expected: sem erros de TypeScript.

- [ ] **Step 3: Rodar os testes**

```bash
npm run test
```

Expected: todos os testes passam.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useMediaQuery.ts
git commit -m "feat: add useMediaQuery hook"
```

---

## Task 3: Ion `CloseButton`

Segue o mesmo padrão do `ExpandButton` em `src/components/ions/ExpandButton.tsx`: `styled.img` que importa diretamente o SVG.

**Files:**
- Create: `src/components/ions/CloseButton.tsx`

- [ ] **Step 1: Criar o ion**

```tsx
// src/components/ions/CloseButton.tsx
import styled from "styled-components";
import closeIcon from "../../assets/icons/x.svg";

const CloseButton = styled.img.attrs({
  src: closeIcon,
  alt: "Fechar",
})`
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: block;
  opacity: 0.85;
  transition: opacity 0.15s;
  -webkit-user-select: none;

  &:hover {
    opacity: 1;
  }
`;

export default CloseButton;
```

- [ ] **Step 2: Verificar compilação**

```bash
npm run build
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/ions/CloseButton.tsx
git commit -m "feat: add CloseButton ion (x.svg styled img)"
```

---

## Task 4: `DetailPageTemplate` — sistema de drawer responsivo

Esta é a tarefa principal. O template passa a gerenciar breakpoints, estado dos drawers, edge tabs, backdrop e painéis deslizantes.

**Files:**
- Modify: `src/components/templates/DetailPageTemplate.tsx`

- [ ] **Step 1: Substituir o conteúdo do arquivo pelo código abaixo**

```tsx
// src/components/templates/DetailPageTemplate.tsx
import { type ReactNode, type RefObject, useState } from "react";
import styled, { keyframes } from "styled-components";
import PageHeader from "../atoms/PageHeader";
import CloseButton from "../ions/CloseButton";
import worldMap from "../../assets/images/worldmap.png";
import { colors, fonts } from "../../styles/tokens";
import useMediaQuery from "../../hooks/useMediaQuery";

interface DetailPageTemplateProps {
  headerColor?: string;
  bgImage?: string;
  mainRef?: RefObject<HTMLDivElement | null>;
  leftSidebar: ReactNode;
  leftSidebarLabel?: string;
  rightSidebar?: ReactNode;
  rightSidebarLabel?: string;
  children: ReactNode;
}

export default function DetailPageTemplate({
  headerColor = colors.brandPrimary,
  bgImage = worldMap,
  mainRef,
  leftSidebar,
  leftSidebarLabel = "PERSONAGENS",
  rightSidebar,
  rightSidebarLabel = "REGRAS",
  children,
}: DetailPageTemplateProps) {
  const isRightCollapsed = useMediaQuery("(max-width: 1149px)");
  const isLeftCollapsed = useMediaQuery("(max-width: 608px)");

  const [isRightOpen, setIsRightOpen] = useState(false);
  const [isLeftOpen, setIsLeftOpen] = useState(false);

  const openRight = () => { setIsLeftOpen(false); setIsRightOpen(true); };
  const openLeft = () => { setIsRightOpen(false); setIsLeftOpen(true); };
  const closeAll = () => { setIsRightOpen(false); setIsLeftOpen(false); };

  const anyOpen = isRightOpen || isLeftOpen;

  return (
    <PageContainer>
      <PageHeader backgroundColor={headerColor} />
      <PageBody>
        {!isLeftCollapsed && leftSidebar}
        <MainContentContainer ref={mainRef} $bgImage={bgImage}>
          {children}
        </MainContentContainer>
        {!isRightCollapsed && rightSidebar}

        {isLeftCollapsed && (
          <LeftEdgeTab onClick={openLeft}>{leftSidebarLabel}</LeftEdgeTab>
        )}
        {isRightCollapsed && rightSidebar && (
          <RightEdgeTab onClick={openRight}>{rightSidebarLabel}</RightEdgeTab>
        )}

        {anyOpen && <DrawerBackdrop onClick={closeAll} />}

        {isLeftCollapsed && isLeftOpen && (
          <LeftDrawerPanel>
            <DrawerCloseRow>
              <CloseButton onClick={closeAll} />
            </DrawerCloseRow>
            <DrawerBody>{leftSidebar}</DrawerBody>
          </LeftDrawerPanel>
        )}

        {isRightCollapsed && isRightOpen && rightSidebar && (
          <RightDrawerPanel>
            <DrawerCloseRow>
              <CloseButton onClick={closeAll} />
            </DrawerCloseRow>
            <DrawerBody>{rightSidebar}</DrawerBody>
          </RightDrawerPanel>
        )}
      </PageBody>
    </PageContainer>
  );
}

// ─── Animations ───────────────────────────────────────────────────────────────

const slideInFromLeft = keyframes`
  from { transform: translateX(-100%); }
  to   { transform: translateX(0); }
`;

const slideInFromRight = keyframes`
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const PageContainer = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
`;

const PageBody = styled.main`
  display: flex;
  color: ${colors.textPrimary};
  min-height: 0;
  overflow: hidden;
  position: relative;
`;

const MainContentContainer = styled.div<{ $bgImage: string }>`
  flex: 1;
  padding: 30px 30px 0px 30px;
  overflow-y: auto;

  background-image: url(${({ $bgImage }) => $bgImage});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
`;

// ─── Edge Tabs ────────────────────────────────────────────────────────────────

const EdgeTab = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 80px;
  background-color: ${colors.brandAccent};
  border: none;
  color: ${colors.textPrimary};
  writing-mode: vertical-lr;
  font-family: ${fonts.sans};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  z-index: 10;
  transition: filter 0.15s;
  padding: 0;

  &:hover {
    filter: brightness(1.15);
  }
`;

const LeftEdgeTab = styled(EdgeTab)`
  left: 0;
  border-radius: 0 6px 6px 0;
`;

const RightEdgeTab = styled(EdgeTab)`
  right: 0;
  border-radius: 6px 0 0 6px;
`;

// ─── Drawer ───────────────────────────────────────────────────────────────────

const DrawerBackdrop = styled.div`
  position: absolute;
  inset: 0;
  background-color: ${colors.overlay};
  z-index: 200;
`;

const DrawerPanel = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 201;
  background-color: ${colors.surfaceSidebar};
  display: flex;
  flex-direction: column;
`;

const LeftDrawerPanel = styled(DrawerPanel)`
  left: 0;
  width: 300px;
  animation: ${slideInFromLeft} 250ms ease;
`;

const RightDrawerPanel = styled(DrawerPanel)`
  right: 0;
  width: 400px;
  animation: ${slideInFromRight} 250ms ease;
`;

const DrawerCloseRow = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 12px 12px 0;
  flex-shrink: 0;
`;

const DrawerBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;
```

- [ ] **Step 2: Verificar compilação TypeScript**

```bash
npm run build
```

Expected: sem erros. Se aparecer `Property 'overlay' does not exist on type`, verifique o nome exato do token em `src/styles/tokens.ts` e ajuste a linha `background-color: ${colors.overlay}` no `DrawerBackdrop`.

- [ ] **Step 3: Rodar os testes de integração**

```bash
npm run test
```

Expected: todos passam. Os testes renderizam em viewport "desktop" (matchMedia mock retorna `false` para todos os breakpoints), portanto as sidebars ficam inline como antes.

- [ ] **Step 4: Testar visualmente no browser**

```bash
npm run dev
```

Acesse `/campaigns/:id` e `/campaigns/:id/matches/:id` (qualquer ID existente). Redimensione o browser:

| Largura | Esperado |
|---|---|
| ≥ 1150px | 3 colunas — idêntico ao estado atual |
| 609–1149px | 2 colunas — RulesSidebar some; edge tab verde aparece na borda direita do main |
| < 609px | 1 coluna — ambas colapsam; duas edge tabs nas bordas |
| Clique no edge tab | Drawer desliza da borda correta, backdrop aparece |
| Clique no backdrop ou ✕ | Drawer fecha |
| Abra um drawer, clique no outro edge tab | Primeiro fecha, segundo abre |

- [ ] **Step 5: Commit**

```bash
git add src/components/templates/DetailPageTemplate.tsx
git commit -m "feat: responsive sidebars with collapsible edge-tab drawers

Sidebars collapse to edge-tab drawers at 1150px (rules) and 609px
(characters). Drawer slides in from respective edge; backdrop click
or CloseButton dismisses it."
```

---

## Task 5: Fix overflow em `MatchPage` — `MatchHeader` e `MatchTitle`

Abaixo de ~750px de viewport, o flex row do header causa scroll horizontal porque `DateSection` tem `flex-shrink: 0` e o título não pode encolher.

**Files:**
- Modify: `src/pages/MatchPage.tsx`

- [ ] **Step 1: Atualizar `MatchHeader` e `MatchTitle`**

Encontre os dois styled-components no final de `MatchPage.tsx` e substitua:

```tsx
// ANTES:
const MatchHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 40px;
  margin-bottom: 20px;
`;

const MatchTitle = styled.h1`
  font-family: ${fonts.sans};
  font-size: 42px;
  font-weight: 900;
  color: ${colors.textPrimary};
`;
```

```tsx
// DEPOIS:
const MatchHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;

  @media (max-width: 750px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;

const MatchTitle = styled.h1`
  font-family: ${fonts.sans};
  font-size: 42px;
  font-weight: 900;
  color: ${colors.textPrimary};
  flex: 1;
  min-width: 0;
  overflow-wrap: break-word;
`;
```

- [ ] **Step 2: Verificar compilação**

```bash
npm run build
```

Expected: sem erros.

- [ ] **Step 3: Testar visualmente**

Com `npm run dev`, acesse uma `MatchPage` com status "scheduled" (que tem "Agendada para:"). Redimensione o browser até < 609px. O header deve empilhar verticalmente — título em cima, status pill + data embaixo — sem scroll horizontal.

- [ ] **Step 4: Rodar os testes**

```bash
npm run test
```

Expected: todos passam.

- [ ] **Step 5: Commit**

```bash
git add src/pages/MatchPage.tsx
git commit -m "fix: prevent MatchHeader overflow on narrow viewports

Stack title and date section vertically below 750px viewport width.
Covers both mobile (< 609px) and narrow tablet with chars sidebar
visible (609–750px, main content ~309–450px)."
```

---

## Task 6: Fix overflow em `CampaignPage` — `CampaignHeader` e `CampaignTitle`

Mesmo problema e mesma solução do `MatchPage`.

**Files:**
- Modify: `src/pages/CampaignPage.tsx`

- [ ] **Step 1: Atualizar `CampaignHeader` e `CampaignTitle`**

Encontre os dois styled-components no final de `CampaignPage.tsx` e substitua:

```tsx
// ANTES:
const CampaignHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 40px;
  margin-bottom: 20px;
`;

const CampaignTitle = styled.h1`
  font-family: ${fonts.sans};
  font-size: 42px;
  font-weight: 900;
  color: ${colors.textPrimary};
`;
```

```tsx
// DEPOIS:
const CampaignHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;

  @media (max-width: 750px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;

const CampaignTitle = styled.h1`
  font-family: ${fonts.sans};
  font-size: 42px;
  font-weight: 900;
  color: ${colors.textPrimary};
  flex: 1;
  min-width: 0;
  overflow-wrap: break-word;
`;
```

- [ ] **Step 2: Verificar compilação**

```bash
npm run build
```

Expected: sem erros.

- [ ] **Step 3: Testar visualmente**

Acesse uma `CampaignPage`. Redimensione o browser até < 609px. O header deve empilhar sem scroll horizontal.

- [ ] **Step 4: Rodar os testes**

```bash
npm run test
```

Expected: todos passam.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CampaignPage.tsx
git commit -m "fix: prevent CampaignHeader overflow on narrow viewports"
```
