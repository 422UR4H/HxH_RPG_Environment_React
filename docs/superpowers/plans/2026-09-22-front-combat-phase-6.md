# Fase 6 do combate no front — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um turno de combate inteiro jogável no front — jogador declara, mestre abre, a peça
anda, o turno fecha, barras e HP andam — nas duas telas (mestre e jogador) e nos quatro
formatos, com o mestre podendo agir por um NPC.

**Architecture:** Um socket por partida (`useMatchWs`) despacha mensagens tipadas para um
**reducer puro** (`combatReducer`), onde moram todas as regras de estado (guarda de `seq`,
vida do fantasma, ordem de eventos). `useMatchCombat` liga os dois e expõe seletores e verbos.
A rota lê o papel uma vez e monta `GameMasterPage` ou `GamePlayerPage`; daí para baixo nenhum
componente pergunta "sou mestre?". O layout é um template de cinco zonas com quatro breakpoints
nomeados. A camada Pixi só desenha.

**Tech Stack:** React 19 + TypeScript strict (`verbatimModuleSyntax`), Vite, styled-components,
TanStack Query, `@pixi/react` + pixi-viewport, vitest + Testing Library + MSW.

**Spec:** `docs/superpowers/specs/2026-09-22-front-combat-phase-6-design.md` — leia inteiro
antes da Tarefa 1. Ele carrega as três decisões de UX desta fase e as invariantes I1–I5.

**Contrato (fonte da verdade do wire):**
`../System_X_System/docs/dev/api/match-combat-ws.md` — implemente contra ele, nunca contra o Go.
Divergência é bug do contrato: registre no PR, não contorne.

## Global Constraints

- **camelCase no wire, dos dois lados.** Nenhuma conversão. Não reintroduza `caseConverter`.
- **`import type { … }` obrigatório** para imports só de tipo (`verbatimModuleSyntax`).
  `noUnusedLocals`/`noUnusedParameters` estão ligados — variável não usada quebra o build.
- **`styled-components` apenas**, sem arquivo CSS. Cores e fontes só por token
  (`src/styles/tokens.ts`); se faltar um token, **crie o token**.
- **Nenhum número de breakpoint escrito à mão em código novo** — use `media.*` da Tarefa 2.
- **Nenhum componente abaixo da rota recebe `isMaster`** (invariante I2 do spec). Exceção já
  existente e mantida: `TacticalMapStage.fogDisabled`.
- **Guarda de `seq`:** `bars` só é substituído se `state.bars === null || payload.seq > state.bars.seq`
  — vale igual para `bars_updated` e `match_full_state.bars` (invariante I3).
- **O front nunca calcula onde a peça para** (I1). Fantasma é pedido; posição é o que chegou.
- Zona pixel-tuned (`CharacterSheetHeader`, `*Diagram`) **não se toca** nesta fase.
- Testes: `npm run test` (vitest run). Build: `npm run build`. Lint: `npm run lint`.
  A camada Pixi **não é coberta por teste** (`src/test/setup.ts` mocka `@pixi/react`) — o que
  for Pixi exige verificação no browser (Tarefa 14).
- Commits em PT-BR no imperativo, prefixo `feat:`/`fix:`/`test:`/`docs:`, e terminando com:
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  ```

## Mapa de arquivos

| Arquivo | Responsabilidade | Tarefa |
|---|---|---|
| `src/features/match/combat/combatErrorMessages.ts` | `code` → texto PT-BR | 1 |
| `src/features/match/combat/MatchErrorBanner.tsx` | superfície visual do `error` | 1 |
| `src/styles/breakpoints.ts` | os quatro breakpoints nomeados | 2 |
| `src/components/templates/MatchStageTemplate.tsx` | as cinco zonas | 2 |
| `src/features/match/combat/combatMessages.ts` | tipos 1:1 do wire | 3 |
| `src/features/match/combat/combatReducer.ts` | estado + todas as regras | 4 |
| `src/hooks/useMatchWs.ts` | parse/despacho + verbos de combate | 5 |
| `src/features/match/combat/useMatchCombat.ts` | reducer ↔ socket, seletores | 6 |
| `src/features/match/combat/actionDraft.ts` | rascunho + fantasmas em `localStorage` | 6 |
| `src/services/characterSheetsService.ts` | `getCombatCatalogue` | 7 |
| `src/hooks/useCombatCatalogue.ts` | React Query do catálogo | 7 |
| `src/features/tactical-map/hooks/useHoldGesture.ts` | gesto de segurar | 8 |
| `src/features/tactical-map/stage/PiecesLayer.tsx` | seleção, alvos, long-press, cascata | 8, 9 |
| `src/features/tactical-map/GhostLayer.tsx` | fantasma translúcido + seta | 9 |
| `src/features/match/combat/GeneralBar.tsx` · `OwnBars.tsx` · `EventStream.tsx` · `QueuePanel.tsx` · `CloseTurnRefusedDialog.tsx` | organismos burros | 10 |
| `src/features/match/combat/ActionComposer.tsx` | a bottom sheet de ação | 11 |
| `src/pages/GamePlayerPage.tsx` | orquestrador do jogador | 12 |
| `src/pages/GameMasterPage.tsx` | orquestrador do mestre | 13 |
| `src/pages/GamePage.tsx` | vira a rota que escolhe a página | 12 |
| `src/features/match/WallActionSheet.tsx` | menu de parede extraído do `GamePage` | 12 |

---

### Task 1: `error` deixa de ser engolido

**Por que primeiro:** hoje `useMatchWs.ts` tem `catch { /* ignore malformed messages */ }` e
nenhum ramo para `type === "error"`. Toda recusa do servidor some. Sem isto o resto da fase é
depurado às cegas (§13 do documento mestre).

**Files:**
- Create: `src/features/match/combat/combatErrorMessages.ts`
- Create: `src/features/match/combat/MatchErrorBanner.tsx`
- Modify: `src/hooks/useMatchWs.ts` (bloco `ws.onmessage`, ~linhas 181-215; `sendRaw` ~137)
- Modify: `src/pages/GamePage.tsx` (as duas chamadas com `skillName: "combat_strength"`, ~244 e ~256)
- Test: `src/hooks/__tests__/useMatchWs.test.ts` (acrescentar describe)

**Interfaces:**
- Produces: `useMatchWs({ …, onWsError?: (e: { code: string; message: string; sentType?: string }) => void })`;
  `combatErrorText(code: string, message: string): string`;
  `<MatchErrorBanner error={…} onDismiss={() => void} />`.
- Consumes: nada.

- [ ] **Step 1: Escreva o teste que falha**

Em `src/hooks/__tests__/useMatchWs.test.ts`, no fim do arquivo:

```ts
describe("useMatchWs error handling", () => {
  it("surfaces a server error with the type of the last send", () => {
    const onWsError = vi.fn();
    const { result } = renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", isMaster: true, onWsError }),
    );
    const ws = FakeWS.instances[0];
    ws.onopen?.();
    act(() => { result.current.sendAction({ targetId: ["w1"] }); });
    ws.emit("error", { code: "invalid_action", message: "actorId is required" });
    expect(onWsError).toHaveBeenCalledWith({
      code: "invalid_action",
      message: "actorId is required",
      sentType: "enqueue_action",
    });
  });

  it("does not throw on an unknown message type", () => {
    renderHook(() => useMatchWs({ matchUuid: "m1", token: "t", isMaster: false }));
    const ws = FakeWS.instances[0];
    ws.onopen?.();
    expect(() => ws.emit("something_new", {})).not.toThrow();
  });
});
```

- [ ] **Step 2: Rode e veja falhar**

Run: `npm run test -- src/hooks/__tests__/useMatchWs.test.ts`
Expected: FAIL — `onWsError` não foi chamado (a opção nem existe).

- [ ] **Step 3: Implemente em `useMatchWs.ts`**

No tipo `UseMatchWsOptions`, acrescente:

```ts
  /** Server refusal (`error`). Never broadcast: it is always about our own last send. */
  onWsError?: (e: { code: string; message: string; sentType?: string }) => void;
```

No corpo do hook, ao lado dos outros refs:

```ts
  const onWsErrorRef = useRef(onWsError);
  onWsErrorRef.current = onWsError;
  const lastSentTypeRef = useRef<string | undefined>(undefined);
```

Em `sendRaw`, antes do `ws.send`, registre o tipo: `lastSentTypeRef.current = type;`

No `ws.onmessage`, acrescente o ramo (antes do `catch`):

```ts
          } else if (msg.type === "error") {
            const p = msg.payload as { code?: string; message?: string };
            onWsErrorRef.current?.({
              code: p.code ?? "unknown",
              message: p.message ?? "",
              sentType: lastSentTypeRef.current,
            });
          } else if (import.meta.env.DEV) {
            console.warn("[match-ws] unhandled message type:", msg.type);
          }
```

E troque o catch mudo por:

```ts
        } catch (err) {
          if (import.meta.env.DEV) console.warn("[match-ws] malformed message", err);
        }
```

- [ ] **Step 4: Rode e veja passar**

Run: `npm run test -- src/hooks/__tests__/useMatchWs.test.ts`
Expected: PASS.

- [ ] **Step 5: Escreva o mapa de mensagens**

`src/features/match/combat/combatErrorMessages.ts`:

```ts
/** Uma recusa do servidor. Mora aqui, e não no banner, porque o reducer (T4) também a guarda. */
export type WsError = { code: string; message: string; sentType?: string; at: number };

// Mapeia o CÓDIGO do erro (contrato §7), nunca a prosa. `game_error` é o texto do erro de
// domínio e vai como veio — traduzi-lo aqui seria manter um dicionário do domínio no front.
const byCode: Record<string, string> = {
  invalid_message: "Mensagem malformada — recarregue a página.",
  unknown_type: "O servidor não reconheceu esta operação.",
  invalid_payload: "O servidor recusou o formato do envio.",
  forbidden: "Só o mestre pode fazer isso.",
  match_not_started: "A partida ainda não começou.",
  invalid_action: "Ação inválida.",
  move_blocked: "O movimento esbarra numa parede.",
};

const bySentType: Record<string, string> = {
  enqueue_action: "Não foi possível declarar a ação",
  open_next_action: "Não foi possível abrir o próximo turno",
  pull_action: "Não foi possível antecipar esta ação",
  close_turn: "Não foi possível fechar o turno",
  change_round_mode: "Não foi possível trocar o regime",
  enqueue_master_action: "Não foi possível executar a ação do mestre",
};

export function combatErrorText(code: string, message: string, sentType?: string): string {
  const base = code === "game_error" ? message : (byCode[code] ?? message ?? "Erro do servidor.");
  const prefix = sentType ? bySentType[sentType] : undefined;
  const detail = code === "game_error" || !message ? base : `${base} (${message})`;
  return prefix ? `${prefix}: ${detail}` : detail;
}
```

- [ ] **Step 6: Escreva o banner**

`src/features/match/combat/MatchErrorBanner.tsx`:

```tsx
import { useEffect } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import { combatErrorText } from "./combatErrorMessages";
import type { WsError } from "./combatErrorMessages";

export default function MatchErrorBanner({
  error,
  onDismiss,
}: {
  error: WsError | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [error, onDismiss]);

  if (!error) return null;
  return (
    <Banner role="alert" onClick={onDismiss}>
      {combatErrorText(error.code, error.message, error.sentType)}
    </Banner>
  );
}

