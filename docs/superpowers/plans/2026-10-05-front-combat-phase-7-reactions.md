# Fase 7 do combate no front — Reações — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** o alvo reage (cinco botões ao lado da peça e no painel, clicar envia, segurar configura,
fuga escolhe a casa no mapa), o mestre dá a palavra na ordem que quiser e vê o efeito, a mesa vê
balões e o fantasma da fuga, tudo sobrevivendo a recarregar — e um botão "Entrar na partida" na
página da partida em andamento.

**Architecture:** o reducer ganha o estado das reações do turno aberto (vindo de
`reaction_attached`, `reaction_opened` e `match_full_state`); funções puras montam tipo e
payload; um hook compartilhado (`useReactionControls`) dá às duas páginas o mesmo comportamento;
uma camada HTML (`MapPieceOverlay`) posiciona botões e balões ao lado da peça a partir da
transformação da viewport que o Pixi passa a emitir; o fantasma de espera é mais uma fonte de
`ghosts`.

**Tech Stack:** React 19, TypeScript strict (`verbatimModuleSyntax`), styled-components, Vite,
Vitest + Testing Library, @pixi/react + pixi-viewport.

**Spec:** [`docs/superpowers/specs/2026-10-05-front-combat-phase-7-reactions-design.md`](../specs/2026-10-05-front-combat-phase-7-reactions-design.md)
— leia o spec inteiro antes da primeira tarefa. Contrato:
`../System_X_System/docs/dev/api/match-combat-ws.md` (o repo do back está ao lado, em
`/home/azzurah/Documentos/HxH_RPG_Environment_Project/System_X_System_Project/System_X_System`).

**Branch:** `feat/combat-phase-7-reactions` (já criada a partir de `main` em `52a9fd8`).

## Global Constraints

- TS strict com `verbatimModuleSyntax`: import só de tipo é `import type { … }`. `noUnusedLocals`/`noUnusedParameters` ligados.
- styled-components só; **cores/fontes de `src/styles/tokens.ts`** — nada de hex/rgba cru fora da zona pixel-tuned. Token novo, se precisar, entra em `tokens.ts`.
- **A zona Pixi (`src/features/tactical-map/**`) é pixel-tuned**: só acrescente o que a tarefa pede (o emissor da viewport e o repasse de prop); não normalize nada ali.
- Nenhum componente decide visibilidade por papel além do que o spec manda (o servidor já projeta).
- **O cliente nunca reenvia sozinho** e nunca guarda em `localStorage` estado que descreve a partida (reações vêm do servidor).
- Wire em camelCase, sem conversão. Tipos de mensagem em snake_case.
- Textos de UI em PT-BR. Comentários explicam o porquê, no tom e na densidade dos vizinhos (este repo comenta em PT-BR).
- Testes: Vitest + Testing Library, ao lado dos existentes (`__tests__/`). **TDD** — o teste vem antes.
- Verificação por tarefa: `npx tsc -b`, `npm run lint`, `npx vitest run <arquivos da tarefa>`; a suíte inteira (`npm run test`) antes de commitar.
- Commits terminam com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Trabalhe neste checkout, na branch atual. Não crie worktree, não troque de branch, não faça push.

## Review Focus

1. **O mestre recebendo `reaction_attached` da reação de um jogador** — não pode criar entrada em `ownReactions` dele (não é reação "dele"); só tira da fila o que foi consumido. Teste em T2.
2. **Recarregar com uma reação `sending` sem resposta** — o `match_full_state` descarta a local; se o servidor não a tem, o botão volta; se tem, "aguardando o mestre". Teste em T2.
3. **Clique × segurar no mesmo botão** — segurar não pode também enviar (o `pointerup` depois do hold não é clique); botão direito não pode enviar. Teste em T4.
4. **Escolha da casa com o turno mudando** — `turn_closed`/`match_full_state` derruba o `pick`; tocar no mapa depois disso não envia nada. Teste em T5.
5. **Um alvo meu que é também o atacante (alvejar a si mesmo é legítimo, Fase 6)** — ele aparece como alvo e pode reagir; nada quebra. Teste em T3.

---

### Task 1: wire — tipos, socket e textos de erro (spec §4.1)

**Files:**
- Modify: `src/features/match/combat/combatMessages.ts`, `src/types/matchHistory.ts`, `src/hooks/useMatchWs.ts`, `src/features/match/combat/combatErrorMessages.ts`
- Test: `src/features/match/combat/__tests__/combatErrorMessages.test.ts`

**Interfaces — Produces:** os tipos do spec §4.1 exatamente (`ReactionKind`, `AttachReactionPayload`, `ReactionAttachedPayload`, `ReactionOpenedPayload`, `OwnReactionPayload`); `MatchFullStatePayload.openTurn.reactions?: HistoryAction[]`, `MatchFullStatePayload.ownReactions?: OwnReactionPayload[]`; `HistoryAction.consumedActionIds?: string[]`; `CombatServerMessage` com `{ type: "reaction_attached"; payload: ReactionAttachedPayload }` e `{ type: "reaction_opened"; payload: ReactionOpenedPayload }`; `useMatchWs` devolve `sendAttachReaction(payload: AttachReactionPayload): boolean` e `sendOpenReaction(reactionId: string): boolean`.

- [ ] **Step 1: Teste dos textos de erro**

```ts
it("prefixa as recusas de reagir e de dar a palavra", () => {
  expect(combatErrorText("game_error", "this character already reacted to the open action", "attach_reaction"))
    .toBe("Não foi possível reagir: this character already reacted to the open action");
  expect(combatErrorText("forbidden", "only the master can perform this action", "open_reaction"))
    .toBe("Não foi possível dar a palavra: Só o mestre pode fazer isso. (only the master can perform this action)");
});
```

