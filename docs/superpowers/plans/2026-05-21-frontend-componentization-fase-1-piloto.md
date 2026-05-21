# Frontend Componentization — Fase 1: Piloto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar a duplicação estrutural entre `CampaignPage` e `MatchPage` extraindo um `DetailPageTemplate` + organisms (`CharactersSidebar`, `RulesSidebar`), promovendo componentes compartilhados, e adicionando a `RulesSidebar` (que faltava) nas duas páginas.

**Architecture:** Slot-based composition. `DetailPageTemplate` é o shell (header + 3 colunas) e recebe `leftSidebar`/`rightSidebar`/`children` como slots `ReactNode`. As páginas viram thin orchestrators: buscam dados via hooks e compõem os organisms. Sem prop de "modo" — o que varia entre Campaign e Match é estrutura, não enumeração.

**Tech Stack:** React 19, TypeScript estrito (`verbatimModuleSyntax`, `noUnusedLocals`), styled-components, Vitest + MSW (suite da Fase 0 já no repo).

**Spec de referência:** `docs/superpowers/specs/2026-05-20-frontend-componentization-design.md` (§2 Faseamento, §3 estrutura de pastas, §4 APIs).

---

## Contexto crítico para quem executa

- **Esta é uma refatoração, não uma feature nova.** O comportamento das páginas já está travado por **characterization tests** da Fase 0: `src/pages/__tests__/CampaignPage.test.tsx` (11 testes) e `src/pages/__tests__/MatchPage.test.tsx` (15 testes). **Esses testes NÃO podem quebrar.** Eles são o critério de sucesso de cada task de refactor.
- **Pixel-perfect para o que já existe.** Header, sidebar de personagens e conteúdo central devem renderizar idênticos. A **única adição visual** intencional é a `RulesSidebar` à direita (que ainda não existia nas páginas de view).
- **Zona pixel-tuned — NÃO TOCAR:** `src/components/molecules/CharacterSheetHeader.tsx` e os 3 Diagrams em `src/features/sheet/`. Nenhuma task aqui os toca; se você se vir editando-os, parou no lugar errado.
- **Disciplina de commits:** um commit atômico por task. Mensagens no estilo do repo (`feat:`, `refactor:`, `test:`).
- Rode comandos sem bypassar o `rtk` (use `npm`, `git`, `grep` simples — nada de `/bin/<cmd>`).
- Baseline atual: `npm test` → 87 testes passando (13 arquivos). `npm run build` → verde.

---

## File Structure

**Arquivos criados:**

- `src/components/molecules/RuleSection.tsx` — molécula: uma seção de regra (título + corpo).
- `src/components/organisms/RulesSidebar.tsx` — organism: a sidebar de regras (shell + título + slot de conteúdo).
- `src/components/organisms/CharactersSidebar.tsx` — organism: a sidebar de personagens (shell + título + lista + footer), genérica no tipo do item.
- `src/components/templates/DetailPageTemplate.tsx` — template: shell de página de detalhe (header + 3 colunas via slots).

**Arquivos movidos (promoção feature → shared):**

- `src/features/campaign/CharacterSidebarItem.tsx` → `src/components/molecules/CharacterSidebarItem.tsx`
- `src/features/campaign/AdaptativeActionButton.tsx` → `src/components/molecules/AdaptiveActionButton.tsx` (o arquivo tinha typo no nome — `Adaptative` — corrigido na mudança, já que todos os importadores são reescritos de qualquer jeito; o **componente** já se chamava `AdaptiveActionButton`).

**Arquivos modificados:**

- `src/pages/CampaignPage.tsx` — vira thin orchestrator usando o template.
- `src/pages/MatchPage.tsx` — idem.
- `src/pages/__tests__/CampaignPage.test.tsx` — +1 teste (RulesSidebar visível).
- `src/pages/__tests__/MatchPage.test.tsx` — +1 teste (RulesSidebar visível).

**Arquivos NÃO movidos (continuam single-feature):**

- `src/features/campaign/MatchItem.tsx` — só CampaignPage usa.
- `src/features/match/EnrollmentSidebarItem.tsx` — só MatchPage usa.

---

## Task 1: Promover `CharacterSidebarItem` para `components/molecules/`

**Files:**
- Move: `src/features/campaign/CharacterSidebarItem.tsx` → `src/components/molecules/CharacterSidebarItem.tsx`
- Modify: `src/pages/CampaignPage.tsx:10` (import path)
- Modify: `src/pages/MatchPage.tsx:15` (import path)

`CharacterSidebarItem` já é importado por `CampaignPage` **e** `MatchPage` — pela regra do projeto (`components/` = compartilhado entre 2+ features), já deveria estar promovido. Esta task formaliza isso.

- [ ] **Step 1: Mover o arquivo com `git mv`**

```bash
git mv src/features/campaign/CharacterSidebarItem.tsx src/components/molecules/CharacterSidebarItem.tsx
```

- [ ] **Step 2: Corrigir os imports DENTRO do arquivo movido**

O arquivo move de `features/campaign/` (profundidade 2 a partir de `src/`) para `components/molecules/` (também profundidade 2). Imports que apontam para dirs ao nível de `src/` continuam `../../`. Apenas o import de um irmão em `components/` muda.