const Banner = styled.div`
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  max-width: min(92%, 520px);
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid ${colors.statusError};
  background: ${colors.surfaceSidebar};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 13px;
  cursor: pointer;
`;
```

Se `colors.statusError` não existir em `src/styles/tokens.ts`, **crie o token** (uma linha) em
vez de escrever hex.

- [ ] **Step 7: Mate o `combat_strength` no `GamePage.tsx`**

Nas duas chamadas de ataque a parede (mestre e jogador), troque o bloco `attack` por `attack: {}`:

```tsx
                  sendMasterAction({ targetIds: [wallPicker.id], attack: {} });
```
```tsx
                  sendAction({ targetId: [wallPicker.id], attack: {} });
```

E afrouxe os tipos dos senders em `useMatchWs.ts` para aceitar isso:

```ts
      attack?: { weapon?: string };
```

nos dois (`sendAction` e `sendMasterAction`). O `hit` é derivado pelo servidor (sempre
`Accuracy` + proficiência da arma) e `damage` é descartado — mandar nome de perícia aqui não
muda nada e foi como `combat_strength` nasceu.

- [ ] **Step 8: Ligue o banner no `GamePage.tsx` (provisório)**

Acrescente `const [wsError, setWsError] = useState<WsError | null>(null);`, passe
`onWsError={(e) => setWsError({ ...e, at: Date.now() })}` ao `useMatchWs`, e renderize
`<MatchErrorBanner error={wsError} onDismiss={() => setWsError(null)} />` dentro do fragmento
de retorno. Esta fiação é substituída nas Tarefas 12–13; o objetivo é que a partir daqui
**nenhuma recusa do servidor seja invisível** enquanto o resto da fase é construído.

- [ ] **Step 9: Verificação e commit**

Run: `npm run test && npm run lint && npm run build`
Expected: tudo passa.

```bash
git add src/hooks/useMatchWs.ts src/pages/GamePage.tsx src/features/match/combat src/styles/tokens.ts
git commit -m "fix(match): trata error do servidor em vez de engoli-lo

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Breakpoints nomeados e `MatchStageTemplate`

**Files:**
- Create: `src/styles/breakpoints.ts`
- Create: `src/components/templates/MatchStageTemplate.tsx`
- Test: `src/components/templates/__tests__/MatchStageTemplate.test.tsx`

**Interfaces:**
- Produces: `breakpoints`, `media` (de `src/styles/breakpoints.ts`);
  `<MatchStageTemplate topbar rail panel stage aside />`, todos `ReactNode`
  (`panel` e `aside` opcionais).
- Consumes: nada.

- [ ] **Step 1: Escreva o teste que falha**

`src/components/templates/__tests__/MatchStageTemplate.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MatchStageTemplate from "../MatchStageTemplate";

describe("MatchStageTemplate", () => {
  it("renders every zone it is given", () => {
    render(
      <MatchStageTemplate
        topbar={<div>topbar-zone</div>}
        rail={<div>rail-zone</div>}
        panel={<div>panel-zone</div>}
        stage={<div>stage-zone</div>}
        aside={<div>aside-zone</div>}
      />,
    );
    ["topbar", "rail", "panel", "stage", "aside"].forEach((z) =>
      expect(screen.getByText(`${z}-zone`)).toBeInTheDocument(),
    );
  });

  it("omits the panel and the aside when they are not given", () => {
    render(<MatchStageTemplate topbar={<div />} rail={<div />} stage={<div>stage-zone</div>} />);
    expect(screen.getByText("stage-zone")).toBeInTheDocument();
    expect(screen.queryByTestId("match-panel")).toBeNull();
    expect(screen.queryByTestId("match-aside")).toBeNull();
  });
});
```

- [ ] **Step 2: Rode e veja falhar**

Run: `npm run test -- src/components/templates/__tests__/MatchStageTemplate.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Escreva os breakpoints**

`src/styles/breakpoints.ts`:

```ts
/**
 * Os quatro breakpoints da partida. Nome, não número: quatro formatos × duas telas com
 * número mágico é como a UI diverge sem ninguém perceber.
 *
 * O tablet gira: em pé cai em `tabletUp`, deitado em `railUp`.
 */
export const breakpoints = { tabletUp: 768, railUp: 1024, asideUp: 1280 } as const;

export const media = {
  phone: `@media (max-width: ${breakpoints.tabletUp - 1}px)`,
  tabletUp: `@media (min-width: ${breakpoints.tabletUp}px)`,
  railUp: `@media (min-width: ${breakpoints.railUp}px)`,
  asideUp: `@media (min-width: ${breakpoints.asideUp}px)`,
} as const;
```

- [ ] **Step 4: Escreva o template**

`src/components/templates/MatchStageTemplate.tsx`:

```tsx
import type { ReactNode } from "react";
import styled from "styled-components";
import { media } from "../../styles/breakpoints";
import { colors } from "../../styles/tokens";

type Props = {
  topbar: ReactNode;
  rail: ReactNode;
  stage: ReactNode;
  panel?: ReactNode;
  aside?: ReactNode;
};

/**
 * As cinco zonas da partida. O template decide ONDE cada zona aparece em cada largura; a
 * página decide O QUE vai dentro.
 *
 * O rail e o rodapé são o MESMO componente: quem deita o rail é o CSS, não um ramo de
 * JavaScript. Dois componentes divergiriam para sempre.
 *
 * O `stage` nunca colapsa — é a única faixa 1fr do grid.
 */
export default function MatchStageTemplate({ topbar, rail, stage, panel, aside }: Props) {
  return (
    <Shell>
      <TopBarZone>{topbar}</TopBarZone>
      <Middle>
        <RailZone>{rail}</RailZone>
        {panel && <PanelZone data-testid="match-panel">{panel}</PanelZone>}
        <StageZone>{stage}</StageZone>
        {aside && <AsideZone data-testid="match-aside">{aside}</AsideZone>}
      </Middle>
    </Shell>
  );
}

const Shell = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100dvh;
  overflow: hidden;
  background: ${colors.surfacePage};
`;

const TopBarZone = styled.header`
  min-height: 44px;
`;

const Middle = styled.div`
  position: relative;
  display: grid;
  min-height: 0;
  grid-template-areas: "stage";
  grid-template-columns: 1fr;

  ${media.railUp} {
    grid-template-areas: "rail panel stage";
    grid-template-columns: auto auto 1fr;
  }
  ${media.asideUp} {
    grid-template-areas: "rail panel stage aside";
    grid-template-columns: auto auto 1fr 320px;
  }
`;

const StageZone = styled.main`
  grid-area: stage;
  position: relative;
  min-width: 0;
  min-height: 0;
`;

/* Rodapé abaixo de railUp; coluna em pé a partir dele. Um componente, duas formas. */
const RailZone = styled.nav`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  background: ${colors.surfaceSidebar};

  ${media.railUp} {
    position: static;
    grid-area: rail;
    flex-direction: column;
    justify-content: flex-start;
    width: 72px;
  }
`;

/* Bottom sheet no celular e no tablet em pé; coluna a partir de railUp. */
const PanelZone = styled.section`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  max-height: 70dvh;
  overflow-y: auto;
  background: ${colors.surfaceSidebar};
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;

  ${media.tabletUp} {
    max-height: 80dvh;
  }
  ${media.railUp} {
    position: static;
    grid-area: panel;
    width: 320px;
    max-height: none;
    border-radius: 0;
  }
`;

/* Gaveta sobre o stage; fixa a partir de asideUp. */
const AsideZone = styled.aside`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(86%, 360px);
  z-index: 25;
  overflow-y: auto;
  background: ${colors.surfaceSidebar};

  ${media.asideUp} {
    position: static;
    grid-area: aside;
    width: auto;
  }
`;
```

Se `colors.surfacePage` não existir, use o token de fundo já usado por `DetailPageTemplate` —
leia esse arquivo e reuse o mesmo nome em vez de criar um sinônimo.

- [ ] **Step 5: Rode e veja passar**

Run: `npm run test -- src/components/templates/__tests__/MatchStageTemplate.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/styles/breakpoints.ts src/components/templates
git commit -m "feat(match): template de cinco zonas com breakpoints nomeados

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Os tipos do wire de combate

**Files:**
- Create: `src/features/match/combat/combatMessages.ts`

**Interfaces:**
- Produces: todos os tipos abaixo. As Tarefas 4, 5 e 6 importam daqui.
- Consumes: nada.

Tarefa de digitação fiel ao contrato — nada de inventar campo. Cada tipo abaixo foi conferido
contra `match-combat-ws.md`. **Campo com `omitempty` no Go vira `?:` no TS, nunca `| null`.**

- [ ] **Step 1: Escreva o arquivo**

```ts
export type Bar = "action" | "move";
export type RoundMode = "Free" | "Race";
export type MoveCategory = "Dash" | "Shift";
export type SceneCategory = "battle" | "roleplay";

export type ScenePayload = {
  sceneId: string;
  category: SceneCategory;
  briefInitialDescription: string;
};

export type BarsPayload = {
  seq: number;
  /** Uma barra que ainda não precificou está AUSENTE do mapa. */
  prices: Partial<Record<Bar, number>>;
  characters: Array<{
    characterId: string;
    actionBalance: number;
    moveBalance: number;
    actionSpeeds: number[];
    moveSpeeds: number[];
  }>;
  /** Ordem projetada, maior `key` primeiro. Não identifica ação nenhuma. */
  order: Array<{ actorId: string; bars: Bar[]; key: number }>;
};

export type QueuedAction = { actionId: string; actorId: string; bars: Bar[] };

/** `actionId` liga action_enqueued → action_queued → turn_opened (B1). */
export type TurnOpenedPayload = {
  turnId: string;
  actorId: string;
  actionId: string;
  /** Sempre "" hoje. NÃO ramifique por ele. */
  actionType?: string;
};

export type TurnClosedPayload = { turnId: string };
export type RoundClosedPayload = { roundMode: RoundMode };
export type RoundModeChangedPayload = { mode: RoundMode };
export type ActionEnqueuedPayload = { actionId: string };
export type HpChangedPayload = {
  characterId: string;
  hp: number;
  maxHp: number;
  damage: number;
};

export type PendingReaction = { reactionId: string; actorId: string; kind: string };

/** Só o que a Fase 6 lê. A cadeia de reação inteira é da Fase 7. */
export type ResolutionPayload = {
  turnId: string;
  isSettled: boolean;
  action?: {
    skillName: string;
    skillValue: number;
    diceRolled: number[];
    total: number;
    isCritical: boolean;
    isCriticalFailure: boolean;
    margin?: number;
  };
  targets?: Array<{
    targetId: string;
    avoided: boolean;
    defended: boolean;
    rawDamage: number;
    projectedDamage: number;
  }>;
  pendingReactions?: PendingReaction[];
};

export type CloseTurnRefusedPayload = {
  turnId: string;
  pendingReactions: PendingReaction[];
};

export type MatchFullStatePayload = {
  scene?: ScenePayload;
  /** "" quando não há round ativo. */
  roundMode: RoundMode | "";
  bars?: BarsPayload;
  /** Ausente em "fechado e nada aberto". NÃO carrega actionId — ver o spec §8 e §15. */
  openTurn?: { turnId: string; actorId: string };
  /** Master-only. */
  resolution?: ResolutionPayload;
  /** Master-only; ausente = fila vazia. */
  queue?: QueuedAction[];
};

export type WsErrorPayload = { code: string; message: string };

export type CombatServerMessage =
  | { type: "match_full_state"; payload: MatchFullStatePayload }
  | { type: "bars_updated"; payload: BarsPayload }
  | { type: "action_enqueued"; payload: ActionEnqueuedPayload }
  | { type: "action_queued"; payload: QueuedAction }
  | { type: "turn_opened"; payload: TurnOpenedPayload }
  | { type: "turn_closed"; payload: TurnClosedPayload }
  | { type: "resolution_updated"; payload: ResolutionPayload }
  | { type: "character_hp_changed"; payload: HpChangedPayload }
  | { type: "round_closed"; payload: RoundClosedPayload }
  | { type: "round_mode_changed"; payload: RoundModeChangedPayload }
  | { type: "scene_changed"; payload: ScenePayload }
  | { type: "close_turn_refused"; payload: CloseTurnRefusedPayload };