- [ ] **Step 2: Rode — falha.** `npx vitest run src/features/match/combat/__tests__/combatErrorMessages.test.ts`

- [ ] **Step 3: Implemente**
  - `combatErrorMessages.ts`: `bySentType.attach_reaction = "Não foi possível reagir"`, `bySentType.open_reaction = "Não foi possível dar a palavra"`.
  - `combatMessages.ts`: os tipos do spec §4.1, com o comentário de cada um (o contrato em uma linha). `MoveCategory` já existe.
  - `matchHistory.ts`: `consumedActionIds?: string[]` em `HistoryAction`, com comentário "só numa reação cobrada; só para mestre e dono (o servidor já projeta)".
  - `useMatchWs.ts`: `COMBAT_TYPES` ganha `"reaction_attached", "reaction_opened"`; `sendAttachReaction = useCallback((p: AttachReactionPayload) => sendRaw("attach_reaction", p), [sendRaw])`; `sendOpenReaction = useCallback((reactionId: string) => sendRaw("open_reaction", { reactionId }), [sendRaw])`; os dois no objeto devolvido.

- [ ] **Step 4:** `npx tsc -b && npm run lint && npx vitest run src/features/match/combat/__tests__/combatErrorMessages.test.ts` → verde.

- [ ] **Step 5: Commit** — `feat(combate): tipos e envio de attach_reaction/open_reaction (Fase 7)`

---

### Task 2: reducer — reações do turno aberto, consumo e reconciliação (spec §4.2)

**Files:**
- Modify: `src/features/match/combat/combatReducer.ts`, `src/features/match/combat/useMatchCombat.ts`
- Test: `src/features/match/combat/__tests__/combatReducer.test.ts`, `src/features/match/combat/__tests__/useMatchCombat.test.ts`

**Interfaces:**
- Consumes: tipos da Task 1.
- Produces (usados por T3–T8):
  - `export type OwnReaction = { reactionId?: string; actorId: string; turnId: string; kind: ReactionKind; status: "sending" | "attached" | "opened"; consumedActionIds: string[] }`
  - `CombatState` ganha `openReactions: HistoryAction[]`, `ownReactions: OwnReaction[]`, `closedTurn: { turnId: string; actorId: string; action?: HistoryAction } | null`, `lastSettled: { turnId: string; actorId?: string; action?: HistoryAction; resolution: ResolutionPayload } | null` (todos vazios/nulos em `initialCombatState`).
  - `CombatAction` ganha `{ type: "REACTION_SENT"; payload: { actorId: string; turnId: string; kind: ReactionKind } }`, e os dois tipos de servidor com `Stamp`.
  - `useMatchCombat().send.attachReaction(payload: AttachReactionPayload, turnId: string): boolean` (despacha `REACTION_SENT` só se o envio saiu) e `send.openReaction(reactionId: string): boolean`.

- [ ] **Step 1: Testes do reducer** (no estilo do arquivo: `run([...])`). Escreva um `describe("combatReducer — reações (Fase 7)")` com estes casos (asserte o estado exato):

1. `REACTION_SENT` → `ownReactions = [{actorId, turnId, kind, status: "sending", consumedActionIds: []}]`.
2. `REACTION_SENT` + `reaction_attached {turnId, reactionId: "r1", actorId, consumedActionIds: ["a9"]}` → a entrada vira `attached` com `reactionId: "r1"` e `consumedActionIds: ["a9"]`; uma declarada `"a9"` (status `queued`) **sai** de `declared`; `lostDeclared` e `lostCandidates` continuam vazios; uma `queue` com `"a9"` perde a linha.
3. **Review Focus 1:** sem `REACTION_SENT` (o mestre recebendo a reação de um jogador): `reaction_attached` **não** cria entrada em `ownReactions`, mas tira `"a9"` da `queue`.
4. `reaction_opened {turnId, reactionId: "r1", reaction: {uuid: "r1", actorId, reactionKind: "escape", move: {category: "Dash", position: [3,3,0]}}}` → `openReactions` tem a reação; a minha `r1` vira `opened`. Um segundo `reaction_opened` igual não duplica.
5. `WS_ERROR {sentType: "attach_reaction"}` depois de `REACTION_SENT` → `ownReactions` vazio e `lastError` guardado.
6. `turn_opened` de outro turno zera `openReactions`, `ownReactions`, `lastSettled`.
7. `turn_closed` do turno aberto (com `openTurn.action` presente) → `closedTurn = {turnId, actorId, action}`, `openReactions`/`ownReactions` zerados; em seguida o `resolution_updated` liquidado do mesmo `turnId` → `lastSettled` com o `actorId`, a `action` e a `resolution`. Sem `closedTurn` correspondente (liquidado chegando antes), `lastSettled` usa o `openTurn` se o `turnId` bate, senão fica só com `resolution`.
8. **Review Focus 2:** `REACTION_SENT` e então `match_full_state` **sem** `ownReactions` → `ownReactions` vazio (a local some, o botão volta). Com `ownReactions: [{reactionId: "r1", actorId, reactionKind: "closedEscape", opened: false, consumedActionIds: ["a9"]}]` e `openTurn.turnId: "t1"` → `ownReactions = [{reactionId: "r1", actorId, turnId: "t1", kind: "closedEscape", status: "attached", consumedActionIds: ["a9"]}]`; `opened: true` → `status: "opened"`.
9. `match_full_state` com `openTurn.reactions: [r2, r1]` → `openReactions` nessa ordem; `lastSettled: null`.
10. Reconciliação: declarada `"a9"` `queued`, `match_full_state` sem `"a9"` em `ownQueue` mas com `ownReactions[0].consumedActionIds = ["a9"]` → `"a9"` sai de `declared` e **não** entra em `lostCandidates`.
11. `resolveLostCandidates`: candidata `"a9"` e um histórico cujo turno tem `reactions: [{uuid: "r1", …, consumedActionIds: ["a9"]}]` → `ran: ["a9"]`, `lost: []`.
12. `round_closed` zera `openReactions`/`ownReactions`; `scene_changed` zera também `lastSettled`.