Abrir `src/components/molecules/CharacterSidebarItem.tsx`. As linhas de import atuais são:
```tsx
import styled from "styled-components";
import type { CharacterBaseSummary, StatusBar } from "../../types/characterSheet";
import { createEmptyCharacterSheet } from "../../features/sheet/factories/characterSheet.factory";
import CharacterSheetHeader from "../../components/molecules/CharacterSheetHeader";
```

Trocar a última linha (CharacterSheetHeader agora é irmão na mesma pasta `molecules/`):
```tsx
import CharacterSheetHeader from "./CharacterSheetHeader";
```
As outras 3 linhas (`styled-components`, `../../types/...`, `../../features/sheet/...`) ficam **inalteradas**.

- [ ] **Step 3: Atualizar o import em `CampaignPage.tsx`**

`src/pages/CampaignPage.tsx` linha 10 — trocar:
```tsx
import CharacterSidebarItem from "../features/campaign/CharacterSidebarItem";
```
por:
```tsx
import CharacterSidebarItem from "../components/molecules/CharacterSidebarItem";
```

- [ ] **Step 4: Atualizar o import em `MatchPage.tsx`**

`src/pages/MatchPage.tsx` linha 15 — trocar:
```tsx
import CharacterSidebarItem from "../features/campaign/CharacterSidebarItem";
```
por:
```tsx
import CharacterSidebarItem from "../components/molecules/CharacterSidebarItem";
```

- [ ] **Step 5: Build — TS pega qualquer import quebrado**

Run: `npm run build`
Expected: verde. Se aparecer "Cannot find module .../CharacterSidebarItem", revisar os paths dos Steps 2-4.

- [ ] **Step 6: Rodar a suite — comportamento inalterado**