/** O que o cliente monta para `enqueue_action`. Sem perícia: o hit é derivado pelo servidor. */
export type EnqueueActionPayload = {
  actorId: string;
  targetId?: string[];
  attack?: { weapon?: string };
  move?: {
    category: MoveCategory;
    from: [number, number, number];
    position: [number, number, number];
  };
  interact?: { kind: string };
};
```

- [ ] **Step 2: Compile**

Run: `npm run build`
Expected: PASS (arquivo só de tipos, nada é emitido).

- [ ] **Step 3: Commit**

```bash
git add src/features/match/combat/combatMessages.ts
git commit -m "feat(match): tipos do wire de combate, 1:1 com o contrato

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: O reducer — onde moram todas as regras

**Files:**
- Create: `src/features/match/combat/combatReducer.ts`
- Test: `src/features/match/combat/__tests__/combatReducer.test.ts`

**Interfaces:**
- Consumes: os tipos da Tarefa 3.
- Produces: `initialCombatState`, `combatReducer(state, action): CombatState`,
  `type CombatState`, `type CombatAction`, `type Ghost`, `type TableEvent`.

- [ ] **Step 1: Escreva os testes que falham**

`src/features/match/combat/__tests__/combatReducer.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { combatReducer, initialCombatState } from "../combatReducer";
import type { BarsPayload } from "../combatMessages";

const bars = (seq: number): BarsPayload => ({
  seq,
  prices: { action: 14 },
  characters: [
    { characterId: "c1", actionBalance: -2, moveBalance: 0, actionSpeeds: [], moveSpeeds: [] },
  ],
  order: [],
});

describe("combatReducer — guarda de seq", () => {
  it("aplica um snapshot mais novo", () => {
    let s = combatReducer(initialCombatState, { type: "bars_updated", payload: bars(1) });
    s = combatReducer(s, { type: "bars_updated", payload: bars(3) });
    expect(s.bars?.seq).toBe(3);
  });

  it("descarta um snapshot atrasado", () => {
    let s = combatReducer(initialCombatState, { type: "bars_updated", payload: bars(5) });
    s = combatReducer(s, { type: "bars_updated", payload: bars(2) });
    expect(s.bars?.seq).toBe(5);
  });

  it("não reinicia o contador ao reconectar", () => {
    let s = combatReducer(initialCombatState, { type: "bars_updated", payload: bars(9) });
    s = combatReducer(s, {
      type: "match_full_state",
      payload: { roundMode: "Race", bars: bars(4) },
    });
    expect(s.bars?.seq).toBe(9);
  });
});

describe("combatReducer — fantasma", () => {
  const ghostAction = {
    type: "ACTION_SENT" as const,
    payload: {
      localId: "local-1",
      actorId: "c1",
      from: [1, 1, 0] as [number, number, number],
      to: [3, 1, 0] as [number, number, number],
    },
  };

  it("nasce no envio e ganha o actionId no ack", () => {
    let s = combatReducer(initialCombatState, ghostAction);
    expect(Object.keys(s.ghosts)).toEqual(["local-1"]);
    s = combatReducer(s, { type: "action_enqueued", payload: { actionId: "a1" } });
    expect(Object.keys(s.ghosts)).toEqual(["a1"]);
  });

  it("morre quando o turno daquela ação abre", () => {
    let s = combatReducer(initialCombatState, ghostAction);
    s = combatReducer(s, { type: "action_enqueued", payload: { actionId: "a1" } });
    s = combatReducer(s, {
      type: "turn_opened",
      payload: { turnId: "t1", actorId: "c1", actionId: "a1" },
    });
    expect(s.ghosts).toEqual({});
    expect(s.openTurn).toEqual({ turnId: "t1", actorId: "c1", actionId: "a1" });
  });

  it("some numa reconexão em que o turno do ator já está aberto", () => {
    let s = combatReducer(initialCombatState, ghostAction);
    s = combatReducer(s, { type: "action_enqueued", payload: { actionId: "a1" } });
    s = combatReducer(s, {
      type: "match_full_state",
      payload: { roundMode: "Race", openTurn: { turnId: "t9", actorId: "c1" } },
    });
    expect(s.ghosts).toEqual({});
  });

  it("é varrido no fim do round", () => {
    let s = combatReducer(initialCombatState, ghostAction);
    s = combatReducer(s, { type: "round_closed", payload: { roundMode: "Race" } });
    expect(s.ghosts).toEqual({});
  });
});

describe("combatReducer — histórico", () => {
  it("junta turn_closed e a resolução liquidada na MESMA linha, em qualquer ordem", () => {
    let s = combatReducer(initialCombatState, {
      type: "resolution_updated",
      payload: { turnId: "t1", isSettled: true, targets: [] },
    });
    s = combatReducer(s, { type: "turn_closed", payload: { turnId: "t1" } });
    const closed = s.events.filter((e) => e.kind === "turn_closed");
    expect(closed).toHaveLength(1);
    expect(closed[0].resolution).toBeDefined();
  });

  it("ignora uma resolução de turno aberto no histórico", () => {
    const s = combatReducer(initialCombatState, {
      type: "resolution_updated",
      payload: { turnId: "t1", isSettled: false },
    });
    expect(s.events).toHaveLength(0);
  });
});

describe("combatReducer — HP e fila", () => {
  it("guarda o HP aplicado", () => {
    const s = combatReducer(initialCombatState, {
      type: "character_hp_changed",
      payload: { characterId: "c2", hp: 84, maxHp: 100, damage: 16 },
    });
    expect(s.hp["c2"]).toEqual({ hp: 84, maxHp: 100 });
  });

  it("empilha a fila e a substitui inteira no snapshot", () => {
    let s = combatReducer(initialCombatState, {
      type: "action_queued",
      payload: { actionId: "a1", actorId: "c1", bars: ["action"] },
    });
    expect(s.queue).toHaveLength(1);
    s = combatReducer(s, {
      type: "match_full_state",
      payload: { roundMode: "Race", queue: [] },
    });
    expect(s.queue).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Rode e veja falhar**

Run: `npm run test -- src/features/match/combat/__tests__/combatReducer.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Escreva o reducer**

`src/features/match/combat/combatReducer.ts`:

```ts
import type {
  ActionEnqueuedPayload, BarsPayload, CloseTurnRefusedPayload, HpChangedPayload,
  MatchFullStatePayload, QueuedAction, ResolutionPayload, RoundClosedPayload,
  RoundModeChangedPayload, RoundMode, ScenePayload, TurnClosedPayload, TurnOpenedPayload,
} from "./combatMessages";
import type { WsError } from "./combatErrorMessages";

export type Ghost = {
  actorId: string;
  from: [number, number, number];
  to: [number, number, number];
};

export type TableEvent =
  | { kind: "turn_opened"; at: number; turnId: string; actorId: string }
  | { kind: "turn_closed"; at: number; turnId: string; resolution?: ResolutionPayload }
  | { kind: "round_closed"; at: number; roundMode: RoundMode }
  | { kind: "round_mode_changed"; at: number; mode: RoundMode }
  | { kind: "scene_changed"; at: number; scene: ScenePayload }
  | { kind: "hp_changed"; at: number; characterId: string; hp: number; damage: number };

export type CombatState = {
  scene?: ScenePayload;
  roundMode: RoundMode | "";
  bars: BarsPayload | null;
  openTurn: { turnId: string; actorId: string; actionId?: string } | null;
  queue: QueuedAction[];
  hp: Record<string, { hp: number; maxHp: number }>;
  ghosts: Record<string, Ghost>;
  events: TableEvent[];
  pendingCloseTurn: CloseTurnRefusedPayload | null;
  lastError: WsError | null;
};

export const initialCombatState: CombatState = {
  roundMode: "",
  bars: null,
  openTurn: null,
  queue: [],
  hp: {},
  ghosts: {},
  events: [],
  pendingCloseTurn: null,
  lastError: null,
};

export type CombatAction =
  | { type: "match_full_state"; payload: MatchFullStatePayload }
  | { type: "bars_updated"; payload: BarsPayload }
  | { type: "action_enqueued"; payload: ActionEnqueuedPayload }
  | { type: "action_queued"; payload: QueuedAction }
  | { type: "turn_opened"; payload: TurnOpenedPayload }
  | { type: "turn_closed"; payload: TurnClosedPayload }
  | { type: "resolution_updated"; payload: ResolutionPayload }
  | { type: "character_hp_changed"; payload: HpChangedPayload }
  | { type: "round_closed"; payload: RoundClosedPayload }
  | { type: "round_mode_changed"; payload: RoundModeChangedPayload }
  | { type: "scene_changed"; payload: ScenePayload }
  | { type: "close_turn_refused"; payload: CloseTurnRefusedPayload }
  | { type: "ACTION_SENT"; payload: { localId: string } & Ghost }
  | { type: "WS_ERROR"; payload: WsError }
  | { type: "ERROR_DISMISSED" }
  | { type: "CLOSE_TURN_DIALOG_DISMISSED" };

const MAX_EVENTS = 200;

function push(events: TableEvent[], e: TableEvent): TableEvent[] {
  const next = [...events, e];
  return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
}

/** Só aceita um snapshot de barras mais novo. O contador NUNCA reinicia (contrato). */
function acceptBars(state: CombatState, incoming: BarsPayload | undefined): BarsPayload | null {
  if (!incoming) return state.bars;
  if (state.bars && incoming.seq <= state.bars.seq) return state.bars;
  return incoming;
}

function withoutGhostsOfActor(ghosts: Record<string, Ghost>, actorId: string) {
  return Object.fromEntries(Object.entries(ghosts).filter(([, g]) => g.actorId !== actorId));
}

export function combatReducer(state: CombatState, action: CombatAction): CombatState {
  switch (action.type) {
    case "match_full_state": {
      const p = action.payload;
      const openTurn = p.openTurn ? { ...p.openTurn } : null;
      return {
        ...state,
        scene: p.scene,
        roundMode: p.roundMode,
        bars: acceptBars(state, p.bars),
        openTurn,
        queue: p.queue ?? [],
        // O snapshot não traz actionId (§15 do spec): varre por ator, que é conservador.
        ghosts: openTurn ? withoutGhostsOfActor(state.ghosts, openTurn.actorId) : state.ghosts,
      };
    }

    case "bars_updated":
      return { ...state, bars: acceptBars(state, action.payload) };

    case "ACTION_SENT": {
      const { localId, ...ghost } = action.payload;
      return { ...state, ghosts: { ...state.ghosts, [localId]: ghost } };
    }

    case "action_enqueued": {
      // Reindexa o fantasma provisório mais recente para o actionId do servidor.
      const localKeys = Object.keys(state.ghosts).filter((k) => k.startsWith("local-"));
      const last = localKeys[localKeys.length - 1];
      if (!last) return state;
      const { [last]: ghost, ...rest } = state.ghosts;
      return { ...state, ghosts: { ...rest, [action.payload.actionId]: ghost } };
    }

    case "action_queued":
      return { ...state, queue: [...state.queue, action.payload] };

    case "turn_opened": {
      const { [action.payload.actionId]: _gone, ...ghosts } = state.ghosts;
      return {
        ...state,
        openTurn: action.payload,
        ghosts,
        queue: state.queue.filter((q) => q.actionId !== action.payload.actionId),
        events: push(state.events, {
          kind: "turn_opened",
          at: Date.now(),
          turnId: action.payload.turnId,
          actorId: action.payload.actorId,
        }),
      };
    }

    case "turn_closed": {
      const existing = state.events.find(
        (e) => e.kind === "turn_closed" && e.turnId === action.payload.turnId,
      );
      return {
        ...state,
        openTurn: null,
        pendingCloseTurn: null,
        events: existing
          ? state.events
          : push(state.events, {
              kind: "turn_closed",
              at: Date.now(),
              turnId: action.payload.turnId,
            }),
      };
    }

    case "resolution_updated": {
      // Só a resolução LIQUIDADA vira linha de histórico: a de turno aberto é o cálculo
      // provisório do mestre, e ele já a vê no painel dele.
      if (!action.payload.isSettled) return state;
      const idx = state.events.findIndex(
        (e) => e.kind === "turn_closed" && e.turnId === action.payload.turnId,
      );
      if (idx >= 0) {
        const events = [...state.events];
        events[idx] = { ...(events[idx] as Extract<TableEvent, { kind: "turn_closed" }>), resolution: action.payload };
        return { ...state, events };
      }
      // Chegou antes do turn_closed — a ordem entre os dois não é promessa (contrato).
      return {
        ...state,
        events: push(state.events, {
          kind: "turn_closed",
          at: Date.now(),
          turnId: action.payload.turnId,
          resolution: action.payload,
        }),
      };
    }

    case "character_hp_changed": {
      const p = action.payload;
      return {
        ...state,
        hp: { ...state.hp, [p.characterId]: { hp: p.hp, maxHp: p.maxHp } },
        events: push(state.events, {
          kind: "hp_changed",
          at: Date.now(),
          characterId: p.characterId,
          hp: p.hp,
          damage: p.damage,
        }),
      };
    }

    case "round_closed":
      return {
        ...state,
        openTurn: null,
        ghosts: {},
        events: push(state.events, {
          kind: "round_closed",
          at: Date.now(),
          roundMode: action.payload.roundMode,
        }),
      };

    case "round_mode_changed":
      return {
        ...state,
        roundMode: action.payload.mode,
        events: push(state.events, {
          kind: "round_mode_changed",
          at: Date.now(),
          mode: action.payload.mode,
        }),
      };

    case "scene_changed":
      return {
        ...state,
        scene: action.payload,
        ghosts: {},
        queue: [],
        openTurn: null,
        events: push(state.events, {
          kind: "scene_changed",
          at: Date.now(),
          scene: action.payload,
        }),
      };

    case "close_turn_refused":
      return { ...state, pendingCloseTurn: action.payload };

    case "CLOSE_TURN_DIALOG_DISMISSED":
      return { ...state, pendingCloseTurn: null };

    case "WS_ERROR":
      return { ...state, lastError: action.payload };

    case "ERROR_DISMISSED":
      return { ...state, lastError: null };

    default:
      return state;
  }
}
```