E em `useMatchCombat.test.ts` (siga o mock de `useMatchWs` que o arquivo já usa): `send.attachReaction(payload, "t1")` chama `sendAttachReaction(payload)` e, se ele devolveu `true`, o estado ganha a `sending`; se devolveu `false`, nada muda. `send.openReaction("r1")` chama `sendOpenReaction("r1")`.

- [ ] **Step 2: Rode — falha.** `npx vitest run src/features/match/combat/__tests__/combatReducer.test.ts src/features/match/combat/__tests__/useMatchCombat.test.ts`

- [ ] **Step 3: Implemente** no reducer, seguindo a tabela do spec §4.2:

```ts
case "REACTION_SENT":
  return {
    ...state,
    ownReactions: [...state.ownReactions, { ...action.payload, status: "sending", consumedActionIds: [] }],
  };

case "reaction_attached": {
  const p = action.payload;
  const consumed = new Set(p.consumedActionIds);
  const i = state.ownReactions.findIndex((r) => r.status === "sending" && r.actorId === p.actorId);
  const ownReactions =
    i < 0
      ? state.ownReactions
      : state.ownReactions.map((r, j) =>
          j === i ? { ...r, reactionId: p.reactionId, status: "attached" as const, consumedActionIds: p.consumedActionIds } : r,
        );
  return {
    ...state,
    ownReactions,
    // Consumida não é perdida (contrato): sai calada, sem aviso e sem devolver rascunho.
    declared: state.declared.filter((d) => !consumed.has(d.id)),
    queue: state.queue.filter((q) => !consumed.has(q.actionId)),
  };
}

case "reaction_opened": {
  const { reactionId, reaction } = action.payload;
  const known = state.openReactions.some((r) => r.uuid === reactionId);
  return {
    ...state,
    openReactions: reaction && !known ? [...state.openReactions, reaction] : state.openReactions,
    ownReactions: state.ownReactions.map((r) => (r.reactionId === reactionId ? { ...r, status: "opened" as const } : r)),
  };
}
```

  - `WS_ERROR`: antes do ramo de `enqueue_action`, se `sentType === "attach_reaction"`, tire a `sending` mais antiga (`findIndex(r => r.status === "sending")`) e guarde o erro.
  - `turn_opened`: `openReactions: []`, `ownReactions: []`, `lastSettled: null`, `closedTurn: null`.
  - `turn_closed`: quando `state.openTurn?.turnId === turnId`, `closedTurn = { turnId, actorId: state.openTurn.actorId, action: state.openTurn.action }`; sempre `openReactions: []`, `ownReactions: []` para o turno que fechou.
  - `resolution_updated` liquidado: além do que já faz, `lastSettled = { turnId, actorId: closedTurn?.actorId ?? (openTurn?.turnId === turnId ? openTurn.actorId : undefined), action: closedTurn?.action ?? (openTurn?.turnId === turnId ? openTurn.action : undefined), resolution }`, usando `closedTurn` só se o `turnId` bate.
  - `round_closed`: zera `openReactions`, `ownReactions`. `scene_changed`: zera os dois e `lastSettled`.
  - `match_full_state`: `openReactions: p.openTurn?.reactions ?? []`; `ownReactions` de `p.ownReactions` mapeado (`turnId: p.openTurn?.turnId ?? ""`, `status: opened ? "opened" : "attached"`); `lastSettled: null`; `closedTurn: null`. Em `reconcileDeclared`, receba também `consumed: Set<string>` (todos os `consumedActionIds` de `p.ownReactions`) e mande para `kept`… não: **descarte calado** — uma declarada `queued` cujo id está em `consumed` não vai nem para `kept` nem para `lost`.
  - `resolveLostCandidates`: ao varrer `turn.reactions`, acrescente também cada id de `r.consumedActionIds ?? []` em `inHistory`, com o comentário "consumida por uma reação cobrada — rodou, de certa forma; não foi perdida (contrato B12)".

  `useMatchCombat`:

```ts
const attachReaction = useCallback(
  (payload: AttachReactionPayload, turnId: string): boolean => {
    if (!ws.sendAttachReaction(payload)) return false;
    dispatch({ type: "REACTION_SENT", payload: { actorId: payload.actorId, turnId, kind: payload.reactionKind } });
    return true;
  },
  [ws],
);
```

  e `openReaction: ws.sendOpenReaction` em `send`.

- [ ] **Step 4:** testes verdes; `npx tsc -b && npm run lint && npm run test`.

- [ ] **Step 5: Commit** — `feat(combate): o reducer guarda as reações do turno aberto e o que elas consumiram`

---

### Task 3: modelo da reação — funções puras (spec §4.3)

**Files:**
- Create: `src/features/match/combat/reactionModel.ts`
- Test: `src/features/match/combat/__tests__/reactionModel.test.ts`

**Interfaces — Produces** (exatamente o bloco do spec §4.3), mais `export type ReactionStatus = "available" | "sending" | "attached" | "opened"` e `export const REACTION_BARS: Record<ReactionKind, Bar[]>` (`nothing/dodge/closedDodge: []`, `escape/escapeGuard: ["action","move"]`, `closedEscape: ["move"]`, `repel: ["action"]` — a tabela do contrato).