Run: `npm test`
Expected: 87 testes passando (13 arquivos). A movimentação não altera comportamento — os characterization tests da Fase 0 confirmam.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(components): promote CharacterSidebarItem to molecules"
```

---

## Task 2: Promover `AdaptativeActionButton` para `components/molecules/AdaptiveActionButton.tsx`

**Files:**
- Move: `src/features/campaign/AdaptativeActionButton.tsx` → `src/components/molecules/AdaptiveActionButton.tsx`
- Modify: `src/pages/CampaignPage.tsx:12` (import path)
- Modify: `src/pages/MatchPage.tsx:16` (import path)

`AdaptiveActionButton` (componente) é importado por `CampaignPage` e `MatchPage` — já é compartilhado de facto. O arquivo tinha typo no nome (`AdaptativeActionButton.tsx`); como todos os importadores serão reescritos nesta task de qualquer forma, o nome do arquivo é corrigido para `AdaptiveActionButton.tsx`, casando com o nome do componente exportado.

- [ ] **Step 1: Mover o arquivo com `git mv`, corrigindo o nome**

```bash
git mv src/features/campaign/AdaptativeActionButton.tsx src/components/molecules/AdaptiveActionButton.tsx
```

- [ ] **Step 2: Corrigir o import DENTRO do arquivo movido**

Abrir `src/components/molecules/AdaptiveActionButton.tsx`. As linhas de import atuais:
```tsx
import { useRef, useEffect, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import PlusIcon from "../../components/ions/PlusIcon";
import styled from "styled-components";
```

`useDebounce` está em `src/hooks/` — de `components/molecules/` o caminho continua `../../hooks/useDebounce` (inalterado). `PlusIcon` está em `src/components/ions/` — de `components/molecules/` o caminho vira `../ions/PlusIcon`. Trocar a linha do PlusIcon:
```tsx
import PlusIcon from "../ions/PlusIcon";
```
As outras 3 linhas ficam inalteradas.

- [ ] **Step 3: Atualizar o import em `CampaignPage.tsx`**

`src/pages/CampaignPage.tsx` linha 12 — trocar:
```tsx
import AdaptiveActionButton from "../features/campaign/AdaptativeActionButton";
```
por:
```tsx
import AdaptiveActionButton from "../components/molecules/AdaptiveActionButton";
```

- [ ] **Step 4: Atualizar o import em `MatchPage.tsx`**

`src/pages/MatchPage.tsx` linha 16 — trocar:
```tsx
import AdaptiveActionButton from "../features/campaign/AdaptativeActionButton";
```
por:
```tsx
import AdaptiveActionButton from "../components/molecules/AdaptiveActionButton";
```

- [ ] **Step 5: Verificar que nada mais referencia o caminho antigo**

Run: `grep -rn "AdaptativeActionButton" src`
Expected: zero resultados. Se houver algum, atualizar.

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: verde.

- [ ] **Step 7: Rodar a suite**

Run: `npm test`
Expected: 87 testes passando.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(components): promote AdaptiveActionButton to molecules, fix filename typo"
```

---

## Task 3: Criar `RuleSection` (molecule) e `RulesSidebar` (organism)

**Files:**
- Create: `src/components/molecules/RuleSection.tsx`
- Create: `src/components/organisms/RulesSidebar.tsx`

`RulesSidebar` é o shell da sidebar de regras; `RuleSection` é uma seção dentro dela. `RulesSidebar` recebe as seções via `children` (slot) — ela **não** importa `RuleSection`; as páginas é que compõem `<RuleSection>` dentro de `<RulesSidebar>`. Os estilos abaixo derivam da sidebar de regras que já existe (inline) em `CreateCampaignPage.tsx`, com o título alinhado ao estilo da sidebar de personagens (centralizado, peso 700) para simetria visual nas páginas de detalhe.

- [ ] **Step 1: Criar `src/components/molecules/RuleSection.tsx`**

```tsx
import { type ReactNode } from "react";
import styled from "styled-components";

interface RuleSectionProps {
  title: string;
  children: ReactNode;
}

export default function RuleSection({ title, children }: RuleSectionProps) {
  return (
    <Section>
      <SectionTitle>{title}</SectionTitle>
      <SectionBody>{children}</SectionBody>
    </Section>
  );
}

const Section = styled.div`
  background-color: #493823;
  border-radius: 8px;
  padding: 15px;
`;

const SectionTitle = styled.h3`
  font-family: "Roboto", sans-serif;
  font-weight: 600;
  font-size: 24px;
  margin-bottom: 10px;
  color: white;
`;

const SectionBody = styled.p`
  font-family: "Roboto", sans-serif;
  font-weight: 300;
  font-size: 20px;
  color: white;
  line-height: 1.4;
`;
```

- [ ] **Step 2: Criar `src/components/organisms/RulesSidebar.tsx`**

```tsx
import { type ReactNode } from "react";
import styled from "styled-components";

interface RulesSidebarProps {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function RulesSidebar({
  title = "REGRAS",
  children,
  footer,
}: RulesSidebarProps) {
  return (
    <SidebarContainer>
      <SidebarTitle>{title}</SidebarTitle>
      <RulesContent>{children}</RulesContent>
      {footer && <SidebarFooter>{footer}</SidebarFooter>}
    </SidebarContainer>
  );
}

const SidebarContainer = styled.aside`
  width: 300px;
  background-color: #2d2215;
  padding: 20px;
  position: relative;
  overflow-y: auto;
  flex-shrink: 0;
`;

const SidebarTitle = styled.h2`
  font-family: "Roboto", sans-serif;
  font-weight: 700;
  font-size: 32px;
  text-align: center;
  color: white;
  margin-bottom: 20px;
  border-bottom: 1px solid #696969;
  padding-bottom: 10px;
`;

const RulesContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const SidebarFooter = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: 300;
  margin-top: 30px;
  font-size: 18px;
  color: white;
  font-style: italic;
  text-align: center;
`;
```

- [ ] **Step 3: Build — os arquivos novos compilam**

Run: `npm run build`
Expected: verde. Nada consome esses componentes ainda; o build só valida tipos/sintaxe.

- [ ] **Step 4: Rodar a suite**

Run: `npm test`
Expected: 87 testes passando (inalterado — nada consome os componentes novos).

- [ ] **Step 5: Commit**

```bash
git add src/components/molecules/RuleSection.tsx src/components/organisms/RulesSidebar.tsx
git commit -m "feat(components): add RuleSection molecule and RulesSidebar organism"
```

---

## Task 4: Criar `CharactersSidebar` (organism)

**Files:**
- Create: `src/components/organisms/CharactersSidebar.tsx`

Organism genérico no tipo do item. Recebe `items` + `renderItem` (a página decide o componente de item — `CharacterSidebarItem`, `EnrollmentSidebarItem`, etc.) + `footer` opcional (ex.: botão "Criar NPC"). `containerRef` opcional é repassado ao container scrollável — necessário porque `AdaptiveActionButton`, quando vive no footer, precisa de uma ref ao seu container de scroll. Os estilos derivam da `SidebarContainer`/`SidebarTitle`/`CharactersList` que hoje estão duplicadas em `CampaignPage` e `MatchPage`.

- [ ] **Step 1: Criar `src/components/organisms/CharactersSidebar.tsx`**

```tsx
import { type ReactNode, type RefObject } from "react";
import styled from "styled-components";

interface CharactersSidebarProps<T> {
  title?: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
  footer?: ReactNode;
  containerRef?: RefObject<HTMLDivElement | null>;
}

export default function CharactersSidebar<T>({
  title = "PERSONAGENS",
  items,
  renderItem,
  footer,
  containerRef,
}: CharactersSidebarProps<T>) {
  return (
    <SidebarContainer ref={containerRef}>
      <SidebarTitle>{title}</SidebarTitle>
      <CharactersList>
        {items.map((item) => renderItem(item))}
        {footer}
      </CharactersList>
    </SidebarContainer>
  );
}

const SidebarContainer = styled.div`
  width: 300px;
  background-color: #2d2215;
  padding: 20px;
  position: relative;
  overflow-y: auto;
  flex-shrink: 0;
`;

const SidebarTitle = styled.h2`
  font-family: "Roboto", sans-serif;
  font-weight: 700;
  font-size: 32px;
  text-align: center;
  color: white;
  margin-bottom: 20px;
  border-bottom: 1px solid #696969;
  padding-bottom: 10px;
`;

const CharactersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  padding-bottom: 103px;
`;
```

> Nota: `renderItem` deve retornar elementos com `key` — a página é responsável por passar a `key` (ex.: `<CharacterSidebarItem key={c.uuid} ... />`), exatamente como o código atual já faz.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: verde.

- [ ] **Step 3: Rodar a suite**

Run: `npm test`
Expected: 87 testes passando.

- [ ] **Step 4: Commit**

```bash
git add src/components/organisms/CharactersSidebar.tsx
git commit -m "feat(components): add CharactersSidebar organism"
```

---

## Task 5: Criar `DetailPageTemplate` (template)

**Files:**
- Create: `src/components/templates/DetailPageTemplate.tsx`

Shell de página de detalhe: `PageHeader` + body flex de 3 colunas (`leftSidebar` slot, `children` no centro, `rightSidebar` slot opcional). Os estilos `PageContainer`/`PageBody`/`MainContentContainer` derivam dos styled-components hoje duplicados em `CampaignPage` e `MatchPage` (idênticos nos dois). `mainRef` opcional é repassado ao container central scrollável (necessário para `AdaptiveActionButton` que vive no `children`).

- [ ] **Step 1: Criar `src/components/templates/DetailPageTemplate.tsx`**

```tsx
import { type ReactNode, type RefObject } from "react";
import styled from "styled-components";
import PageHeader from "../atoms/PageHeader";
import worldMap from "../../assets/images/worldmap.png";

interface DetailPageTemplateProps {
  headerColor?: string;
  bgImage?: string;
  mainRef?: RefObject<HTMLDivElement | null>;
  leftSidebar: ReactNode;
  rightSidebar?: ReactNode;
  children: ReactNode;
}

export default function DetailPageTemplate({
  headerColor = "#08491f",
  bgImage = worldMap,
  mainRef,
  leftSidebar,
  rightSidebar,
  children,
}: DetailPageTemplateProps) {
  return (
    <PageContainer>
      <PageHeader backgroundColor={headerColor} />
      <PageBody>
        {leftSidebar}
        <MainContentContainer ref={mainRef} $bgImage={bgImage}>
          {children}
        </MainContentContainer>
        {rightSidebar}
      </PageBody>
    </PageContainer>
  );
}

const PageContainer = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
`;

const PageBody = styled.main`
  display: flex;
  color: white;
  min-height: 0;
  overflow: hidden;
`;

const MainContentContainer = styled.div<{ $bgImage: string }>`
  flex: 1;
  padding: 30px 30px 20px 30px;
  overflow-y: auto;

  /* world map */
  background-image: url(${({ $bgImage }) => $bgImage});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed; /* fixes the background during scrolling */
`;
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: verde. Erro comum: o import default de `PageHeader` — confirmar que `src/components/atoms/PageHeader.tsx` tem `export default`. (Tem; `CampaignPage` o importa como default hoje.)

- [ ] **Step 3: Rodar a suite**

Run: `npm test`
Expected: 87 testes passando.

- [ ] **Step 4: Commit**

```bash
git add src/components/templates/DetailPageTemplate.tsx
git commit -m "feat(components): add DetailPageTemplate"
```

---

## Task 6: Refatorar `CampaignPage` para usar o template + organisms

**Files:**
- Modify: `src/pages/CampaignPage.tsx` (reescreve imports, JSX de retorno e remove styled-components extraídos)
- Modify: `src/pages/__tests__/CampaignPage.test.tsx` (+1 teste)

A lógica do componente (hooks, handlers, cálculo de `sortedSheets`, guards de loading/error) **não muda**. O que muda: o JSX de retorno passa a usar `DetailPageTemplate` + `CharactersSidebar` + `RulesSidebar` + `RuleSection`, e os styled-components de layout extraídos são removidos.

- [ ] **Step 1: Substituir o bloco de imports**

Substituir as linhas 1-18 de `src/pages/CampaignPage.tsx` por:

```tsx
import { useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { useCampaignDetails } from "../hooks/useCampaignDetails";
import { useSubmitCharacterSheet } from "../hooks/useSubmitCharacterSheet";
import type { CharacterPrivateSummary } from "../types/campaign";
import styled from "styled-components";
import CharacterSidebarItem from "../components/molecules/CharacterSidebarItem";
import MatchItem from "../features/campaign/MatchItem";
import AdaptiveActionButton from "../components/molecules/AdaptiveActionButton";
import { getSortedCharacters } from "../features/campaign/utils/characterUtils";
import { LoadingContainer, ErrorContainer } from "../components/atoms/PageStates";
import ExpandableText from "../components/molecules/ExpandableText";
import ConfirmDialog from "../components/molecules/ConfirmDialog";
import DetailPageTemplate from "../components/templates/DetailPageTemplate";
import CharactersSidebar from "../components/organisms/CharactersSidebar";
import RulesSidebar from "../components/organisms/RulesSidebar";
import RuleSection from "../components/molecules/RuleSection";
import { isApiError } from "../services/httpClient";
```

Mudanças: removido `worldMap` e `PageHeader` (agora no `DetailPageTemplate`); `CharacterSidebarItem`/`AdaptiveActionButton` apontam para `components/molecules/` (já feito nas Tasks 1-2, mantido aqui); adicionados `DetailPageTemplate`, `CharactersSidebar`, `RulesSidebar`, `RuleSection`.

- [ ] **Step 2: Substituir o `return (...)` do componente**

A lógica entre a linha de assinatura da função e o `return` (hooks, `isMaster`, `playerSheetId`, handlers, `sortedSheets`, guards de `isPending`/`isError`/`!campaign`) **permanece exatamente como está**. Substituir apenas o JSX de retorno (o bloco `return ( <CampaignContainer> ... </CampaignContainer> );`) por:

```tsx
  return (
    <>
      <DetailPageTemplate
        mainRef={mainContentRef}
        leftSidebar={
          <CharactersSidebar
            containerRef={sidebarRef}
            items={sortedSheets}
            renderItem={(character) => (
              <CharacterSidebarItem
                key={character.uuid}
                character={character}
                isMaster={!!isMaster}
                isOwn={character.playerUuid === user?.uuid}
                onClick={() =>
                  navigate(`/charactersheet/${character.uuid}`, {
                    state: { isPending: !!character.isPending, campaignId: id },
                  })
                }
              />
            )}
            footer={
              isMaster && (
                <AdaptiveActionButton
                  label="Criar NPC"
                  type="character"
                  onClick={handleCreateNpc}
                  containerRef={sidebarRef}
                  contentChangeSignal={descriptionSignal}
                />
              )
            }
          />
        }
        rightSidebar={
          <RulesSidebar>
            <RuleSection title="Configurações Gerais">
              As regras da campanha serão configuradas aqui.
            </RuleSection>
            <RuleSection title="Sistema de Combate">
              Configure o sistema de combate da sua campanha.
            </RuleSection>
            <RuleSection title="Progressão de Personagens">
              Define como os personagens evoluem durante a campanha.
            </RuleSection>
            <RuleSection title="Nen & Habilidades">
              Configure as regras para uso e desenvolvimento de Nen.
            </RuleSection>
          </RulesSidebar>
        }
      >
        <CampaignHeader>
          <CampaignTitle>{campaign.name.toUpperCase()}</CampaignTitle>
          <CampaignDate>
            Data Atual:{" "}
            {(() => {
              if (!campaign.storyCurrentAt) return "Data não disponível";
              const [date] = campaign.storyCurrentAt.split("T");
              const [year, month, day] = date.split("-");
              return `${day}/${month}/${year}`;
            })()}
          </CampaignDate>
        </CampaignHeader>

        <CampaignBriefDescription>
          {campaign.briefInitialDescription}
        </CampaignBriefDescription>

        <ExpandableText onToggle={() => setDescriptionSignal((s) => !s)}>
          {campaign.description}
        </ExpandableText>

        <CampaignDate>
          Início:{" "}
          {(() => {
            const [year, month, day] = campaign.storyStartAt.split("-");
            return `${day}/${month}/${year}`;
          })()}
        </CampaignDate>

        <MatchesList>
          {(campaign.matches || []).map((match) => (
            <MatchItem
              key={match.uuid}
              match={match}
              onClick={() =>
                navigate(`/campaigns/${campaign.uuid}/matches/${match.uuid}`, {
                  state: { sheetId: playerSheetId },
                })
              }
            />
          ))}

          {isMaster && (
            <AdaptiveActionButton
              label="Criar Partida"
              type="match"
              onClick={handleCreateMatch}
              containerRef={mainContentRef}
              contentChangeSignal={descriptionSignal}
            />
          )}

          {!isMaster && !submitted && sheetId && (
            <>
              <AdaptiveActionButton
                label={submitPending ? "Submetendo..." : "Submeter Ficha"}
                type="match"
                onClick={submitPending ? () => {} : handleRequestSubmit}
                containerRef={mainContentRef}
                contentChangeSignal={descriptionSignal}
              />
              {nickConflictError && (
                <NickConflictMessage>
                  Já existe um personagem com o nick &quot;{sheetNick}&quot; nesta campanha. Escolha outro nick antes de submeter.
                </NickConflictMessage>
              )}
              {submitFailed && !nickConflictError && (
                <NickConflictMessage>
                  {isApiError(submitError, 409)
                    ? `Já existe um personagem com o nick "${sheetNick}" nesta campanha. Escolha outro nick antes de submeter.`
                    : "Erro ao submeter ficha. Tente novamente."}
                </NickConflictMessage>
              )}
            </>
          )}
        </MatchesList>
      </DetailPageTemplate>

      {showSubmitConfirm && (
        <ConfirmDialog
          message="Tem certeza que deseja submeter esta ficha para a campanha? Esta ação não pode ser desfeita."
          confirmLabel="Submeter"
          onConfirm={() => {
            setShowSubmitConfirm(false);
            handleSubmitSheet();
          }}
          onCancel={() => setShowSubmitConfirm(false)}
        />
      )}
    </>
  );
```

- [ ] **Step 3: Remover os styled-components extraídos, manter os page-local**

No bloco de `styled` ao final do arquivo, **remover** estas 6 definições (foram extraídas para `DetailPageTemplate`/`CharactersSidebar`): `CampaignContainer`, `PageBody`, `SidebarContainer`, `SidebarTitle`, `CharactersList`, `MainContentContainer`.

**Manter inalteradas** estas 6 (continuam usadas no JSX acima): `CampaignHeader`, `CampaignTitle`, `CampaignDate`, `CampaignBriefDescription`, `MatchesList`, `NickConflictMessage`.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: verde. `noUnusedLocals`/`noUnusedParameters` pegam qualquer styled-component órfão ou import não usado — se acusar, removê-lo. Confirmar que `useRef` ainda é usado (`sidebarRef`, `mainContentRef`).

- [ ] **Step 5: Rodar a suite — characterization tests da Fase 0 não podem quebrar**

Run: `npx vitest run src/pages/__tests__/CampaignPage.test.tsx`
Expected: 11 testes passando. Se algum falhar, o refactor mudou comportamento observável — comparar o JSX renderizado com o original e corrigir o **CampaignPage** (não o teste).

- [ ] **Step 6: Adicionar teste de characterization da RulesSidebar**

Em `src/pages/__tests__/CampaignPage.test.tsx`, dentro do `describe("CampaignPage", ...)`, adicionar um novo grupo no final (antes do `})` que fecha o describe externo):

```tsx
  describe("sidebar de regras", () => {
    it("exibe a sidebar de regras com as seções", async () => {
      renderPage();
      expect(await screen.findByText(/^REGRAS$/i)).toBeInTheDocument();
      expect(screen.getByText(/Sistema de Combate/i)).toBeInTheDocument();
      expect(screen.getByText(/Progressão de Personagens/i)).toBeInTheDocument();
      expect(screen.getByText(/Nen & Habilidades/i)).toBeInTheDocument();
    });
  });
```

> `renderPage()` é o helper já definido no topo do arquivo. O `findByText` espera o carregamento da campanha (a sidebar só renderiza depois do guard de loading). O regex `/^REGRAS$/i` evita casar com outras ocorrências da palavra.

- [ ] **Step 7: Rodar o arquivo de teste do CampaignPage inteiro**

Run: `npx vitest run src/pages/__tests__/CampaignPage.test.tsx`
Expected: 12 testes passando (11 originais + 1 novo).

- [ ] **Step 8: Rodar a suite completa**

Run: `npm test`
Expected: 88 testes passando (87 + 1 novo).

- [ ] **Step 9: Commit**

```bash
git add src/pages/CampaignPage.tsx src/pages/__tests__/CampaignPage.test.tsx
git commit -m "refactor(pages): rebuild CampaignPage on DetailPageTemplate, add RulesSidebar"
```

---

## Task 7: Refatorar `MatchPage` para usar o template + organisms

**Files:**
- Modify: `src/pages/MatchPage.tsx` (reescreve imports, JSX de retorno e remove styled-components extraídos)
- Modify: `src/pages/__tests__/MatchPage.test.tsx` (+1 teste)

Mesma estratégia da Task 6. A lógica do componente (hooks, `getMatchStatus`, `formatDate`/`formatDateTime`, handlers, guards) **não muda**. `MatchPage` tem só `mainContentRef` (sem ref na sidebar — não há `AdaptiveActionButton` na sidebar de match). A sidebar de personagens do MatchPage alterna entre `enrollments` (antes do jogo começar) e `participants` (depois) — por isso o `leftSidebar` é um condicional entre duas instâncias de `CharactersSidebar`, cada uma homogênea no seu tipo.

- [ ] **Step 1: Substituir o bloco de imports**

Substituir as linhas 1-20 de `src/pages/MatchPage.tsx` por:

```tsx
import { useState, useRef } from "react";
import { Navigate, useParams, useNavigate, useLocation } from "react-router-dom";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { useMatchDetails } from "../hooks/useMatchDetails";
import { useMatchEnrollments } from "../hooks/useMatchEnrollments";
import { useMatchParticipants } from "../hooks/useMatchParticipants";
import { useAcceptEnrollment } from "../hooks/useAcceptEnrollment";
import { useRejectEnrollment } from "../hooks/useRejectEnrollment";
import { useEnrollCharacterSheet } from "../hooks/useEnrollCharacterSheet";
import type { CharacterPrivateSummary } from "../types/characterSheet";
import styled from "styled-components";
import EnrollmentSidebarItem from "../features/match/EnrollmentSidebarItem";
import CharacterSidebarItem from "../components/molecules/CharacterSidebarItem";
import AdaptiveActionButton from "../components/molecules/AdaptiveActionButton";
import ExpandableText from "../components/molecules/ExpandableText";
import { LoadingContainer, ErrorContainer } from "../components/atoms/PageStates";
import ConfirmDialog from "../components/molecules/ConfirmDialog";
import DetailPageTemplate from "../components/templates/DetailPageTemplate";
import CharactersSidebar from "../components/organisms/CharactersSidebar";
import RulesSidebar from "../components/organisms/RulesSidebar";
import RuleSection from "../components/molecules/RuleSection";
```

Mudanças: removidos `worldMap` e `PageHeader`; `CharacterSidebarItem`/`AdaptiveActionButton` apontam para `components/molecules/`; adicionados `DetailPageTemplate`, `CharactersSidebar`, `RulesSidebar`, `RuleSection`. As funções `getMatchStatus`/`formatDate`/`formatDateTime` e o tipo `MatchStatus` que ficam logo após os imports **permanecem inalterados**.

- [ ] **Step 2: Substituir o `return (...)` do componente**

Toda a lógica antes do `return` (hooks, `matchStarted`, `isMaster`, handlers `handleAccept`/`handleReject`/`handleLobbyConfirm`/`handleEnroll`, guards de `!token`/`isPending`/`isError`/`!match`, `status`, `statusLabels`, `canEnroll`) **permanece exatamente como está**. Substituir apenas o JSX de retorno (`return ( <MatchContainer> ... </MatchContainer> );`) por:

```tsx
  return (
    <>
      <DetailPageTemplate
        mainRef={mainContentRef}
        leftSidebar={
          !match.gameStartAt ? (
            <CharactersSidebar
              items={enrollments}
              renderItem={(enrollment) => (
                <EnrollmentSidebarItem
                  key={enrollment.uuid}
                  enrollment={enrollment}
                  isMaster={isMaster}
                  isLoading={!!actionLoading[enrollment.uuid]}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onClick={() =>
                    navigate(`/charactersheet/${enrollment.characterSheet.uuid}`)
                  }
                />
              )}
            />
          ) : (
            <CharactersSidebar
              items={participants}
              renderItem={(participant) => {
                const priv = participant.characterSheet.private;
                if (!priv) {
                  return (
                    <BasicParticipantItem key={participant.uuid}>
                      <span>{participant.characterSheet.nickName}</span>
                      {participant.leftAt && <LeftBadge>Saiu</LeftBadge>}
                    </BasicParticipantItem>
                  );
                }
                const character = {
                  ...participant.characterSheet,
                  ...priv,
                  isPending: false,
                } as CharacterPrivateSummary & { isPending?: boolean };
                return (
                  <CharacterSidebarItem
                    key={participant.uuid}
                    character={character}
                    isMaster={isMaster}
                    hasLeft={!!participant.leftAt}
                    onClick={() =>
                      navigate(`/charactersheet/${participant.characterSheet.uuid}`)
                    }
                  />
                );
              }}
            />
          )
        }
        rightSidebar={
          <RulesSidebar>
            <RuleSection title="Configurações Gerais">
              As regras da partida seguem as definições da campanha.
            </RuleSection>
            <RuleSection title="Sistema de Combate">
              Configure o sistema de combate da partida.
            </RuleSection>
            <RuleSection title="Progressão de Personagens">
              Define como os personagens evoluem durante a partida.
            </RuleSection>
            <RuleSection title="Nen & Habilidades">
              Configure as regras para uso e desenvolvimento de Nen.
            </RuleSection>
          </RulesSidebar>
        }
      >
        <MatchHeader>
          <MatchTitle>{match.title.toUpperCase()}</MatchTitle>
          <DateSection>
            <StatusPill $status={status}>{statusLabels[status]}</StatusPill>
            {status === "scheduled" ? (
              <DateLabel>
                Agendada para:{" "}
                <span>{formatDateTime(match.gameScheduledAt)}</span>
              </DateLabel>
            ) : (
              <DateLabel>
                Iniciada em:{" "}
                <DateValueWithTooltip
                  title={`Agendada para: ${formatDateTime(match.gameScheduledAt)}`}
                >
                  {formatDateTime(match.gameStartAt!)}
                </DateValueWithTooltip>
              </DateLabel>
            )}
          </DateSection>
        </MatchHeader>

        <StoryDate>Início na história: {formatDate(match.storyStartAt)}</StoryDate>

        <MatchBriefDescription>
          {match.briefInitialDescription}
        </MatchBriefDescription>

        <ExpandableText onToggle={() => setDescriptionSignal((s) => !s)}>
          {match.description}
        </ExpandableText>

        {match.briefFinalDescription && (
          <MatchFinalDescription>
            {match.briefFinalDescription}
          </MatchFinalDescription>
        )}

        {match.storyEndAt && (
          <StoryDate>Fim na história: {formatDate(match.storyEndAt)}</StoryDate>
        )}

        <ActionsList>
          {isMaster && !match.gameStartAt && (
            <AdaptiveActionButton
              label="Abrir Lobby"
              type="match"
              onClick={() => setShowLobbyConfirm(true)}
              containerRef={mainContentRef}
              contentChangeSignal={descriptionSignal}
            />
          )}

          {canEnroll && (
            <AdaptiveActionButton
              label={enrollPending ? "Inscrevendo..." : "Inscrever-se"}
              type="match"
              onClick={enrollPending ? () => {} : () => setShowEnrollConfirm(true)}
              containerRef={mainContentRef}
              contentChangeSignal={descriptionSignal}
            />
          )}
        </ActionsList>
      </DetailPageTemplate>

      {showLobbyConfirm && (
        <ConfirmOverlay onClick={() => setShowLobbyConfirm(false)}>
          <StyledLobbyDialog onClick={(e) => e.stopPropagation()}>
            <ConfirmText>
              Tem certeza que deseja abrir o lobby desta partida? Os jogadores
              aceitos poderão entrar.
            </ConfirmText>
            <ConfirmButtons>
              <DialogCancelButton onClick={() => setShowLobbyConfirm(false)}>
                Cancelar
              </DialogCancelButton>
              <DialogLobbyButton onClick={handleLobbyConfirm}>
                Abrir Lobby
              </DialogLobbyButton>
            </ConfirmButtons>
          </StyledLobbyDialog>
        </ConfirmOverlay>
      )}

      {showEnrollConfirm && (
        <ConfirmDialog
          message="Tem certeza que deseja se inscrever nesta partida? Esta ação não pode ser desfeita."
          confirmLabel="Inscrever-se"
          onConfirm={() => {
            setShowEnrollConfirm(false);
            handleEnroll();
          }}
          onCancel={() => setShowEnrollConfirm(false)}
        />
      )}
    </>
  );
```

- [ ] **Step 3: Remover os styled-components extraídos, manter os page-local**

No bloco de `styled` ao final do arquivo, **remover** estas 6 definições (extraídas para `DetailPageTemplate`/`CharactersSidebar`): `MatchContainer`, `PageBody`, `SidebarContainer`, `SidebarTitle`, `CharactersList`, `MainContentContainer`.

**Manter inalteradas** todas as outras (continuam usadas): `BasicParticipantItem`, `LeftBadge`, `MatchHeader`, `MatchTitle`, `DateSection`, `StatusPill`, `DateLabel`, `DateValueWithTooltip`, `StoryDate`, `MatchBriefDescription`, `MatchFinalDescription`, `ActionsList`, `ConfirmOverlay`, `StyledLobbyDialog`, `ConfirmText`, `ConfirmButtons`, `BaseDialogButton`, `DialogCancelButton`, `DialogLobbyButton`.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: verde. Se `noUnusedLocals` acusar styled-component órfão ou import não usado, remover. Confirmar que `useRef` continua usado (`mainContentRef`).

- [ ] **Step 5: Rodar a suite do MatchPage — Fase 0 não pode quebrar**

Run: `npx vitest run src/pages/__tests__/MatchPage.test.tsx`
Expected: 15 testes passando. Se algum falhar, o refactor mudou comportamento observável — corrigir o **MatchPage** (não o teste).

- [ ] **Step 6: Adicionar teste de characterization da RulesSidebar**

Em `src/pages/__tests__/MatchPage.test.tsx`, dentro do `describe("MatchPage", ...)`, adicionar no final (antes do `})` que fecha o describe externo):

```tsx
  describe("sidebar de regras", () => {
    it("exibe a sidebar de regras com as seções", async () => {
      renderPage();
      expect(await screen.findByText(/^REGRAS$/i)).toBeInTheDocument();
      expect(screen.getByText(/Sistema de Combate/i)).toBeInTheDocument();
      expect(screen.getByText(/Progressão de Personagens/i)).toBeInTheDocument();
      expect(screen.getByText(/Nen & Habilidades/i)).toBeInTheDocument();
    });
  });
```

> `renderPage()` é o helper já definido no topo do arquivo de teste do MatchPage.

- [ ] **Step 7: Rodar o arquivo de teste do MatchPage inteiro**

Run: `npx vitest run src/pages/__tests__/MatchPage.test.tsx`
Expected: 16 testes passando (15 + 1 novo).

- [ ] **Step 8: Rodar a suite completa**

Run: `npm test`
Expected: 89 testes passando (88 após a Task 6 + 1 novo).

- [ ] **Step 9: Build final + commit**

```bash
npm run build
git add src/pages/MatchPage.tsx src/pages/__tests__/MatchPage.test.tsx
git commit -m "refactor(pages): rebuild MatchPage on DetailPageTemplate, add RulesSidebar"
```

---

## Self-review checklist (executor faz antes de fechar a fase)

- [ ] `npm run build` verde
- [ ] `npm test` verde — 89 testes (87 da baseline + 2 novos de RulesSidebar)
- [ ] `npm run lint` verde
- [ ] Os 11 testes originais de `CampaignPage` e os 15 de `MatchPage` continuam passando **sem terem sido editados** (só foram adicionados testes novos; characterization preservada)
- [ ] `grep -rn "AdaptativeActionButton\|features/campaign/CharacterSidebarItem" src` → zero resultados (promoções completas)
- [ ] `src/features/campaign/` contém apenas `MatchItem.tsx` e `utils/` (CharacterSidebarItem e AdaptiveActionButton saíram)
- [ ] Nenhum arquivo da zona pixel-tuned foi tocado (`git diff --name-only` da fase não lista `CharacterSheetHeader.tsx` nem os Diagrams)
- [ ] Smoke test manual: `npm run dev`, abrir uma campanha e uma partida — layout do header / sidebar de personagens / conteúdo central idêntico ao de antes; a sidebar de regras aparece à direita nas duas

## Next phase

Quando a Fase 1 estiver mergeada: nova sessão, `superpowers:writing-plans` para a **Fase 2** (ListPageTemplate + CreateFormTemplate + FormField), conforme §2 da spec.