- [ ] **Step 4: Rode e veja passar**

Run: `npm run test -- src/features/match/combat/__tests__/combatReducer.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/features/match/combat
git commit -m "feat(match): reducer de combate com guarda de seq e vida do fantasma

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: `useMatchWs` despacha combate e ganha os verbos

**Files:**
- Modify: `src/hooks/useMatchWs.ts`
- Test: `src/hooks/__tests__/useMatchWs.test.ts`

**Interfaces:**
- Consumes: `CombatServerMessage`, `EnqueueActionPayload` (Tarefa 3).
- Produces, no retorno do hook:
  `sendEnqueueAction(p: EnqueueActionPayload): void`, `sendOpenNextAction(): void`,
  `sendPullAction(actionId: string): void`, `sendCloseTurn(confirm?: boolean): void`,
  `sendChangeRoundMode(mode: RoundMode): void`; e a opção
  `onCombatMessage?: (msg: CombatServerMessage) => void`.

- [ ] **Step 1: Escreva os testes que falham**

Acrescente em `src/hooks/__tests__/useMatchWs.test.ts`:

```ts
describe("useMatchWs combat", () => {
  it("forwards every combat message it knows", () => {
    const onCombatMessage = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", isMaster: true, onCombatMessage }),
    );
    const ws = FakeWS.instances[0];
    ws.onopen?.();
    ws.emit("bars_updated", { seq: 2, prices: {}, characters: [], order: [] });
    ws.emit("turn_opened", { turnId: "t1", actorId: "c1", actionId: "a1" });
    expect(onCombatMessage).toHaveBeenCalledTimes(2);
    expect(onCombatMessage.mock.calls[1][0]).toEqual({
      type: "turn_opened",
      payload: { turnId: "t1", actorId: "c1", actionId: "a1" },
    });
  });

  it("sends the master verbs with the payloads the contract names", () => {
    const { result } = renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", isMaster: true }),
    );
    const ws = FakeWS.instances[0];
    ws.onopen?.();
    act(() => {
      result.current.sendOpenNextAction();
      result.current.sendPullAction("a1");
      result.current.sendCloseTurn(true);
      result.current.sendChangeRoundMode("Race");
    });
    const sent = ws.send.mock.calls.map((c) => JSON.parse(c[0] as string));
    expect(sent.map((m) => m.type)).toEqual([
      "open_next_action", "pull_action", "close_turn", "change_round_mode",
    ]);
    expect(sent[1].payload).toEqual({ actionId: "a1" });
    expect(sent[2].payload).toEqual({ confirm: true });
    expect(sent[3].payload).toEqual({ mode: "Race" });
  });
});
```

- [ ] **Step 2: Rode e veja falhar**

Run: `npm run test -- src/hooks/__tests__/useMatchWs.test.ts`
Expected: FAIL — `sendOpenNextAction is not a function`.

- [ ] **Step 3: Implemente**

No topo de `useMatchWs.ts`:

```ts
import type { CombatServerMessage, EnqueueActionPayload, RoundMode } from "../features/match/combat/combatMessages";