- [ ] **Step 1: Testes**

```ts
import { describe, it, expect } from "vitest";
import {
  buildReactionPayload, moveCategoryOf, needsDestination, reactableTargets, reactionKindOf,
  reactionStatusOf, supportsEvasion,
} from "../reactionModel";

describe("reactionKindOf", () => {
  it.each([
    ["nothing", false, "nothing"], ["dodge", false, "dodge"], ["dodge", true, "closedDodge"],
    ["escape", false, "escape"], ["escape", true, "closedEscape"], ["escapeGuard", false, "escapeGuard"],
    ["escapeGuard", true, "escapeGuard"], ["repel", true, "repel"],
  ] as const)("%s + evasão %s = %s", (b, ev, kind) => expect(reactionKindOf(b, ev)).toBe(kind));
  it("só Esquivar e Escapar aceitam Evasão", () => {
    expect(["nothing", "dodge", "escape", "escapeGuard", "repel"].filter((b) => supportsEvasion(b as never))).toEqual(["dodge", "escape"]);
  });
});

describe("categoria e destino", () => {
  it("é fixa por tipo (matriz §11.4)", () => {
    expect(moveCategoryOf("escape")).toBe("Dash");
    expect(moveCategoryOf("escapeGuard")).toBe("Dash");
    expect(moveCategoryOf("closedEscape")).toBe("Shift");
    expect(moveCategoryOf("dodge")).toBeUndefined();
    expect(["escape", "escapeGuard", "closedEscape"].every((k) => needsDestination(k as never))).toBe(true);
    expect(needsDestination("closedDodge")).toBe(false);
  });
});

describe("buildReactionPayload — o payload mínimo do contrato", () => {
  const base = { actorId: "c2", reactToId: "a1" };
  it.each([
    ["nothing", {}],
    ["dodge", { dodge: {} }],
    ["closedDodge", { dodge: {} }],
    ["repel", { repel: {} }],
  ] as const)("%s", (kind, extra) => {
    expect(buildReactionPayload({ ...base, kind })).toEqual({ ...base, reactionKind: kind, ...extra });
  });
  it("repel leva a arma quando há", () => {
    expect(buildReactionPayload({ ...base, kind: "repel", weapon: "Sword" })).toEqual({ ...base, reactionKind: "repel", repel: { weapon: "Sword" } });
  });
  it.each([["escape", "Dash"], ["escapeGuard", "Dash"], ["closedEscape", "Shift"]] as const)("%s move com %s", (kind, category) => {
    expect(buildReactionPayload({ ...base, kind, position: [4, 2, 0] })).toEqual({
      ...base, reactionKind: kind, dodge: {}, move: { category, position: [4, 2, 0] },
    });
  });
  it("fuga sem casa é bug de quem chama", () => {
    expect(() => buildReactionPayload({ ...base, kind: "escape" })).toThrow();
  });
});

describe("quem reage", () => {
  const openTurn = { turnId: "t1", actorId: "c1", actionId: "a1", action: { uuid: "a1", actorId: "c1", reactionKind: "", targetId: ["c1", "c2", "w9", "c3"] } };
  it("são os meus personagens que estão em targetId, na ordem dele", () => {
    expect(reactableTargets(openTurn, new Set(["c2", "c3"]))).toEqual(["c2", "c3"]);
  });
  it("Review Focus 5: o atacante que se alveja também reage", () => {
    expect(reactableTargets(openTurn, new Set(["c1"]))).toEqual(["c1"]);
  });
  it("sem turno aberto, ou sem a declaração (servidor antigo), ninguém", () => {
    expect(reactableTargets(null, new Set(["c2"]))).toEqual([]);
    expect(reactableTargets({ turnId: "t1", actorId: "c1", actionId: "a1" }, new Set(["c2"]))).toEqual([]);
  });
  it("o estado de cada alvo vem da minha reação do MESMO turno", () => {
    const own = [{ actorId: "c2", turnId: "t1", kind: "dodge" as const, status: "attached" as const, consumedActionIds: [], reactionId: "r1" }];
    expect(reactionStatusOf("c2", own, "t1")).toBe("attached");
    expect(reactionStatusOf("c3", own, "t1")).toBe("available");
    expect(reactionStatusOf("c2", own, "t2")).toBe("available");
  });
});
```

- [ ] **Step 2: Rode — falha.**
- [ ] **Step 3: Implemente** `reactionModel.ts` (comente cada função com a regra do contrato/decisão que ela codifica; `buildReactionPayload` lança `Error("a fuga precisa da casa de destino")`).
- [ ] **Step 4:** verde + `npx tsc -b && npm run lint`.
- [ ] **Step 5: Commit** — `feat(combate): modelo puro da reação — tipo, payload mínimo e quem reage`

---

### Task 4: a âncora no mapa e os componentes de reação (spec §4.4, §4.5) — **opus**

**Files:**
- Modify (zona Pixi, só o emissor): `src/features/tactical-map/stage/stageProps.ts`, `src/features/tactical-map/stage/ViewportInner.tsx`, `src/features/tactical-map/TacticalMapStage.tsx`, `src/features/tactical-map/TacticalMapViewer.tsx`
- Create: `src/features/tactical-map/utils/screenAnchor.ts`, `src/features/match/combat/MapPieceOverlay.tsx`, `src/features/match/combat/ReactionButtons.tsx`, `src/features/match/combat/ReactionConfigDialog.tsx`
- Test: `src/features/tactical-map/utils/__tests__/screenAnchor.test.ts`, `src/features/match/combat/__tests__/ReactionButtons.test.tsx`, `src/features/match/combat/__tests__/ReactionConfigDialog.test.tsx`