const COMBAT_TYPES = new Set([
  "match_full_state", "bars_updated", "action_enqueued", "action_queued",
  "turn_opened", "turn_closed", "resolution_updated", "character_hp_changed",
  "round_closed", "round_mode_changed", "scene_changed", "close_turn_refused",
]);
```

Na options: `onCombatMessage?: (msg: CombatServerMessage) => void;` e o ref correspondente.

No `ws.onmessage`, **antes** do ramo `else if (import.meta.env.DEV)` do passo anterior:

```ts
          } else if (COMBAT_TYPES.has(msg.type)) {
            onCombatMessageRef.current?.(msg as CombatServerMessage);
```

E os verbos, junto de `sendAction`:

```ts
  const sendEnqueueAction = useCallback(
    (payload: EnqueueActionPayload) => sendRaw("enqueue_action", payload),
    [sendRaw],
  );
  const sendOpenNextAction = useCallback(() => sendRaw("open_next_action", {}), [sendRaw]);
  const sendPullAction = useCallback(
    (actionId: string) => sendRaw("pull_action", { actionId }),
    [sendRaw],
  );
  const sendCloseTurn = useCallback(
    (confirm?: boolean) => sendRaw("close_turn", confirm ? { confirm: true } : {}),
    [sendRaw],
  );
  const sendChangeRoundMode = useCallback(
    (mode: RoundMode) => sendRaw("change_round_mode", { mode }),
    [sendRaw],
  );
```

e acrescente os cinco ao objeto retornado.

- [ ] **Step 4: Rode e veja passar**

Run: `npm run test -- src/hooks/__tests__/useMatchWs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMatchWs.ts src/hooks/__tests__/useMatchWs.test.ts
git commit -m "feat(match): despacho das mensagens de combate e os verbos do mestre

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: `useMatchCombat` e o rascunho persistente

**Files:**
- Create: `src/features/match/combat/actionDraft.ts`
- Create: `src/features/match/combat/useMatchCombat.ts`
- Test: `src/features/match/combat/__tests__/actionDraft.test.ts`

**Interfaces:**
- Consumes: `combatReducer` (T4), `useMatchWs` (T5).
- Produces:
  - `type ActionDraft = { targets: string[]; weapon?: string; move?: { category: MoveCategory; to: [number, number, number] } }`
  - `loadDraft(matchUuid, actorId): ActionDraft`, `saveDraft(matchUuid, actorId, d): void`,
    `clearDraft(matchUuid, actorId): void`, `migrateTargets(d, targets): ActionDraft`
  - `useMatchCombat({ matchUuid, token, isMaster, … })` → `{ state, dispatch, status, send: { … }, mapHandlers }`

- [ ] **Step 1: Escreva o teste do rascunho**

`src/features/match/combat/__tests__/actionDraft.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadDraft, saveDraft, clearDraft, migrateTargets, emptyDraft } from "../actionDraft";

beforeEach(() => localStorage.clear());

describe("actionDraft", () => {
  it("guarda e recupera por partida + personagem", () => {
    saveDraft("m1", "c1", { targets: ["t1"], weapon: "Sword" });
    expect(loadDraft("m1", "c1")).toEqual({ targets: ["t1"], weapon: "Sword" });
    expect(loadDraft("m1", "c2")).toEqual(emptyDraft());
  });

  it("trocar de alvo MIGRA o resto em vez de resetar", () => {
    const d = { targets: ["t1"], weapon: "Sword", move: { category: "Dash" as const, to: [2, 2, 0] as [number, number, number] } };
    expect(migrateTargets(d, ["t2", "t3"])).toEqual({ ...d, targets: ["t2", "t3"] });
  });

  it("limpa", () => {
    saveDraft("m1", "c1", { targets: ["t1"] });
    clearDraft("m1", "c1");
    expect(loadDraft("m1", "c1")).toEqual(emptyDraft());
  });

  it("sobrevive a um localStorage que lança", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadDraft("m1", "c1")).toEqual(emptyDraft());
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Rode e veja falhar**

Run: `npm run test -- src/features/match/combat/__tests__/actionDraft.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Escreva `actionDraft.ts`**

```ts
import type { MoveCategory } from "./combatMessages";

export type ActionDraft = {
  targets: string[];
  weapon?: string;
  move?: { category: MoveCategory; to: [number, number, number] };
};

export const emptyDraft = (): ActionDraft => ({ targets: [] });

const key = (matchUuid: string, actorId: string) => `match-draft:${matchUuid}:${actorId}`;

// localStorage lança em aba privada e pode vir vazio: toda leitura/escrita é best-effort, e
// o estado inicial precisa ser válido sem ele.
export function loadDraft(matchUuid: string, actorId: string): ActionDraft {
  try {
    const raw = localStorage.getItem(key(matchUuid, actorId));
    if (!raw) return emptyDraft();
    const parsed = JSON.parse(raw) as ActionDraft;
    return { ...emptyDraft(), ...parsed, targets: parsed.targets ?? [] };
  } catch {
    return emptyDraft();
  }
}

export function saveDraft(matchUuid: string, actorId: string, draft: ActionDraft): void {
  try {
    localStorage.setItem(key(matchUuid, actorId), JSON.stringify(draft));
  } catch {
    /* sem persistência; o rascunho ainda vive em memória */
  }
}

export function clearDraft(matchUuid: string, actorId: string): void {
  try {
    localStorage.removeItem(key(matchUuid, actorId));
  } catch {
    /* idem */
  }
}

/** Trocar de alvo MIGRA o rascunho: arma e movimento ficam, só a lista de alvos muda. */
export function migrateTargets(draft: ActionDraft, targets: string[]): ActionDraft {
  return { ...draft, targets };
}
```

- [ ] **Step 4: Rode e veja passar**

Run: `npm run test -- src/features/match/combat/__tests__/actionDraft.test.ts`
Expected: PASS.

- [ ] **Step 5: Escreva `useMatchCombat.ts`**

```tsx
import { useCallback, useReducer } from "react";
import { useMatchWs } from "../../../hooks/useMatchWs";
import type { MatchBoardSync } from "../../../hooks/useMatchWs";
import { combatReducer, initialCombatState } from "./combatReducer";
import type { EnqueueActionPayload, RoundMode } from "./combatMessages";

type Options = {
  matchUuid: string | undefined;
  token: string;
  isMaster: boolean;
  board?: MatchBoardSync | null;
} & Pick<
  Parameters<typeof useMatchWs>[0],
  "onWallStateChanged" | "onWallHpChanged" | "onMapFullState" | "onVisibilityUpdated" | "onWallRevealed"
>;

let localGhostSeq = 0;

/**
 * Liga o socket ao reducer. Todo o estado de combate sai daqui; nenhuma página guarda
 * pedaço dele em useState.
 */
export function useMatchCombat({ matchUuid, token, isMaster, board, ...mapHandlers }: Options) {
  const [state, dispatch] = useReducer(combatReducer, initialCombatState);

  const ws = useMatchWs({
    matchUuid,
    token,
    isMaster,
    board,
    ...mapHandlers,
    onCombatMessage: (msg) => dispatch(msg),
    onWsError: (e) => dispatch({ type: "WS_ERROR", payload: { ...e, at: Date.now() } }),
  });

  const enqueueAction = useCallback(
    (payload: EnqueueActionPayload) => {
      if (payload.move) {
        localGhostSeq += 1;
        dispatch({
          type: "ACTION_SENT",
          payload: {
            localId: `local-${localGhostSeq}`,
            actorId: payload.actorId,
            from: payload.move.from,
            to: payload.move.position,
          },
        });
      }
      ws.sendEnqueueAction(payload);
    },
    [ws],
  );

  return {
    state,
    status: ws.status,
    send: {
      enqueueAction,
      openNextAction: ws.sendOpenNextAction,
      pullAction: ws.sendPullAction,
      closeTurn: ws.sendCloseTurn,
      changeRoundMode: ws.sendChangeRoundMode,
      masterAction: ws.sendMasterAction,
      wallAction: ws.sendAction,
    },
    dismissError: useCallback(() => dispatch({ type: "ERROR_DISMISSED" }), []),
    dismissCloseTurnDialog: useCallback(
      () => dispatch({ type: "CLOSE_TURN_DIALOG_DISMISSED" }),
      [],
    ),
  };
}
```

- [ ] **Step 6: Verificação e commit**

Run: `npm run test && npm run build`
Expected: PASS.

```bash
git add src/features/match/combat
git commit -m "feat(match): useMatchCombat e o rascunho persistente de ação

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Catálogo de combate da ficha

O endpoint existe: `GET /charactersheets/{uuid}/combat-catalogue`, documentado em
`../System_X_System/docs/dev/api/character-sheet.md`. É ele que existe para o front **nunca
mais inventar nome de arma ou de perícia**.

**Files:**
- Modify: `src/services/characterSheetsService.ts`
- Create: `src/hooks/useCombatCatalogue.ts`
- Test: `src/services/__tests__/characterSheetsService.test.ts` (acrescentar)

**Interfaces:**
- Produces: `type CombatCatalogue = { weapons: CatalogueWeapon[]; skills: string[] }`,
  `type CatalogueWeapon = { name: string; dice: number[]; flatDamage: number; defenseBonus: number; proficiencyLevel: number }`,
  `getCombatCatalogue(uuid: string): Promise<CombatCatalogue>`,
  `useCombatCatalogue(token: string, sheetUuid?: string)`.

- [ ] **Step 1: Escreva o teste**

Siga o padrão já usado no arquivo de teste do service (mock do `httpClient`):

```ts
it("busca o catálogo de combate da ficha", async () => {
  const data = {
    weapons: [{ name: "Fist", dice: [6, 6, 4], flatDamage: 0, defenseBonus: 0, proficiencyLevel: 0 }],
    skills: ["Push"],
  };
  vi.mocked(httpClient.get).mockResolvedValueOnce({ data });
  await expect(getCombatCatalogue("s1")).resolves.toEqual(data);
  expect(httpClient.get).toHaveBeenCalledWith("/charactersheets/s1/combat-catalogue");
});
```

- [ ] **Step 2: Rode e veja falhar**

Run: `npm run test -- src/services/__tests__/characterSheetsService.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implemente o service**

Em `src/services/characterSheetsService.ts` (passe o corpo direto, sem conversor — camelCase
dos dois lados; e **sem `lowercaseFirstKeys`**: `weapons[].name` é valor, não chave de mapa):

```ts
export type CatalogueWeapon = {
  name: string;
  dice: number[];
  flatDamage: number;
  defenseBonus: number;
  proficiencyLevel: number;
};
export type CombatCatalogue = { weapons: CatalogueWeapon[]; skills: string[] };

export async function getCombatCatalogue(uuid: string): Promise<CombatCatalogue> {
  const { data } = await httpClient.get(`/charactersheets/${uuid}/combat-catalogue`);
  return data as CombatCatalogue;
}
```

- [ ] **Step 4: Escreva o hook**

`src/hooks/useCombatCatalogue.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { getCombatCatalogue } from "../services/characterSheetsService";

export function useCombatCatalogue(token: string, sheetUuid?: string) {
  return useQuery({
    queryKey: ["combat-catalogue", token, sheetUuid],
    queryFn: () => getCombatCatalogue(sheetUuid as string),
    enabled: !!token && !!sheetUuid,
    retry: 1,
  });
}
```

- [ ] **Step 5: Rode, verifique e commite**

Run: `npm run test -- src/services/__tests__/characterSheetsService.test.ts && npm run build`

```bash
git add src/services src/hooks/useCombatCatalogue.ts
git commit -m "feat(match): catálogo de combate da ficha via REST

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: O gesto de segurar, e a peça clicável no jogo

Decisão registrada no spec §7.1: **long-press de 450 ms sobre Pointer Events**, igual no mouse
e no toque, com **botão direito como atalho no desktop**. Hover está fora (não existe no
toque) e a Fase 7 reusa este mesmo mecanismo nos botões de reação.

**Files:**
- Create: `src/features/tactical-map/hooks/useHoldGesture.ts`
- Create: `src/features/tactical-map/hooks/__tests__/useHoldGesture.test.ts`
- Modify: `src/features/tactical-map/stage/PiecesLayer.tsx`
- Modify: `src/features/tactical-map/stage/stageProps.ts`
- Modify: `src/features/tactical-map/TacticalMapStage.tsx` (repassar as props novas)
- Modify: `src/features/tactical-map/TacticalMapViewer.tsx` (repassar as props novas)

**Interfaces:**
- Produces:
  - `createHoldTracker({ holdMs?, moveTolerance?, onHold })` → `{ start(id, x, y), move(x, y), end(): "hold" | "click" | "none", cancel() }`
  - Props novas de stage: `onPieceLongPress?: (pieceId: string) => void`,
    `selectedPieceId?: string | null`, `targetPieceIds?: Set<string>`.
- Consumes: nada das tarefas anteriores.

- [ ] **Step 1: Escreva o teste que falha**

`src/features/tactical-map/hooks/__tests__/useHoldGesture.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHoldTracker } from "../useHoldGesture";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createHoldTracker", () => {
  it("dispara o hold depois do prazo e marca o clique seguinte como consumido", () => {
    const onHold = vi.fn();
    const t = createHoldTracker({ onHold });
    t.start("p1", 10, 10);
    vi.advanceTimersByTime(450);
    expect(onHold).toHaveBeenCalledWith("p1");
    expect(t.end()).toBe("hold");
  });

  it("cancela quando o ponteiro anda mais que a tolerância", () => {
    const onHold = vi.fn();
    const t = createHoldTracker({ onHold });
    t.start("p1", 10, 10);
    t.move(30, 10);
    vi.advanceTimersByTime(450);
    expect(onHold).not.toHaveBeenCalled();
    expect(t.end()).toBe("none");
  });

  it("soltar antes do prazo é clique", () => {
    const onHold = vi.fn();
    const t = createHoldTracker({ onHold });
    t.start("p1", 10, 10);
    vi.advanceTimersByTime(200);
    expect(t.end()).toBe("click");
    expect(onHold).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rode e veja falhar**

Run: `npm run test -- src/features/tactical-map/hooks/__tests__/useHoldGesture.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implemente o tracker**

`src/features/tactical-map/hooks/useHoldGesture.ts`:

```ts
/**
 * O gesto de segurar da partida — um só, para mouse, toque e caneta (Pointer Events).
 * Segurar sobre a peça marca alvos (Fase 6); segurar sobre o botão de reação abre a
 * configuração (Fase 7). NÃO invente um segundo mecanismo lá.
 *
 * Fica fora do React de propósito: o PiecesLayer o dirige imperativamente dentro do mesmo
 * par pointerdown/pointerup que já discrimina clique de arraste.
 */
export const HOLD_MS = 450;
const MOVE_TOLERANCE_PX = 6;

export type HoldOutcome = "hold" | "click" | "none";

export function createHoldTracker({
  onHold,
  holdMs = HOLD_MS,
  moveTolerance = MOVE_TOLERANCE_PX,
}: {
  onHold: (id: string) => void;
  holdMs?: number;
  moveTolerance?: number;
}) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let origin: { id: string; x: number; y: number } | null = null;
  let fired = false;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return {
    start(id: string, x: number, y: number) {
      clear();
      origin = { id, x, y };
      fired = false;
      timer = setTimeout(() => {
        fired = true;
        timer = null;
        onHold(id);
      }, holdMs);
    },
    move(x: number, y: number) {
      if (!origin || fired) return;
      if (Math.hypot(x - origin.x, y - origin.y) > moveTolerance) {
        clear();
        origin = null;
      }
    },
    /** "hold" = já disparou (o clique seguinte deve ser suprimido). */
    end(): HoldOutcome {
      const had = !!origin;
      clear();
      origin = null;
      if (fired) { fired = false; return "hold"; }
      return had ? "click" : "none";
    },
    cancel() {
      clear();
      origin = null;
      fired = false;
    },
  };
}
```

- [ ] **Step 4: Rode e veja passar**

Run: `npm run test -- src/features/tactical-map/hooks/__tests__/useHoldGesture.test.ts`
Expected: PASS.

- [ ] **Step 5: Ligue no `PiecesLayer`**

Em `stageProps.ts`, acrescente ao tipo:

```ts
  onPieceLongPress?: (pieceId: string) => void;
  selectedPieceId?: string | null;
  targetPieceIds?: Set<string>;
```

Em `PiecesLayer.tsx`:

1. aceite as três props novas na assinatura (o `TacticalMapStage` repassa);
2. crie o tracker uma vez: `const holdRef = useRef(createHoldTracker({ onHold: (id) => onPieceLongPress?.(id) }));`
   — e mantenha `onPieceLongPress` num ref, como o resto do arquivo faz com callbacks;
3. no `onPointerDown` de `PieceSprite`, **antes** do `return` de `draggablePieceIds`, chame
   `holdRef.current.start(p.id, e.global.x, e.global.y)`;
4. em `handleMoveDOM`, chame `holdRef.current.move(stageX, stageY)`;
5. em `handleUp`/`handleWindowUp`, antes de `onPieceSelect`, faça:

```ts
      const outcome = holdRef.current.end();
      if (outcome === "hold") return;   // segurar já marcou; não alveje duas vezes
```

6. **a peça precisa ser clicável sem ser arrastável no jogo.** Hoje, quando
   `draggablePieceIds` não contém a peça, o `pointerdown` retorna antes de criar o
   `localDrag`, e sem ele o `pointerup` não chama `onPieceSelect`. Troque o early return por
   um registro de clique:

```ts
            const draggable = draggablePieceIds === undefined || draggablePieceIds.has(p.id);
            pieceDragActiveRef.current = draggable;
            localDrag.current = {
              pieceId: p.id,
              startScreen: { x: e.global.x, y: e.global.y },
              isDragging: false,
              currentSlot: null,
              draggable,
            };
```

   e, em `handleMoveDOM`, só entre no ramo de arraste se `drag.draggable` — acrescente o campo
   ao tipo `PieceLocalDragState`. Assim clique e long-press funcionam com a peça imóvel, que é
   o que o jogo exige: **quem move a peça é o servidor**.

7. suprima o menu nativo e ofereça o atalho de botão direito: no `useEffect` que registra os
   listeners de janela, acrescente

```ts
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const drag = localDrag.current;
      if (drag) { holdRef.current.cancel(); onPieceLongPressRef.current?.(drag.pieceId); }
    };
    const canvas = app?.renderer ? app.canvas : null;
    canvas?.addEventListener("contextmenu", handleContextMenu);