**Interfaces:**
- Consumes: `reactionModel` (T3), `createHoldTracker`/`HOLD_MS` (`useHoldGesture.ts`), `slotToWorld`/`slotInradius` (`coords.ts`), `dialogStyles.ts`.
- Produces:
  - `export type ViewportTransform = { x: number; y: number; scale: number }` (em `screenAnchor.ts`); prop `onViewportTransform?: (t: ViewportTransform) => void` em `TacticalMapStageProps` e `TacticalMapViewer`.
  - `pieceScreenAnchor(slot: SlotCoord, grid: GridShape, t: ViewportTransform): { x: number; y: number }`; `pieceScreenRadius(grid: GridShape, t: ViewportTransform): number`.
  - `MapPieceOverlay({ anchors, width, height }: { anchors: Array<{ key: string; x: number; y: number; radius: number; placement: "above" | "below"; node: ReactNode }>; width: number; height: number })`.
  - `ReactionButtons({ status, name, showName, onQuick, onConfigure, compact }: { status: ReactionStatus; name: string; showName?: boolean; compact?: boolean; onQuick: (b: ReactionButton) => void; onConfigure: (b: ReactionButton) => void })`.
  - `ReactionConfigDialog({ name, initial, weapons, defaultWeapon, onSend, onCancel }: { name: string; initial: ReactionButton; weapons: string[]; defaultWeapon?: string; onSend: (r: { kind: ReactionKind; weapon?: string }) => void; onCancel: () => void })` — para fuga, o `onSend` é chamado sem casa; quem chama arma a escolha.

- [ ] **Step 1: Testes**
  - `screenAnchor.test.ts`: grade quadrada `cellSize 50` sem transformação de grade (veja como `coords.test.ts` monta um `GridShape`): slot (2,3) com `{x: 10, y: 20, scale: 2}` → `slotToWorld` × 2 + (10, 20); raio = 25 × 2.
  - `ReactionButtons.test.tsx` (timers falsos, `fireEvent.pointerDown/pointerUp` como em `useHoldGesture.test.ts`):
    - `available` mostra os cinco rótulos de `REACTION_BUTTON_LABELS`;
    - pointerdown + pointerup imediato em "Esquivar" → `onQuick("dodge")`, `onConfigure` não;
    - **Review Focus 3:** pointerdown, avançar `HOLD_MS`, pointerup → `onConfigure("dodge")` uma vez e `onQuick` **nunca**;
    - `contextMenu` em "Repelir" → `onConfigure("repel")`, `onQuick` nunca (e o evento é `defaultPrevented`);
    - Enter → `onQuick`; Shift+Enter → `onConfigure`;
    - `sending`/`attached`/`opened` mostram os textos do spec §4.5 e nenhum botão.
  - `ReactionConfigDialog.test.tsx`: abre com o tipo inicial marcado; Evasão desabilitada em Não fazer nada, Escape defensivo e Repelir; Esquivar + Evasão → `onSend({kind: "closedDodge"})`; Escapar + Evasão → `onSend({kind: "closedEscape"})`; arma aparece só em Repelir, com `defaultWeapon` selecionada e a opção "Desarmado" (valor vazio → `weapon: undefined`); o texto do custo de `closedEscape` cita só a barra de movimento.

- [ ] **Step 2: Rode — falha.**

- [ ] **Step 3: Implemente**
  - **Emissor (Pixi):** em `ViewportInner`, com `vpReady`, registre no `app.ticker` um callback que lê `vp.x`, `vp.y`, `vp.scale.x`, compara com o último emitido (num ref) e chama `onViewportTransform` só quando mudou; remova no cleanup. Comentário: o pan é feito pelos handlers de ponteiro próprios (não dispara `moved`), por isso o ticker. Repasse a prop em `stageProps.ts` (doc: "game only; a camada HTML ancora coisas nas peças por ela"), `TacticalMapStage` e `TacticalMapViewer`.
  - **`MapPieceOverlay`:** `position: absolute; inset: 0; pointer-events: none; overflow: hidden` sobre o palco; cada item `position: absolute; left: x; top: y ∓ radius; transform: translate(-50%, -100%)` (above) ou `translate(-50%, 0)` (below), `pointer-events: auto`; itens com `x`/`y` fora de `[0,width]×[0,height]` não renderizam.
  - **`ReactionButtons`:** um `createHoldTracker` por montagem (ref), `onHold` guarda qual botão; `pointerdown` → `start(button, clientX, clientY)`, `pointermove` → `move`, `pointerup` → `end()`; `"click"` → `onQuick`; `"hold"` já chamou `onConfigure` no timer. `onContextMenu`: `preventDefault()`, `tracker.cancel()`, `onConfigure(button)`. `onKeyDown`: Enter/Espaço (`Shift` → configurar). Estilo: botões pequenos (padding 4px 8px, font 12px), `colors.surfaceInput`/`colors.brandAccent` na borda, `compact` para o mapa (sem o nome do personagem, fonte 11px); um rótulo de grupo "Reagir" (`role="group"`, `aria-label={\`Reagir — ${name}\`}`).
  - **`ReactionConfigDialog`:** `Overlay`/`Dialog`/`DialogTitle` ("Reagir — {name}"); radios dos cinco botões; toggle "Evasão (fechada)" com `disabled={!supportsEvasion(b)}`; select de arma só em Repelir; custo a partir de `REACTION_BARS[kind]` e `BAR_LABELS` ("Cobra: ação + movimento — consome a ação que você tinha na fila, com Desvantagem" / "Não cobra nada"); botão principal "Enviar" (ou "Escolher a casa" quando `needsDestination(kind)`); Cancelar.

- [ ] **Step 4:** testes verdes; `npx tsc -b && npm run lint && npm run test`.
- [ ] **Step 5: Commit** — `feat(combate): âncora de peça na tela, botões de reação e configuração`

---

### Task 5: `useReactionControls` e a tela do jogador (spec §4.5, §4.6, D2, D3) — **opus**

**Files:**
- Create: `src/features/match/combat/useReactionControls.ts`, `src/features/match/combat/ReactionPanel.tsx`
- Modify: `src/features/match/combat/useGameTable.ts` (expor `viewport`/`setViewport` e `pieceAnchor`), `src/pages/GamePlayerPage.tsx`
- Test: `src/features/match/combat/__tests__/useReactionControls.test.ts`, `src/features/match/combat/__tests__/ReactionPanel.test.tsx`

**Interfaces:**
- Consumes: T1–T4.
- Produces:
  - `useReactionControls({ state, mine, boardPieces, matchId, send }: { state: CombatState; mine: ReadonlySet<string>; boardPieces: TacticalPiece[]; matchId?: string; send: { attachReaction: (p: AttachReactionPayload, turnId: string) => boolean } })` devolve `{ targets: Array<{ actorId: string; status: ReactionStatus }>; quick(actorId, b): void; configure(actorId, b): void; dialog: { actorId: string; initial: ReactionButton } | null; closeDialog(): void; sendFromDialog(r: { kind: ReactionKind; weapon?: string }): void; pick: { actorId: string; kind: ReactionKind } | null; cancelPick(): void; onSlotForPick(slot: SlotCoord): boolean }` — `onSlotForPick` devolve `true` quando consumiu o toque (havia `pick`).
  - Regras: `quick` → `needsDestination` ? arma `pick` : envia (`repel` com a arma de `loadDraft(matchId, actorId).attack?.weapon`); `sendFromDialog` → idem com o tipo/arma escolhidos; `onSlotForPick` → envia com `move.position = slotToTriple(slot, z da peça do reator ?? 0)`; o `pick` cai quando o `openTurn.turnId` muda (inclusive para `null`) e a cada `match_full_state` (use o `fullStateSeq` de `useGameTable`, recebido como parâmetro opcional `fullStateSeq`).
  - `ReactionPanel({ targets, nameOf, onQuick, onConfigure })` — a seção "Você é alvo" do painel (D2): um `ReactionButtons` por alvo, com nome; não renderiza nada sem alvos.
  - `useGameTable` passa a devolver `viewport: ViewportTransform | null`, `setViewport`, e `pieceAnchor(characterId: string): { x: number; y: number; radius: number } | undefined` (usa `pieceByCharacter`, `map.grid`, `pieceScreenAnchor`/`pieceScreenRadius`).

- [ ] **Step 1: Testes** (`renderHook` + `act`): `quick("c2","dodge")` chama `attachReaction({actorId:"c2", reactToId: openTurn.actionId, reactionKind:"dodge", dodge:{}}, "t1")`; `quick("c2","escape")` não envia e arma `pick`; `onSlotForPick({kind:"square",col:4,row:2})` envia `move:{category:"Dash", position:[4,2,0]}` e limpa o `pick`; **Review Focus 4:** com `pick` armado, trocar `state.openTurn` por `null` (rerender) derruba o `pick` e `onSlotForPick` devolve `false` sem enviar; `quick("c2","repel")` com rascunho salvo (`saveDraft(matchId,"c2",{moveMode:"none", attack:{targets:[], weapon:"Sword"}})`) envia `repel:{weapon:"Sword"}`, sem rascunho `repel:{}`; `sendFromDialog({kind:"closedEscape"})` arma `pick` com `closedEscape`; `targets` lista `reactableTargets` com o status de cada um. `ReactionPanel`: nome + botões por alvo; vazio sem alvos.

- [ ] **Step 2: Rode — falha.**

- [ ] **Step 3: Implemente** o hook e o painel; depois a **tela do jogador**:
  - `mine = myActorIds` (os personagens do jogador); `controls = useReactionControls({...})`.
  - `TacticalMapViewer` recebe `onViewportTransform={game.setViewport}`.
  - `handleSlotTap`: `if (controls.onSlotForPick(slot)) return;` antes do compositor.
  - Painel (aba Ação): `<ReactionPanel …/>` **acima** do `OwnBars` quando há alvos.
  - Palco: `<MapPieceOverlay>` (dentro do palco, depois do `CanvasWrapper`) com um item `placement: "below"` por alvo que tem âncora: `<ReactionButtons compact status=… name=… showName={targets.length > 1} …/>`.
  - Dica no mapa quando há `pick`: `MapHint` "Toque na casa para onde {nome} escapa." + `MapCornerButton` "× Cancelar"; Esc cancela (mesmo filtro de foco do mestre).
  - `ReactionConfigDialog` quando `controls.dialog`, com `weapons` do `useCombatCatalogue(token, dialog.actorId)` (veja o formato do catálogo em `ActionComposer` — as armas que ele lista) e `defaultWeapon` do rascunho.

- [ ] **Step 4:** testes verdes; `npx tsc -b && npm run lint && npm run test`.
- [ ] **Step 5: Commit** — `feat(combate): o jogador reage — botões ao lado da peça e no painel, fuga escolhe a casa`

---

### Task 6: a tela do mestre — reagir pelo NPC e dar a palavra (spec §4.6, §4.7) — **opus**

**Files:**
- Modify: `src/pages/GameMasterPage.tsx`, `src/features/match/combat/ResolutionDetails.tsx`, `src/features/match/combat/QueuePanel.tsx`
- Test: `src/features/match/combat/__tests__/combatOrganisms.test.tsx` (onde `ResolutionDetails`/`QueuePanel` já são testados — confira; senão crie `ResolutionDetails.test.tsx`)