```
   com o `removeEventListener` correspondente no cleanup.

8. desenhe o anel de progresso: um `pixiGraphics` que, entre 120 ms e `HOLD_MS`, fecha um arco
   em volta da peça em `localDrag.current`. Sem feedback o gesto parece travamento. Use
   `requestAnimationFrame` guardando o `startedAt` do `pointerdown`, e limpe no `end`/`cancel`.

E finalmente, selecionado e alvo precisam aparecer: passe `selectedPieceId`/`targetPieceIds`
ao `PieceSprite` como duas props booleanas (`isSelected` já existe — acrescente `isTarget`) e
desenhe a moldura de alvo com uma cor de token distinta da de seleção.

- [ ] **Step 6: Repasse as props**

`TacticalMapStage.tsx` e `TacticalMapViewer.tsx` só repassam: acrescente
`piecesInteractive`, `draggablePieceIds`, `onPieceSelect`, `onPieceLongPress`,
`selectedPieceId`, `targetPieceIds` e `onEmptySlotClick` às props do viewer e encaminhe. Hoje
o viewer **não passa nada disso** — é por isso que a peça não é clicável no jogo.

- [ ] **Step 7: Verificação e commit**

Run: `npm run test && npm run lint && npm run build`
Expected: PASS. (A camada Pixi não tem teste — a verificação de verdade é a Tarefa 14.)

```bash
git add src/features/tactical-map
git commit -m "feat(map): peça clicável no jogo e gesto de segurar para múltiplos alvos

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Fantasma e empilhamento

Spec §8 (fantasma da intenção declarada) e §7.2 (cascata com contador).

**Files:**
- Create: `src/features/tactical-map/GhostLayer.tsx`
- Modify: `src/features/tactical-map/TacticalMapStage.tsx` (montar a camada acima de `PiecesLayer`)
- Modify: `src/features/tactical-map/stage/PiecesLayer.tsx` (cascata)
- Modify: `src/features/tactical-map/utils/coords.ts` (só se faltar um helper; veja o passo 2)
- Test: `src/features/tactical-map/utils/__tests__/stacking.test.ts`

**Interfaces:**
- Consumes: `Ghost` (T4), `slotToWorld`/`slotInradius`/`isSameSlot` (já existem em `utils/coords.ts`).
- Produces:
  - `stackOffsets(pieces: Piece[], topPieceId?: string): Map<string, { dx: number; dy: number; count: number; index: number }>`
  - `<GhostLayer ghosts={Ghost[]} grid={GridShape} />`
  - prop de stage `ghosts?: Array<{ from: [number,number,number]; to: [number,number,number] }>`

- [ ] **Step 1: Escreva o teste da cascata (é a única parte testável)**

`src/features/tactical-map/utils/__tests__/stacking.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { stackOffsets } from "../stacking";
import type { Piece } from "../../../../types/tacticalMap";

const piece = (id: string, col: number, row: number): Piece => ({
  id,
  characterId: `c-${id}`,
  coord: { slot: { kind: "square", col, row }, z: 0 },
  visible: true,
});

describe("stackOffsets", () => {
  it("não desloca peça sozinha no slot", () => {
    const out = stackOffsets([piece("a", 1, 1), piece("b", 2, 2)]);
    expect(out.get("a")).toEqual({ dx: 0, dy: 0, count: 1, index: 0 });
  });

  it("empilha em cascata e conta os ocupantes", () => {
    const out = stackOffsets([piece("a", 1, 1), piece("b", 1, 1), piece("c", 1, 1)]);
    expect(out.get("a")?.count).toBe(3);
    expect(out.get("b")?.index).toBe(1);
    expect(out.get("c")?.dx).toBeGreaterThan(out.get("b")!.dx);
  });

  it("põe a peça em foco por último, no topo", () => {
    const out = stackOffsets([piece("a", 1, 1), piece("b", 1, 1)], "a");
    expect(out.get("a")?.index).toBe(1);
    expect(out.get("b")?.index).toBe(0);
  });
});
```

- [ ] **Step 2: Rode e veja falhar**

Run: `npm run test -- src/features/tactical-map/utils/__tests__/stacking.test.ts`
Expected: FAIL.

- [ ] **Step 3: Escreva `src/features/tactical-map/utils/stacking.ts`**

```ts
import type { Piece } from "../../../types/tacticalMap";
import { isSameSlot } from "./coords";

/** Fração do inradius por ocupante extra. Desenho de protótipo — ver o spec §7.2. */
export const STACK_STEP = 0.18;
const MAX_VISIBLE = 3;

export type StackInfo = { dx: number; dy: number; count: number; index: number };

/**
 * Quando N peças dividem um slot, elas são desenhadas em cascata: cada ocupante extra sai
 * STACK_STEP do inradius para a direita e para baixo, no máximo MAX_VISIBLE visíveis, e a de
 * cima leva o selo ×N. A ordem é estável (por id), e `topPieceId` (a selecionada, ou a do
 * próprio jogador) vai por último — quem precisa mirar precisa ver.
 *
 * Os valores saem em FRAÇÃO do inradius; quem desenha multiplica pelo tamanho real do slot.
 */
export function stackOffsets(pieces: Piece[], topPieceId?: string): Map<string, StackInfo> {
  const out = new Map<string, StackInfo>();
  const seen = new Set<string>();

  for (const p of pieces) {
    if (seen.has(p.id)) continue;
    const group = pieces
      .filter((q) => isSameSlot(q.coord.slot, p.coord.slot))
      .sort((a, b) => {
        if (a.id === topPieceId) return 1;
        if (b.id === topPieceId) return -1;
        return a.id.localeCompare(b.id);
      });
    group.forEach((q, index) => {
      seen.add(q.id);
      const step = Math.min(index, MAX_VISIBLE - 1) * STACK_STEP;
      out.set(q.id, { dx: step, dy: step, count: group.length, index });
    });
  }
  return out;
}
```

- [ ] **Step 4: Rode e veja passar**

Run: `npm run test -- src/features/tactical-map/utils/__tests__/stacking.test.ts`
Expected: PASS.

- [ ] **Step 5: Use a cascata no `PiecesLayer`**

Calcule `const stacks = useMemo(() => stackOffsets(visiblePieces, selectedPieceId ?? undefined), [visiblePieces, selectedPieceId])`,
renderize as peças **na ordem de `index`**, e passe ao `PieceSprite` duas props novas:
`offset={{ dx: stacks.get(p.id)!.dx, dy: stacks.get(p.id)!.dy }}` e
`stackCount={stacks.get(p.id)!.count}`. No `PieceSprite`, some o offset (multiplicado por
`slotInradius(grid)`) à posição do container — ele já faz isso com `zOffsetPx`, é o mesmo
mecanismo — e desenhe o selo `×N` no canto inferior direito quando `stackCount > 1` e o
`index` for o maior do grupo.

- [ ] **Step 6: Escreva o `GhostLayer`**

`src/features/tactical-map/GhostLayer.tsx` — um `pixiContainer` com `eventMode="none"` (o
fantasma nunca intercepta ponteiro) que, para cada fantasma, desenha:

- um círculo translúcido (alpha ~0.35) do tamanho do token no slot de destino, usando
  `slotToWorld({kind:"square", col: to[0], row: to[1]}, grid)` — para grade hex, monte
  `{kind:"hex", q: to[0], r: to[1]}`, seguindo `grid.kind`;
- uma seta ligando origem e destino (linha + duas hastes na ponta).

Monte-o em `TacticalMapStage` **depois** de `PiecesLayer`, para desenhar por cima, e aceite a
prop `ghosts` em `stageProps.ts` e no viewer.

⚠️ **Nada aqui calcula posição** (invariante I1): o fantasma desenha `from`/`to` do pedido, e
a peça real só se move quando o `piece_moved` do servidor chegar.

- [ ] **Step 7: Verificação e commit**

Run: `npm run test && npm run lint && npm run build`

```bash
git add src/features/tactical-map
git commit -m "feat(map): fantasma da intenção declarada e empilhamento em cascata

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Os organismos burros da partida

Todos recebem dados prontos e não sabem quem está olhando (invariante I2).

**Files:**
- Create: `src/features/match/combat/GeneralBar.tsx`
- Create: `src/features/match/combat/OwnBars.tsx`
- Create: `src/features/match/combat/EventStream.tsx`
- Create: `src/features/match/combat/QueuePanel.tsx`
- Create: `src/features/match/combat/CloseTurnRefusedDialog.tsx`
- Test: `src/features/match/combat/__tests__/combatOrganisms.test.tsx`

**Interfaces:**
- Consumes: `BarsPayload`, `QueuedAction`, `CloseTurnRefusedPayload` (T3); `TableEvent` (T4).
- Produces:
  - `<GeneralBar bars={BarsPayload | null} nameOf={(characterId: string) => string} highlightActorId?: string />`
  - `<OwnBars bars={BarsPayload | null} characterId={string} hp?: { hp: number; maxHp: number } />`
  - `<EventStream events={TableEvent[]} nameOf={(characterId: string) => string} />`
  - `<QueuePanel queue={QueuedAction[]} nameOf onPull={(actionId: string) => void} onOpenNext={() => void} onCloseTurn={() => void} canCloseTurn={boolean} />`
  - `<CloseTurnRefusedDialog payload={CloseTurnRefusedPayload | null} nameOf onConfirm={() => void} onCancel={() => void} />`

- [ ] **Step 1: Escreva os testes que falham**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GeneralBar from "../GeneralBar";
import QueuePanel from "../QueuePanel";
import CloseTurnRefusedDialog from "../CloseTurnRefusedDialog";
import EventStream from "../EventStream";

const nameOf = (id: string) => ({ c1: "Gon", c2: "Killua" }[id] ?? id);

describe("organismos da partida", () => {
  it("GeneralBar mostra a ordem projetada, maior key primeiro", () => {
    render(
      <GeneralBar
        nameOf={nameOf}
        bars={{
          seq: 1,
          prices: { action: 14 },
          characters: [],
          order: [
            { actorId: "c2", bars: ["action"], key: 12 },
            { actorId: "c1", bars: ["action"], key: 18 },
          ],
        }}
      />,
    );
    const rows = screen.getAllByTestId("order-row");
    expect(rows[0]).toHaveTextContent("Gon");
    expect(rows[1]).toHaveTextContent("Killua");
  });

  it("QueuePanel antecipa uma ação pelo actionId", () => {
    const onPull = vi.fn();
    render(
      <QueuePanel
        nameOf={nameOf}
        queue={[{ actionId: "a1", actorId: "c1", bars: ["action"] }]}
        onPull={onPull}
        onOpenNext={vi.fn()}
        onCloseTurn={vi.fn()}
        canCloseTurn={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /antecipar/i }));
    expect(onPull).toHaveBeenCalledWith("a1");
  });

  it("CloseTurnRefusedDialog lista quem ficaria sem narrar e confirma", () => {
    const onConfirm = vi.fn();
    render(
      <CloseTurnRefusedDialog
        nameOf={nameOf}
        payload={{ turnId: "t1", pendingReactions: [{ reactionId: "r1", actorId: "c2", kind: "repel" }] }}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(/Killua/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /fechar mesmo assim/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("EventStream mostra o mais recente por último", () => {
    render(
      <EventStream
        nameOf={nameOf}
        events={[
          { kind: "turn_opened", at: 1, turnId: "t1", actorId: "c1" },
          { kind: "round_mode_changed", at: 2, mode: "Race" },
        ]}
      />,
    );
    const rows = screen.getAllByTestId("event-row");
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent(/Race/);
  });
});
```

- [ ] **Step 2: Rode e veja falhar**

Run: `npm run test -- src/features/match/combat/__tests__/combatOrganisms.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implemente os cinco**

Regras de conteúdo, para não inventar UI:

- **`GeneralBar`**: uma linha por entrada de `bars.order`, ordenada por `key` decrescente, com
  `data-testid="order-row"`, o nome do ator e as barras que ele paga. Mostra também
  `bars.prices` (preço da rodada) — **uma barra ausente do mapa é "ainda não precificou"**, não
  zero. Flutua sobre o mapa: `position: absolute` no topo do `stage`.
- **`OwnBars`**: os dois saldos do personagem (`actionBalance`, `moveBalance`, **fracionários**
  — mostre uma casa decimal, não arredonde para inteiro) e, quando `hp` existir, a barra de
  vida `hp/maxHp`.
- **`EventStream`**: uma linha por evento, `data-testid="event-row"`, mais recente por último,
  com rolagem presa ao fim. Textos: turno aberto → "Turno de {nome}"; turno fechado →
  "Turno encerrado" + (se houver resolução) o dano projetado por alvo; round fechado →
  "Round encerrado ({mode})"; regime → "Regime: {mode}"; cena → "Cena: {descrição}"; HP →
  "{nome} −{damage}".
- **`QueuePanel`**: uma linha por ação pendente com o nome do ator e as barras; botão
  **Antecipar** por linha (`onPull(actionId)`); botões **Abrir próxima** (`onOpenNext`) e
  **Fechar turno** (`onCloseTurn`, desabilitado quando `!canCloseTurn`). Lembre: a fila é
  secreta e só o mestre tem este painel — ele vive na zona `panel`.
- **`CloseTurnRefusedDialog`**: renderiza `null` quando `payload` é `null`; senão lista os
  `pendingReactions` pelo nome do ator e o `kind`, com **Fechar mesmo assim** (`onConfirm`, que
  reenvia `close_turn` com `confirm: true`) e **Cancelar**. O texto explica o que se perde: a
  reação entra no cálculo de qualquer jeito; o que ela perde é o momento de narrar.

- [ ] **Step 4: Rode e veja passar**

Run: `npm run test -- src/features/match/combat/__tests__/combatOrganisms.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/match/combat
git commit -m "feat(match): barras, histórico, fila e diálogo de fechamento

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: A bottom sheet de compor ação

**Files:**
- Create: `src/features/match/combat/ActionComposer.tsx`
- Create: `src/features/match/combat/defaultMoveCategory.ts`
- Test: `src/features/match/combat/__tests__/ActionComposer.test.tsx`

**Interfaces:**
- Consumes: `ActionDraft` (T6), `CombatCatalogue` (T7), `EnqueueActionPayload` (T3).
- Produces:
  `<ActionComposer actorId actorName draft catalogue onDraftChange onSubmit onClearActor? />`,
  onde `onSubmit(payload: EnqueueActionPayload)`;
  `defaultMoveCategory(state: CombatState): MoveCategory`.

- [ ] **Step 1: Escreva o teste que falha**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ActionComposer from "../ActionComposer";

const catalogue = {
  weapons: [
    { name: "Fist", dice: [6, 6, 4], flatDamage: 0, defenseBonus: 0, proficiencyLevel: 0 },
    { name: "Sword", dice: [10, 4], flatDamage: 2, defenseBonus: 0, proficiencyLevel: 4 },
  ],
  skills: ["Push"],
};

describe("ActionComposer", () => {
  it("monta o payload sem nenhum nome de perícia", () => {
    const onSubmit = vi.fn();
    render(
      <ActionComposer
        actorId="c1"
        actorName="Gon"
        actorSlot={[1, 1, 0]}
        draft={{ targets: ["c2"], weapon: "Sword", move: { category: "Dash", to: [3, 1, 0] } }}
        catalogue={catalogue}
        onDraftChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /declarar/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      actorId: "c1",
      targetId: ["c2"],
      attack: { weapon: "Sword" },
      move: { category: "Dash", from: [1, 1, 0], position: [3, 1, 0] },
    });
  });

  it("não oferece campo de perícia", () => {
    render(
      <ActionComposer
        actorId="c1"
        actorName="Gon"
        actorSlot={[1, 1, 0]}
        draft={{ targets: [] }}
        catalogue={catalogue}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/perícia/i)).toBeNull();
  });

  it("oferece Dash e Shift, com Dash marcado", () => {
    render(
      <ActionComposer
        actorId="c1"
        actorName="Gon"
        actorSlot={[1, 1, 0]}
        draft={{ targets: [], move: { category: "Dash", to: [2, 1, 0] } }}
        catalogue={catalogue}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole("radio", { name: /dash/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /shift/i })).not.toBeChecked();
  });
});
```

- [ ] **Step 2: Rode e veja falhar**

Run: `npm run test -- src/features/match/combat/__tests__/ActionComposer.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Escreva o default como função**

`src/features/match/combat/defaultMoveCategory.ts`:

```ts
import type { MoveCategory } from "./combatMessages";
import type { CombatState } from "./combatReducer";

/**
 * FUNÇÃO, não constante, de propósito: `barra-de-acao.md` diz que no turno livre o
 * deslocamento normalmente é Shift, e este default pode passar a seguir o regime. Desenhado
 * para ser enriquecido — não decida isso agora.
 */
export function defaultMoveCategory(_state: CombatState): MoveCategory {
  return "Dash";
}
```

- [ ] **Step 4: Escreva a sheet**