**Interfaces:**
- Consumes: T1–T5 (`useReactionControls`, `ReactionPanel`, `MapPieceOverlay`, `ReactionButtons`, `ReactionConfigDialog`, `game.pieceAnchor`, `game.setViewport`, `combat.send.openReaction`).
- Produces: `ResolutionDetails` prop `onOpenReaction?: (reactionId: string) => void`; `QueuePanel` prop `onOpenReaction?: (reactionId: string) => void` repassada ao card em andamento.

- [ ] **Step 1: Testes de `ResolutionDetails`:** com `pendingReactions: [{reactionId:"r1", actorId:"c2", kind:"dodge"}]` e `onOpenReaction`, há o botão "Dar a palavra" e o clique chama `onOpenReaction("r1")`; há o texto "A ordem em que você abre muda o resultado."; sem `onOpenReaction`, nenhum botão. Com `targets` = `[B com reaction, A com reaction, C sem]` → B mostra "aberta em 1º", A "aberta em 2º", C nada.

- [ ] **Step 2: Rode — falha.**

- [ ] **Step 3: Implemente**
  - `ResolutionDetails`: o botão em cada linha de "Reações esperando" (mesmo estilo do `FallButton`); a nota acima da lista; "aberta em {n}º" na linha `reação:` de cada alvo, `n` = posição entre os `targets` com `reaction` (comentário: `targets[]` vem na ordem da cadeia — contrato — por isso a posição é a ordem de abertura e sobrevive à reconexão). Atualize o doc do componente ("dar a palavra é da Fase 7" → agora existe).
  - `QueuePanel`: prop `onOpenReaction` repassada.
  - `GameMasterPage`:
    - `mine = npcIds`; `controls = useReactionControls({...})`.
    - `BoardMode` ganha `"reactionPick"`: quando `controls.pick` vira não-nulo, `setBoardMode("reactionPick")` (saindo dos outros modos); `exitBoardMode` chama `controls.cancelPick()`; com `boardMode === "reactionPick"`, `onEmptySlotClick` vai para `controls.onSlotForPick` e `onPieceSelect` fica `undefined`; quando o `pick` cai sozinho (turno mudou), o modo volta a `"play"`. A dica do mapa e o "× Cancelar" seguem o padrão do `fallPick`.
    - `QueuePanel onOpenReaction={combat.send.openReaction}`.
    - Painel da Fila: `<ReactionPanel …/>` no topo quando há NPC alvo; overlay no mapa como na Task 5; `onViewportTransform={game.setViewport}`; `ReactionConfigDialog` com as armas do catálogo do NPC.
    - O F14 ("Escolher onde cai") fica como está — agora alcançável pela UI.

- [ ] **Step 4:** testes verdes; `npx tsc -b && npm run lint && npm run test`.
- [ ] **Step 5: Commit** — `feat(combate): o mestre reage pelo NPC e dá a palavra na ordem que quiser`

---

### Task 7: fantasma de espera e balões (spec §4.8, §4.9, D5, D6, D8)

**Files:**
- Create: `src/features/match/combat/balloonText.ts`, `src/features/match/combat/ActionBalloon.tsx`
- Modify: `src/features/match/combat/useGameTable.ts` (ghosts + `balloons`), `src/pages/GamePlayerPage.tsx`, `src/pages/GameMasterPage.tsx`
- Test: `src/features/match/combat/__tests__/balloonText.test.ts`, `src/features/match/combat/__tests__/ActionBalloon.test.tsx`

**Interfaces — Produces:**
- `balloonText.ts`: `actionMechanicsText(action: HistoryAction, nameOf, gridKind): string`; `reactionMechanicsText(reaction: HistoryAction, gridKind): string`; `targetResultText(t: ResolutionTarget): { text: string; tone: "success" | "failure" }`; `actorResultText(r: ResolutionPayload): { text: string; tone: "success" | "failure" }`.
- `ActionBalloon({ text, tone }: { text: string; tone: "neutral" | "success" | "failure" })`.
- `useGameTable` devolve `balloons: Array<{ characterId: string; text: string; tone: "neutral" | "success" | "failure" }>` (montado de `openTurn.action`, `openReactions`, `lastSettled`).

- [ ] **Step 1: Testes de `balloonText`:**
  - ataque em dois alvos com arma: `"Ataca A, B · Espada"` (nomes via `nameOf`; arma via `humanWeapon`);
  - só movimento com destino: `"Dash → C4"` (via `formatSlot`); sem `position` (fog): `"Dash"`;
  - interação: `"Abrir"` (via `interactLabel`, capitalizado);
  - reação `closedEscape` com casa: `"Fuga fechada → C5"`; `repel` sem arma visível: `"Repelir"`; `nothing`: `"Nada"`;
  - alvo `avoided` com reação `escape`: `{text: "fugiu", tone: "success"}`; `defended` com `projectedDamage 3` → `{"defendeu · −3", "failure"}`; acertado com 7 → `{"−7", "failure"}`; acertado com 0 → `{"sem dano", "success"}`;
  - ator: 2 de 3 acertados → `{"acertou 2 de 3", "success"}`; 0 → `{"errou", "failure"}`.