Conteúdo, na ordem: nome do ator (com o **X** de limpar quando `onClearActor` vier — é o único
jeito de largar o ator, porque clicar de novo é alvejar a si mesmo); a lista de alvos marcados,
cada um removível; um `<fieldset>` de arma listando `catalogue.weapons` com dados, dano plano e
proficiência (`Fist` é o default quando o rascunho não tem arma); um `<fieldset>` de movimento
com dois `radio` — **Dash** e **Shift** — e o destino já escolhido no mapa ("clique num
espaço livre para escolher o destino" quando não houver); e o botão **Declarar**.

**Nenhum campo de perícia** (§11.1 do documento mestre: a corrente de testes não é executada, e
controle que não muda nada é pior que controle nenhum). O `hit` é derivado pelo servidor.

Montagem do payload no submit:

```ts
const payload: EnqueueActionPayload = {
  actorId,
  ...(draft.targets.length ? { targetId: draft.targets } : {}),
  ...(draft.weapon || draft.targets.length ? { attack: { ...(draft.weapon ? { weapon: draft.weapon } : {}) } } : {}),
  ...(draft.move ? { move: { category: draft.move.category, from: actorSlot, position: draft.move.to } } : {}),
};
```

- [ ] **Step 5: Rode e veja passar**

Run: `npm run test -- src/features/match/combat/__tests__/ActionComposer.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/match/combat
git commit -m "feat(match): bottom sheet de compor ação, sem campo de perícia

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: `GamePlayerPage` e a rota que escolhe a página

**Files:**
- Create: `src/pages/GamePlayerPage.tsx`
- Create: `src/features/match/WallActionSheet.tsx` (extraído do `GamePage.tsx` atual, sem mudar comportamento)
- Modify: `src/pages/GamePage.tsx` (vira a rota)
- Test: `src/pages/__tests__/GamePage.test.tsx` (atualizar) e `src/pages/__tests__/GamePlayerPage.test.tsx` (novo)

**Interfaces:**
- Consumes: `MatchStageTemplate` (T2), `useMatchCombat` (T6), `useCombatCatalogue` (T7),
  organismos (T10), `ActionComposer` (T11), props novas do viewer (T8/T9).
- Produces: `<GamePlayerPage token campaignId matchId />`, `<WallActionSheet wall onClose onInteract onAttack />`.

- [ ] **Step 1: Escreva o teste que falha**

`src/pages/__tests__/GamePlayerPage.test.tsx` — siga o padrão de MSW e de mocks de
`src/pages/__tests__/GamePage.test.tsx` (leia-o antes; ele já monta match, mapa e participantes):

```tsx
it("mostra o erro do servidor em vez de engoli-lo", async () => {
  renderPlayerPage();
  const ws = FakeWS.instances[0];
  ws.onopen?.();
  ws.emit("error", { code: "forbidden", message: "only the master can perform this action" });
  expect(await screen.findByRole("alert")).toHaveTextContent(/só o mestre/i);
});

it("aplica bars_updated e descarta snapshot atrasado", async () => {
  renderPlayerPage();
  const ws = FakeWS.instances[0];
  ws.onopen?.();
  ws.emit("bars_updated", { seq: 5, prices: { action: 14 }, characters: [], order: [{ actorId: "c1", bars: ["action"], key: 18 }] });
  expect(await screen.findByTestId("order-row")).toHaveTextContent("Gon");
  ws.emit("bars_updated", { seq: 2, prices: {}, characters: [], order: [] });
  expect(screen.getAllByTestId("order-row")).toHaveLength(1);
});
```

- [ ] **Step 2: Rode e veja falhar**

Run: `npm run test -- src/pages/__tests__/GamePlayerPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Extraia o `WallActionSheet`**

Mova o bloco `wallPicker && (…)` do `GamePage.tsx` atual — com todos os styled-components dele
— para `src/features/match/WallActionSheet.tsx`, com props
`{ wall, isMaster, onInteract(kind), onAttack(), onClose() }`. **Sem mudança de
comportamento**: este é o único lugar da fase onde `isMaster` continua descendo, porque o menu
de parede tem verbos diferentes por papel (`enqueue_master_action` × `enqueue_action`) e essa
distinção é do protocolo, não de visibilidade.

- [ ] **Step 4: Escreva a página**

Estrutura (o corpo dos handlers sai das tarefas anteriores):

```tsx
export default function GamePlayerPage({ token, campaignId, matchId }: Props) {
  const { state, status, send, dismissError } = useMatchCombat({ matchUuid: matchId, token, isMaster: false, /* handlers de mapa */ });
  const myParticipant = participants.find((p) => p.characterSheet.playerUuid === user?.uuid);
  const actorId = myParticipant?.characterSheet.uuid;
  const { data: catalogue } = useCombatCatalogue(token, actorId);
  const [draft, setDraft] = useState<ActionDraft>(() => (matchId && actorId ? loadDraft(matchId, actorId) : emptyDraft()));
  // … seleção de alvo pelo mapa, destino por slot vazio, submit → send.enqueueAction
  return (
    <MatchStageTemplate
      topbar={<MatchTopBar scene={state.scene} roundMode={state.roundMode} status={status} />}
      rail={<RailNav items={[{ id: "acao", label: "Ação" }]} active="acao" onSelect={…} />}
      panel={<><OwnBars bars={state.bars} characterId={actorId ?? ""} hp={actorId ? state.hp[actorId] : undefined} /><ActionComposer … /></>}
      stage={<><TacticalMapViewer … piecesInteractive onPieceSelect={…} onPieceLongPress={…} onEmptySlotClick={…} ghosts={Object.values(state.ghosts)} targetPieceIds={…} /><GeneralBar bars={state.bars} nameOf={nameOf} /><MatchErrorBanner error={state.lastError} onDismiss={dismissError} /></>}
      aside={<AsideTabs defaultTab="historico" historico={<EventStream events={state.events} nameOf={nameOf} />} personagens={<MatchCharactersSidebar … />} />}
    />
  );
}
```

Regras que **não** podem ser esquecidas aqui:

- o rail do jogador na Fase 6 tem **só "Ação"** — ficha, inventário e Nen entram nas fases
  delas (§5.2 do mestre);
- a aba padrão do `aside` é **Histórico**;
- a lista de personagens do jogador **não mostra HP de terceiro**: renderize o que chegou
  (`private` vem `null` para quem não tem direito, e o HP ao vivo só chega para o dono);
- clicar numa peça marca alvo; **segurar marca mais de um**; clicar na própria peça a marca
  como alvo (alvejar a si mesmo é legítimo) e **não** desfaz nada;
- trocar de alvo **migra** o rascunho (`migrateTargets`), e todo `setDraft` persiste com
  `saveDraft`; `clearDraft` no `action_enqueued`.

- [ ] **Step 5: Transforme o `GamePage` na rota**

```tsx
export default function GamePage() {
  const { token } = useToken();
  const { campaignId, matchId } = useParams<{ campaignId: string; matchId: string }>();
  if (!token) return <Navigate to="/" replace />;
  return <GameRoute token={token} campaignId={campaignId} matchId={matchId} />;
}

function GameRoute({ token, campaignId, matchId }: Props) {
  const { data: match, isPending } = useMatchDetails(token, matchId);
  const { user } = useUser();
  if (isPending || !match || !user) return <PageStates.Loading />;   // loading guard, src/pages/CLAUDE.md
  return match.masterUuid === user.uuid
    ? <GameMasterPage token={token} campaignId={campaignId} matchId={matchId} />
    : <GamePlayerPage token={token} campaignId={campaignId} matchId={matchId} />;
}
```

Na Tarefa 12 o `GameMasterPage` ainda não existe — deixe a rota renderizando
`GamePlayerPage` nos dois ramos, com um `// TODO(task-13)` que a Tarefa 13 remove. (É o único
TODO autorizado deste plano, e ele morre na tarefa seguinte.)

**A rota não muda de caminho:** continua `/campaigns/:campaignId/matches/:matchId/game`.

- [ ] **Step 6: Rode e veja passar**

Run: `npm run test -- src/pages/__tests__/`
Expected: PASS — inclusive o `GamePage.test.tsx` antigo, ajustado ao novo desenho.

- [ ] **Step 7: Commit**

```bash
git add src/pages src/features/match
git commit -m "feat(match): tela do jogador e rota que escolhe a página pelo papel

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: `GameMasterPage`

**Files:**
- Create: `src/pages/GameMasterPage.tsx`
- Modify: `src/pages/GamePage.tsx` (remove o TODO da Tarefa 12)
- Test: `src/pages/__tests__/GameMasterPage.test.tsx`

**Interfaces:**
- Consumes: tudo das Tarefas 6, 10, 11 e 12.
- Produces: `<GameMasterPage token campaignId matchId />`.

- [ ] **Step 1: Escreva os testes que falham**

```tsx
it("abre a próxima ação e antecipa uma da fila", async () => {
  renderMasterPage();
  const ws = FakeWS.instances[0];
  ws.onopen?.();
  ws.emit("action_queued", { actionId: "a1", actorId: "c1", bars: ["action"] });
  fireEvent.click(await screen.findByRole("button", { name: /antecipar/i }));
  const sent = ws.send.mock.calls.map((c) => JSON.parse(c[0] as string));
  expect(sent.at(-1)).toMatchObject({ type: "pull_action", payload: { actionId: "a1" } });
});

it("mostra o diálogo que o servidor computou e reenvia com confirm", async () => {
  renderMasterPage();
  const ws = FakeWS.instances[0];
  ws.onopen?.();
  ws.emit("close_turn_refused", {
    turnId: "t1",
    pendingReactions: [{ reactionId: "r1", actorId: "c2", kind: "repel" }],
  });
  fireEvent.click(await screen.findByRole("button", { name: /fechar mesmo assim/i }));
  const sent = ws.send.mock.calls.map((c) => JSON.parse(c[0] as string));
  expect(sent.at(-1)).toEqual({ type: "close_turn", payload: { confirm: true } });
});

it("compõe ação por um NPC com enqueue_action, não com enqueue_master_action", async () => {
  renderMasterPage();
  const ws = FakeWS.instances[0];
  ws.onopen?.();
  // seleciona o NPC como ator pelo mapa (o harness expõe um botão de teste para isso)
  fireEvent.click(screen.getByTestId("select-actor-npc1"));
  fireEvent.click(screen.getByRole("button", { name: /declarar/i }));
  const sent = ws.send.mock.calls.map((c) => JSON.parse(c[0] as string));
  expect(sent.at(-1)?.type).toBe("enqueue_action");
  expect(sent.at(-1)?.payload.actorId).toBe("npc1");
});
```

- [ ] **Step 2: Rode e veja falhar**

Run: `npm run test -- src/pages/__tests__/GameMasterPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implemente**

Mesma casca da tela do jogador, com quatro diferenças, e **só quatro**:

1. `rail` tem **Fila** e **Fichas** (§5.2); `panel` mostra o `QueuePanel` quando a Fila está
   ativa;
2. topbar ganha a regência: **Abrir próxima** (`send.openNextAction`), **Fechar turno**
   (`send.closeTurn()`), e o seletor `Free`/`Race` (`send.changeRoundMode`);
3. `CloseTurnRefusedDialog` ligado a `state.pendingCloseTurn`, cujo confirmar é
   `send.closeTurn(true)`;
4. **ator selecionável no mapa**: clicar numa peça que o mestre controla (NPC) a marca como
   ator, com moldura; clicar em **outra coisa** marca alvo; **segurar** marca vários; um **X**
   explícito limpa o ator. E a ação do NPC vai por **`enqueue_action` com o `actorId` do NPC** —
   nunca por `enqueue_master_action`, cujos `move`/`attack` continuam não mapeados no servidor
   (no-op silencioso).

**Clicar numa peça que o mestre NÃO controla, sem ator selecionado** (decisão do spec §7.3): ela
vira **inspecionada** — recebe a moldura de foco e a aba Personagens rola até aquele
personagem. Não vira ator e nada é enviado. (Virar ator produziria
`action actor does not match player` na primeira declaração.)

O `aside` do mestre mostra HP de todo mundo — e isso **não** precisa de `isMaster`: o servidor
só manda `character_hp_changed` para quem tem direito, e a lista renderiza `state.hp`.

- [ ] **Step 4: Rode e veja passar**

Run: `npm run test -- src/pages/__tests__/`
Expected: PASS.

- [ ] **Step 5: Verificação e commit**

Run: `npm run test && npm run lint && npm run build`

```bash
git add src/pages
git commit -m "feat(match): tela do mestre com fila, regência e ação por NPC

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: Verificação no browser, documentação e PR

A camada Pixi não tem teste nenhum: **esta tarefa é a única evidência possível** de que
seleção, long-press, fantasma e empilhamento funcionam. Não pule, e não declare pronto o que
não viu rodar.

**Files:**
- Create: `docs/dev/match/combate-fase-6.md`
- Modify: `CLAUDE.md` (uma linha apontando o doc novo, se couber)

- [ ] **Step 1: Suba o ambiente**

```bash
npm run dev
```
Confira antes se a 5173 não está presa por um Vite órfão (`lsof -ti:5173`) e se a worktree tem
`.env` — sem ele `VITE_WS_URL` fica indefinido e o WS nunca conecta. Suba também o back
(`make dev-api`) e o game server (`make dev-game`) no repo Go.

- [ ] **Step 2: Prepare a mesa**

Com as contas de teste: uma campanha, uma partida, **um NPC posto pelo REST antes de a sala
nascer** (`POST /matches/{uuid}/npcs`) e um personagem de jogador inscrito. Abra o mestre num
navegador e o jogador em outro (não duas abas do mesmo — `localStorage` é compartilhado).

- [ ] **Step 3: Rode um turno inteiro e registre**

Marque cada um:

- [ ] o jogador clica numa peça e ela fica marcada como alvo
- [ ] **segurar** sobre uma segunda peça marca dois alvos (e o menu do navegador não aparece)
- [ ] botão direito faz o mesmo no desktop
- [ ] escolher um slot livre desenha o **fantasma** translúcido com a seta
- [ ] declarar → o mestre vê a ação na fila
- [ ] o mestre abre → a peça anda de verdade e o fantasma some
- [ ] duas peças no mesmo slot desenham a **cascata** com o contador
- [ ] o mestre fecha o turno → barras andam e o HP muda nas duas telas com direito
- [ ] o mestre compõe e declara ação **pelo NPC**, e ela roda
- [ ] uma recusa do servidor aparece em texto (force uma: `pull_action` de um id inexistente)
- [ ] recarregar a página do jogador restaura cena, regime, barras e turno aberto
- [ ] quatro formatos: celular, tablet **em pé**, tablet **deitado**, desktop

- [ ] **Step 4: Escreva o doc**

`docs/dev/match/combate-fase-6.md`, em PT-BR: o que a fase entrega, o desenho do reducer, as
três decisões de UX (gesto de segurar, empilhamento, clique do mestre em peça alheia) com o
porquê de cada uma, e o que ficou fora.

- [ ] **Step 5: Commit e PR**

```bash
git add docs
git commit -m "docs(match): registra o desenho da Fase 6 do combate no front

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

Abra o PR dizendo explicitamente:

- o que foi verificado no browser (a lista do passo 3, com o que passou);
- **o que não foi verificado**, se sobrou algo;
- as **duas decisões de desenho** que o documento mestre pediu para declarar: o gesto de
  segurar e o visual do empilhamento;
- as **três perguntas de contrato** do spec §15: `move.position` não tem forma hexagonal;
  ataque a parede sem arma cai na proficiência de `Fist`; `match_full_state.openTurn` não
  carrega `actionId`;
- cross-link com o PR #77 do repo Go (o documento mestre corrigido), de que este trabalho
  depende.

Se sobrou qualquer coisa não verificada, deixe o ambiente pronto:
`./dev-checkout.sh <branch>` a partir de `System_X_System_Project/` — conferindo antes se a
branch já está numa worktree, porque o script faz checkout no repo principal.

---

## Self-review do plano

**Cobertura do spec:** §3.1 → T4/T5/T6 · §3.2 → T2 · §3.3 → mapa de arquivos · §3.4 → T12/T13 ·
§4 (`error`) → T1 · §5 (contrato→estado) → T3/T4/T5 · §6 (compor ação) → T6/T7/T11 ·
§7.1 (gesto) → T8 · §7.2 (empilhamento) → T9 · §7.3 (peça alheia) → T13 · §8 (fantasma) →
T4/T9 · §9 (HP) → T4/T10 · §10 (histórico) → T4/T10 · §11 (reconexão) → T4 · §12 (verificação)
→ T14 · §15 (perguntas) → T14.

**Ordem:** nada nesta fase espera back — B1 a B4 (`turn_opened.actionId`,
`character_hp_changed`, `turn_closed` nos dois caminhos, `hit` derivado) já estão em `main`.