- [ ] **Step 2: Rode — falha.**
- [ ] **Step 3: Implemente**
  - **Fantasma:** em `useGameTable.ghosts`, `reactionGhosts = state.openReactions.filter(r => r.move?.position).map(r => ({ from: casa da peça do reator, to: r.move!.position! }))`, incluído no array e nas dependências do `useMemo`. Comentário: §10.2, o mesmo desenho, só a vida diferente.
  - **Balões:** `useGameTable` monta `balloons`: turno aberto → `{actor, actionMechanicsText, "neutral"}` + uma por reação aberta (`reactionMechanicsText`, `"neutral"`); depois do liquidado (`lastSettled`, sem turno aberto) → uma por alvo (`targetResultText`) + a do ator (`actorResultText`). Ação sem alvo personagem (movimento puro) não tem balão de resultado.
  - `ActionBalloon`: balão de mangá (borda arredondada, ponta para baixo via `::after`), cores por `tone` com tokens (neutro: `colors.surfaceInput`; sucesso/fracasso: os tokens de sucesso/erro que já existem em `tokens.ts` — procure `success`/`error`/`danger`; se faltar, acrescente dois tokens), fonte 12px, `max-width: 200px`, `role="status"`.
  - Nas duas páginas, os balões entram no mesmo `MapPieceOverlay` com `placement: "above"`.

- [ ] **Step 4:** testes verdes; `npx tsc -b && npm run lint && npm run test`.
- [ ] **Step 5: Commit** — `feat(combate): balões de mecânica e de resultado, e o fantasma da fuga aberta`

---

### Task 8: botão "Entrar na partida" (spec §4.10, D9)

**Files:**
- Modify: `src/pages/MatchPage.tsx`
- Test: `src/pages/__tests__/MatchPage.test.tsx` (se não existir, crie seguindo o padrão de outro teste de página em `src/pages/__tests__/` — com os hooks de dados mockados)

- [ ] **Step 1: Testes:** com `gameStartAt` e sem `storyEndAt`, o mestre vê "Entrar na partida" e o clique navega para `/campaigns/{campaignId}/matches/{matchId}/game`; um jogador com personagem em `participants` também vê; um usuário sem personagem não vê; partida não iniciada mostra "Abrir Lobby" (mestre) como antes; partida encerrada não mostra.
- [ ] **Step 2: Rode — falha.**
- [ ] **Step 3: Implemente:** `const canEnterGame = status === "ongoing" && (isMaster || participants.some((p) => p.characterSheet.playerUuid === user?.uuid));` (confira o nome real da lista de participantes e do usuário na página). A condição do `BottomActions` passa a incluir `canEnterGame`; o `primaryButton` ganha o ramo `canEnterGame ? { label: "Entrar na partida", onClick: () => navigate(\`/campaigns/${campaignId}/matches/${matchId}/game\`) }` **antes** dos outros (os outros exigem `!gameStartAt`, então não colidem). `manage` continua só para a partida não iniciada.
- [ ] **Step 4:** verde; `npx tsc -b && npm run lint && npm run test`.
- [ ] **Step 5: Commit** — `feat(partida): botão "Entrar na partida" quando ela está em andamento`

---

### Task 9: documentação (spec §1, §9)

**Files:**
- Create: `docs/dev/match/combate-fase-7.md`
- Modify: `CLAUDE.md` (seção "Feature: match combat"), `docs/dev/match/combate-fechamento-fase-6.md` (seção "F14 — onde cai": agora alcançável pela UI)

- [ ] **Step 1:** `combate-fase-7.md`, no molde de `combate-fechamento-fase-6.md`: tabela "o que o usuário vê"; o estado das reações no reducer (§4.2 em prosa curta); a âncora (o emissor no Pixi + `MapPieceOverlay`, e que só o browser prova); o gesto (reuso do `createHoldTracker`); a escolha da casa; consumo e reconciliação; as decisões D1–D9 do spec; "o que não tem teste".
- [ ] **Step 2:** `CLAUDE.md`: acrescente `docs/dev/match/combate-fase-7.md` à frase da seção "Feature: match combat", dizendo em meia linha o que ele cobre.
- [ ] **Step 3: Commit** — `docs(combate): o que a Fase 7 mudou no front`

---

### Task 10: verificação, PR e handoff

- [ ] **Step 1:** `npm run build && npm run lint && npm run test` — verdes; guarde o resumo.
- [ ] **Step 2: Browser, três contas** (spec §7): back em `main` (com o PR #83) e a migração `20261005000000` aplicada no banco de desenvolvimento (`make migrate-up` no repo do back); front desta branch. Roteiro: mestre (`test@`) com uma partida em andamento que tenha mapa, os personagens dos dois jogadores (`test2@`, `test3@`) e um NPC no mapa; mestre age pelo NPC atacando em área os três alvos (os dois personagens e um segundo NPC — ou o próprio, se só houver um); jogador 1 clica Esquivar; jogador 2 clica Escapar e toca uma casa; mestre segura Esquivar no NPC alvo, liga Evasão, envia; o mestre abre as reações numa ordem, anota o cálculo, fecha; repete a rodada abrindo na ordem inversa e confere que o resultado na tela muda; recarrega cada tela no meio de um turno com reações; confere balões, fantasma, "aguardando o mestre", "Entrar na partida". Desktop e 390 px. Use as abas já logadas se existirem (memória do projeto); se não houver como logar/montar o cenário, registre o que não foi verificado.
- [ ] **Step 3: PR** com `gh pr create` (corpo em PT-BR: o que entrou, o que foi verificado, o que não foi, as decisões D1–D9 para o dono do produto olhar; cross-link com o PR #83 do back), terminando com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- [ ] **Step 4: Handoff:** se sobrou algo não verificado, `./dev-checkout.sh feat/combat-phase-7-reactions` a partir de `System_X_System_Project/` — conferindo antes as regras da memória `project_dev_checkout_conflicts_with_parallel_sessions` — e diga no PR o que olhar.
