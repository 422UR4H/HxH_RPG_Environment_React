# Fechamento da Fase 6 no front — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** fazer o front da partida mostrar o que o back já produz e o que o PR de back paralelo
passa a produzir — itens F1–F8 e F10–F16 do §6A.6 do documento mestre.

**Architecture:** a da Fase 6 continua (um socket, `combatReducer` puro, `useMatchCombat`,
`useGameTable`, páginas orquestradoras). Duas regras novas: **o WS avisa, o REST busca**
(`turn_closed`/`npc_added`/`match_full_state` viram invalidação de query em `useGameTable`), e
**eventos carimbados com a hora do servidor** (envelope `timestamp`), para intercalar REST e WS.

**Tech Stack:** React 19 + TS strict (`verbatimModuleSyntax`), styled-components, TanStack
Query, vitest + Testing Library + MSW, Pixi (sem teste — só browser).

**Spec:** `docs/superpowers/specs/2026-09-27-front-combat-phase-6-closure-design.md` — leia
antes de qualquer tarefa. Documento mestre: `System_X_System/docs/superpowers/specs/2026-09-20-front-combat-phases.md`
(§6A), versão do PR #80.

## Global Constraints

- Wire em camelCase, sem conversão. Tipos em `src/types/` são 1:1 com o contrato.
- `import type` para imports só de tipo (`verbatimModuleSyntax`). `noUnusedLocals`/`noUnusedParameters` ligados.
- Sem hex/rgba cru fora da zona pixel-tuned: cor nova = token novo em `src/styles/tokens.ts`.
- Não tocar em `CharacterSheetHeader.tsx`, `MentalsDiagram.tsx`, `PhysicalsDiagram.tsx`, `NenPrinciplesDiagram.tsx` (zona pixel-tuned).
- Breakpoints só pelos nomes de `src/styles/breakpoints.ts` (`media.phone|tabletUp|railUp|asideUp`).
- Nenhum componente abaixo das páginas pergunta "sou mestre?" (I2): a página escolhe o que montar.
- Erros de REST por `getApiErrorDetail(err)` (`src/utils/apiError.ts`); erros de WS pelo banner existente (`MatchErrorBanner` + `combatErrorText`).
- Texto de UI em PT-BR. Comentários só para "por quê" não óbvio, em PT-BR, como o código ao redor.
- **Nunca remover comentários `TODO`.**
- Comandos: `npm run test -- <arquivo>` (vitest), `npm run lint`, `npm run build` (tsc + vite).
- Commits: `feat(combate): …` / `fix(combate): …` / `docs(combate): …`, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Parte B (T13–T19) só depois do merge do PR de back.** Cada tarefa da Parte B começa pelo passo "Ler o contrato"; se o que está no disco divergir do que a tarefa assume, **pare e reporte** — não invente campo.

## Review Focus

1. **Histórico com fetch em voo durante um `turn_closed`** — o fetch que começou antes da mensagem não pode derrubar a linha ao vivo (senão o turno some da tela até o próximo fechamento). Testado em T11 (`historyRows`: "fetch anterior não derruba").
2. **Reconexão depois de levar dano offline** — o HP mostrado não pode ficar no valor ao vivo velho. Testado em T2 (reducer zera `hp`) e T3 (`onFullState` dispara).
3. **`npc_added` para um NPC que já estava na lista, ou peça de não-participante que nunca vira participante** — nada de laço de refetch. Testado em T6 (uma vez por `characterId`).
4. **Jogador com a faixa de barras aberta** — nenhuma velocidade que não seja de `bars_updated` (I8). Testado em T12 (a faixa só recebe `bars`).
5. **Declarada perdida com rascunho novo em andamento** — o rascunho do jogador não é atropelado. Testado em T14.

---

## Preparação (o controlador faz, antes da T1)

- [ ] **P1: tipo de agente implementador.** Criar `.claude/agents/implementer.md` no repo do front:

```markdown
---
name: implementer
description: Implementa UMA tarefa do plano do fechamento da Fase 6 no front (System_X_System_React), com TDD, e reporta o que fez.
model: sonnet
effort: medium
---

Você implementa exatamente uma tarefa de um plano em `docs/superpowers/plans/`. Leia a tarefa
inteira, o spec que o plano cita e os arquivos listados antes de editar. Siga TDD: teste
falhando, código mínimo, teste passando. Rode `npm run test -- <arquivos da tarefa>` e
`npm run lint`. Não toque em arquivo fora da lista da tarefa sem dizer por quê no relatório.
Commit ao fim, com a mensagem da tarefa. Relate: o que mudou, a saída dos testes, e qualquer
desvio do plano.
```

  Se o tipo `implementer` não aparecer na lista de agentes da sessão (tipos são lidos ao iniciar
  a sessão), despache `general-purpose` com `model: "sonnet"` e o mesmo texto no prompt.
  Tarefas marcadas **opus** (T11, T17) vão com `model: "opus"`.

- [ ] **P2: confirmar a base.** `git -C System_X_System_React status` limpo, branch
  `feat/combat-phase-6-closure`. `npm run test` verde antes de começar (anotar a contagem).

---

# PARTE A — começa já

### Task 1: O fio — hora do servidor, `npc_added`, `add_npc`, `change_scene`

**Files:**
- Modify: `src/hooks/useMatchWs.ts`
- Modify: `src/features/match/combat/combatMessages.ts`
- Modify: `src/features/match/combat/combatErrorMessages.ts`
- Modify: `src/test/fakeWebSocket.ts`
- Test: `src/hooks/__tests__/useMatchWs.test.ts`

**Interfaces:**
- Produces:
  - `useMatchWs` option `onCombatMessage?: (msg: CombatServerMessage, serverAt?: number) => void` — `serverAt` = `Date.parse(envelope.timestamp)` quando o envelope traz `timestamp` válido, senão `undefined`.
  - `useMatchWs` option `onNpcAdded?: (characterId: string) => void`.
  - `useMatchWs` retorna também `sendAddNpc(characterSheetUuid: string): boolean` e `sendChangeScene(payload: ChangeScenePayload): boolean`.
  - `combatMessages.ts`: `export type ChangeScenePayload = { category: SceneCategory; briefInitialDescription: string };`
  - `FakeWS.emit(type, payload, envelope?: Record<string, unknown>)`.

- [ ] **Step 1: estender o socket falso**

Em `src/test/fakeWebSocket.ts`, trocar `emit`:

```ts
  emit(type: string, payload: unknown, envelope: Record<string, unknown> = {}) {
    this.onmessage?.({ data: JSON.stringify({ type, payload, ...envelope }) } as MessageEvent);
  }
```

- [ ] **Step 2: testes que falham**

Acrescentar a `src/hooks/__tests__/useMatchWs.test.ts` (reusar o `mount`/helpers já existentes no
arquivo — leia o topo dele; o padrão é `renderHook(() => useMatchWs({...}))` + `flushConnect()`):

```ts
describe("useMatchWs — fechamento da Fase 6", () => {
  it("repassa a hora do servidor do envelope junto com a mensagem de combate", () => {
    const onCombatMessage = vi.fn();
    const { ws } = mount({ onCombatMessage });
    act(() => {
      ws.emit("turn_closed", { turnId: "t1" }, { timestamp: "2026-09-20T16:44:00Z" });
    });
    expect(onCombatMessage).toHaveBeenCalledWith(
      { type: "turn_closed", payload: { turnId: "t1" } },
      Date.parse("2026-09-20T16:44:00Z"),
    );
  });

  it("sem timestamp no envelope, serverAt é undefined", () => {
    const onCombatMessage = vi.fn();
    const { ws } = mount({ onCombatMessage });
    act(() => { ws.emit("turn_closed", { turnId: "t1" }); });
    expect(onCombatMessage).toHaveBeenCalledWith({ type: "turn_closed", payload: { turnId: "t1" } }, undefined);
  });

  it("npc_added chama onNpcAdded com o characterId", () => {
    const onNpcAdded = vi.fn();
    const { ws } = mount({ onNpcAdded });
    act(() => { ws.emit("npc_added", { characterId: "npc-1" }); });
    expect(onNpcAdded).toHaveBeenCalledWith("npc-1");
  });

  it("sendAddNpc e sendChangeScene mandam o formato do contrato", () => {
    const { result, ws } = mount({});
    act(() => {
      result.current.sendAddNpc("npc-9");
      result.current.sendChangeScene({ category: "battle", briefInitialDescription: "Arena" });
    });
    expect(ws.sent("add_npc")).toEqual([{ characterSheetUuid: "npc-9" }]);
    expect(ws.sent("change_scene")).toEqual([{ category: "battle", briefInitialDescription: "Arena" }]);
  });
});
```

Se o `mount` do arquivo tiver outro nome/assinatura, adapte a chamada — não o teste.

- [ ] **Step 3: rodar e ver falhar**

Run: `npm run test -- src/hooks/__tests__/useMatchWs.test.ts`
Expected: FAIL (segundo argumento ausente; `onNpcAdded`/`sendAddNpc` inexistentes).

- [ ] **Step 4: implementar**

`combatMessages.ts`, junto de `ScenePayload`:

```ts
/** `change_scene` (c→s). `category` minúscula, validada no servidor (contrato). */
export type ChangeScenePayload = { category: SceneCategory; briefInitialDescription: string };
```

`useMatchWs.ts`:
1. Em `UseMatchWsOptions`: `onCombatMessage?: (msg: CombatServerMessage, serverAt?: number) => void;` e
   ```ts
   /** `npc_added` (s→c, mesa inteira): o WS avisa, quem tem permissão rebusca por REST. */
   onNpcAdded?: (characterId: string) => void;
   ```
   Desestruturar `onNpcAdded`, criar `onNpcAddedRef` como os outros refs.
2. No `onmessage`, trocar o parse para `const msg = JSON.parse(event.data as string) as { type: string; payload: unknown; timestamp?: string };`
   e, antes do `if (msg.type === "lobby_not_open")`, calcular:
   ```ts
   const parsedAt = msg.timestamp ? Date.parse(msg.timestamp) : NaN;
   const serverAt = Number.isNaN(parsedAt) ? undefined : parsedAt;
   ```
3. No ramo `COMBAT_TYPES`: `onCombatMessageRef.current?.(normalizeCombatMessage(msg), serverAt);`
4. Novo ramo, antes de `COMBAT_TYPES`:
   ```ts
   } else if (msg.type === "npc_added") {
     const p = msg.payload as { characterId?: string };
     if (p.characterId) onNpcAddedRef.current?.(p.characterId);
   ```
5. Verbos, junto de `sendChangeRoundMode`:
   ```ts
   const sendAddNpc = useCallback(
     (characterSheetUuid: string) => sendRaw("add_npc", { characterSheetUuid }),
     [sendRaw],
   );
   const sendChangeScene = useCallback(
     (payload: ChangeScenePayload) => sendRaw("change_scene", payload),
     [sendRaw],
   );
   ```
   e acrescentar os dois ao objeto retornado. `import type { ChangeScenePayload }` de `combatMessages`.
6. `normalizeCombatMessage(msg)` recebe `{ type, payload }`; passar `msg` como está funciona (o campo extra é ignorado).

`combatErrorMessages.ts` — em `byCode` acrescentar:
```ts
  not_found: "Não encontrado.",
  invalid_npc: "Esse personagem não pode entrar como NPC desta partida.",
```
e em `bySentType`:
```ts
  change_scene: "Não foi possível trocar de cena",
  add_npc: "Não foi possível pôr o NPC na partida",
```

- [ ] **Step 5: rodar e ver passar**

Run: `npm run test -- src/hooks/__tests__/useMatchWs.test.ts src/features/match/combat`
Expected: PASS (inclusive os testes antigos).

- [ ] **Step 6: commit**

```bash
git add src/hooks/useMatchWs.ts src/features/match/combat/combatMessages.ts src/features/match/combat/combatErrorMessages.ts src/test/fakeWebSocket.ts src/hooks/__tests__/useMatchWs.test.ts
git commit -m "feat(combate): hora do servidor no fio, npc_added, add_npc e change_scene"
```

---

### Task 2: O reducer — hora dos eventos, resolução aberta, HP que recomeça na reconexão

**Files:**
- Modify: `src/features/match/combat/combatMessages.ts`
- Modify: `src/features/match/combat/combatReducer.ts`
- Test: `src/features/match/combat/__tests__/combatReducer.test.ts`

**Interfaces:**
- Consumes: T1 (nenhum símbolo; só o fio).
- Produces:
  - `ResolutionPayload` completo (tipos abaixo), `ReactionResult`, `Payout`, `ResolutionError`.
  - Toda variante de servidor em `CombatAction` aceita `at?: number` (hora do servidor, ms) e `receivedAt?: number` (hora local, ms).
  - `TableEvent` ganha `receivedAt: number` em todas as variantes; `at` passa a ser a hora do servidor quando houver (senão `Date.now()`).
  - `CombatState.openResolution: ResolutionPayload | null`.
  - `CombatState.openQueued: QueuedAction | null` — a linha da fila que o `turn_opened` tirou (a ação em andamento continua visível no card da Fila, F7).
  - `match_full_state` zera `state.hp`.

- [ ] **Step 1: tipos da resolução**

Em `combatMessages.ts`, substituir o bloco `ResolutionPayload` por:

```ts
export type ReactionResult = {
  kind: string;
  total: number;
  reactionId: string;
  /** Só num aparo. snake_case: valor de enum do domínio. */
  rung?: "great_success" | "success" | "near_miss" | "failure";
  margin: number;
  difference: number;
  stopsAttack: boolean;
};

export type Payout = {
  amount: number;
  bias: number;
  applies: string;
  source: string;
  againstKind: string;
  againstId: string;
  expiresAt: string;
  /** Texto para humano. Não parseie. */
  reason: string;
};

/** Falta do MOTOR ao calcular — não é erro da operação. Master-only. */
export type ResolutionError = { subject: string; kind: string; detail: string };

export type ResolutionTarget = {
  targetId: string;
  avoided: boolean;
  defended: boolean;
  dodgeTotal: number;
  defenseTotal: number;
  rawDamage: number;
  defenseApplied: number;
  projectedDamage: number;
  reaction?: ReactionResult;
  payouts?: Payout[];
};

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
  targets: ResolutionTarget[];
  pendingReactions?: PendingReaction[];
  errors?: ResolutionError[];
};
```

Atenção: testes antigos que montam `targets` com só cinco campos vão reclamar no `tsc`. Onde
isso acontecer nos testes, acrescente `dodgeTotal: 0, defenseTotal: 0, defenseApplied: 0`.

- [ ] **Step 2: testes que falham**

Acrescentar a `combatReducer.test.ts`:

```ts
const unsettled = (turnId: string): ResolutionPayload => ({
  turnId, isSettled: false, targets: [],
  action: { skillName: "Accuracy", skillValue: 14, diceRolled: [6, 8], total: 20, isCritical: false, isCriticalFailure: false },
});

describe("combatReducer — hora dos eventos", () => {
  it("usa a hora do servidor em `at` e a local em `receivedAt`", () => {
    const s = run([{ type: "round_closed", payload: { roundMode: "Race" }, at: 1000, receivedAt: 5000 }]);
    expect(s.events[0]).toMatchObject({ kind: "round_closed", at: 1000, receivedAt: 5000 });
  });
});

describe("combatReducer — resolução do turno aberto (F7)", () => {
  it("guarda a resolução não liquidada do turno aberto", () => {
    const s = run([opened("t1", "a1"), { type: "resolution_updated", payload: unsettled("t1") }]);
    expect(s.openResolution?.turnId).toBe("t1");
  });

  it("ignora resolução não liquidada de outro turno", () => {
    const s = run([opened("t1", "a1"), { type: "resolution_updated", payload: unsettled("t0") }]);
    expect(s.openResolution).toBeNull();
  });

  it("limpa no turn_closed do mesmo turno e no round_closed", () => {
    const a = run([opened("t1", "a1"), { type: "resolution_updated", payload: unsettled("t1") }, closed("t1")]);
    expect(a.openResolution).toBeNull();
    const b = run([opened("t1", "a1"), { type: "resolution_updated", payload: unsettled("t1") }, { type: "round_closed", payload: { roundMode: "Race" } }]);
    expect(b.openResolution).toBeNull();
  });

  it("match_full_state traz a resolução — ou a limpa quando ausente", () => {
    const withRes = run([{ type: "match_full_state", payload: { roundMode: "Race", openTurn: { turnId: "t1", actorId: "c1" }, resolution: unsettled("t1") } }]);
    expect(withRes.openResolution?.turnId).toBe("t1");
    const without = run([{ type: "match_full_state", payload: { roundMode: "Race" } }], withRes);
    expect(without.openResolution).toBeNull();
  });
});

describe("combatReducer — a ação em andamento continua na Fila (F7)", () => {
  const queued = (actionId: string): CombatAction => ({ type: "action_queued", payload: { actionId, actorId: "c1", bars: ["action"] } });

  it("turn_opened guarda a linha que saiu da fila", () => {
    const s = run([queued("a1"), opened("t1", "a1")]);
    expect(s.queue).toHaveLength(0);
    expect(s.openQueued).toMatchObject({ actionId: "a1", actorId: "c1" });
  });

  it("limpa no turn_closed do turno, no round_closed e no match_full_state", () => {
    expect(run([queued("a1"), opened("t1", "a1"), closed("t1")]).openQueued).toBeNull();
    expect(run([queued("a1"), opened("t1", "a1"), { type: "round_closed", payload: { roundMode: "Race" } }]).openQueued).toBeNull();
    expect(run([queued("a1"), opened("t1", "a1"), { type: "match_full_state", payload: { roundMode: "Race" } }]).openQueued).toBeNull();
  });

  it("turn_opened de ação que não estava na fila deixa openQueued nulo", () => {
    expect(run([opened("t1", "a9")]).openQueued).toBeNull();
  });
});

describe("combatReducer — HP na reconexão", () => {
  it("match_full_state zera o HP ao vivo (o REST rebuscado vira a base)", () => {
    const s = run([
      { type: "character_hp_changed", payload: { characterId: "c1", hp: 80, maxHp: 100, damage: 20 } },
      { type: "match_full_state", payload: { roundMode: "Race" } },
    ]);
    expect(s.hp).toEqual({});
  });
});
```

(`import type { ResolutionPayload } from "../combatMessages";` no topo.)

- [ ] **Step 3: rodar e ver falhar**

Run: `npm run test -- src/features/match/combat/__tests__/combatReducer.test.ts`
Expected: FAIL.

- [ ] **Step 4: implementar**

Em `combatReducer.ts`:

1. Tipo auxiliar e `CombatAction`:
   ```ts
   /** Carimbo de chegada: `at` é a hora do SERVIDOR (envelope), `receivedAt` a local. */
   type Stamp = { at?: number; receivedAt?: number };
   ```
   Cada variante de servidor de `CombatAction` vira `({ type: "x"; payload: X } & Stamp)`. As
   variantes locais (`ACTION_SENT`, etc.) não mudam.
2. `TableEvent`: acrescentar `receivedAt: number` a **todas** as variantes.
3. Helper:
   ```ts
   function stampOf(action: Stamp): { at: number; receivedAt: number } {
     const receivedAt = action.receivedAt ?? Date.now();
     return { at: action.at ?? receivedAt, receivedAt };
   }
   ```
   Em todo `push(state.events, { kind: ..., at: Date.now(), ... })`, trocar `at: Date.now()`
   por `...stampOf(action)` (há seis: `turn_opened`, `turn_closed`, `resolution_updated`,
   `character_hp_changed`, `round_closed`, `round_mode_changed`, `scene_changed`). Dentro de
   `case`, `action` já está estreitado; `stampOf(action)` aceita porque toda variante de
   servidor tem `Stamp`.
4. `CombatState`: `openResolution: ResolutionPayload | null;` e `openQueued: QueuedAction | null;`; `initialCombatState` com os dois `null`.
   No `turn_opened`: `openQueued: state.queue.find((q) => q.actionId === actionId) ?? null,` (antes do filtro que tira a ação da fila). Limpar `openQueued` onde se limpa `openResolution` (itens 7 e 8 abaixo) e no `match_full_state` (`openQueued: null` — a linha não volta na reconexão; o card em andamento usa o `openTurn`).
5. `match_full_state`: acrescentar ao objeto retornado
   ```ts
        openResolution: p.resolution && !p.resolution.isSettled ? p.resolution : null,
        // Um character_hp_changed perdido na queda não volta: o REST rebuscado é a base.
        hp: {},
   ```
6. `resolution_updated`: no começo do case,
   ```ts
      if (!action.payload.isSettled) {
        return state.openTurn?.turnId === action.payload.turnId
          ? { ...state, openResolution: action.payload }
          : state;
      }
   ```
   (substitui o `if (!action.payload.isSettled) return state;`).
7. `turn_closed`: `openResolution: state.openResolution?.turnId === turnId ? null : state.openResolution,` e `openQueued: state.openTurn?.turnId === turnId ? null : state.openQueued,`
8. `round_closed`: `openResolution: null, openQueued: null,`

- [ ] **Step 5: rodar e ver passar**

Run: `npm run test -- src/features/match/combat && npx tsc -b --noEmit`
Expected: PASS; tsc sem erro (ajuste fixtures de teste que montam `TableEvent`/`targets` à mão
acrescentando os campos novos).

- [ ] **Step 6: commit**

```bash
git add src/features/match/combat/combatMessages.ts src/features/match/combat/combatReducer.ts src/features/match/combat/__tests__
git commit -m "feat(combate): eventos com hora do servidor, resolução do turno aberto e HP que recomeça na reconexão"
```

---

### Task 3: `useMatchCombat` e `useGameTable` — carimbo, verbos e "o WS avisa, o REST busca"

**Files:**
- Modify: `src/features/match/combat/useMatchCombat.ts`
- Modify: `src/features/match/combat/useGameTable.ts`
- Modify: `src/test/handlers.ts`
- Test: `src/features/match/combat/__tests__/useMatchCombat.test.ts`

**Interfaces:**
- Consumes: T1 (`serverAt`, `onNpcAdded`, `sendAddNpc`, `sendChangeScene`), T2 (`Stamp`).
- Produces:
  - `useMatchCombat` options: `onTurnClosed?: () => void`, `onFullState?: () => void`, `onNpcAdded?: (characterId: string) => void`.
  - `useMatchCombat().send.addNpc(characterSheetUuid: string): boolean`, `send.changeScene(p: ChangeScenePayload): boolean`.
  - `useGameTable` invalida `["matchParticipants", token, matchId]` em `onNpcAdded` e `onFullState`; `["matchHistory", token, matchId]` em `onTurnClosed` e `onFullState`; `["characterSheet", token]` (prefixo) em `onFullState`.
  - `useGameTable` passa a retornar também `refetchParticipants: () => void`.
  - Handler MSW padrão `GET /matches/:id/history` → `{ scenes: [] }`.

- [ ] **Step 1: testes que falham**

Em `useMatchCombat.test.ts`:

```ts
describe("useMatchCombat — avisos para o REST", () => {
  it("carimba a hora do servidor e a local nos eventos", () => {
    vi.setSystemTime(new Date("2026-09-27T10:00:00Z"));
    const { result, ws } = mount();
    act(() => { ws.emit("round_closed", { roundMode: "Race" }, { timestamp: "2026-09-27T09:59:58Z" }); });
    expect(result.current.state.events[0]).toMatchObject({
      at: Date.parse("2026-09-27T09:59:58Z"),
      receivedAt: Date.parse("2026-09-27T10:00:00Z"),
    });
  });

  it("chama onTurnClosed, onFullState e onNpcAdded", () => {
    const onTurnClosed = vi.fn();
    const onFullState = vi.fn();
    const onNpcAdded = vi.fn();
    const { ws } = mount({ onTurnClosed, onFullState, onNpcAdded });
    act(() => {
      ws.emit("turn_closed", { turnId: "t1" });
      ws.emit("match_full_state", { roundMode: "Race", bars: { seq: 1, prices: {}, characters: [], order: [] } });
      ws.emit("npc_added", { characterId: "npc-1" });
    });
    expect(onTurnClosed).toHaveBeenCalledTimes(1);
    expect(onFullState).toHaveBeenCalledTimes(1);
    expect(onNpcAdded).toHaveBeenCalledWith("npc-1");
  });

  it("expõe addNpc e changeScene", () => {
    const { result, ws } = mount({ isMaster: true });
    act(() => {
      result.current.send.addNpc("npc-2");
      result.current.send.changeScene({ category: "roleplay", briefInitialDescription: "" });
    });
    expect(ws.sent("add_npc")).toEqual([{ characterSheetUuid: "npc-2" }]);
    expect(ws.sent("change_scene")).toEqual([{ category: "roleplay", briefInitialDescription: "" }]);
  });
});
```

- [ ] **Step 2: rodar e ver falhar**

Run: `npm run test -- src/features/match/combat/__tests__/useMatchCombat.test.ts`
Expected: FAIL.

- [ ] **Step 3: implementar `useMatchCombat`**

1. `Options` ganha:
   ```ts
  /** O WS avisa, o REST busca: a página (useGameTable) invalida as queries. */
  onTurnClosed?: () => void;
  onFullState?: () => void;
  onNpcAdded?: (characterId: string) => void;
   ```
   Guardar os três em refs (mesmo padrão de `onAcceptedRef`).
2. `onCombatMessage: (msg, serverAt) => { ... dispatch({ ...msg, at: serverAt, receivedAt: Date.now() } as CombatAction); ... if (msg.type === "turn_closed") onTurnClosedRef.current?.(); if (msg.type === "match_full_state") onFullStateRef.current?.(); }` (o `dispatch` antes dos avisos; `import type { CombatAction }`).
3. Passar `onNpcAdded: (id) => onNpcAddedRef.current?.(id)` ao `useMatchWs`.
4. `send` ganha `addNpc: ws.sendAddNpc, changeScene: ws.sendChangeScene`.

- [ ] **Step 4: implementar `useGameTable`**

```ts
import { useQueryClient } from "@tanstack/react-query";
// …
  const queryClient = useQueryClient();
  const refetchParticipants = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["matchParticipants", token, matchId] }),
    [queryClient, token, matchId],
  );
```

e no `useMatchCombat({...})`:

```ts
    onTurnClosed: () => queryClient.invalidateQueries({ queryKey: ["matchHistory", token, matchId] }),
    onNpcAdded: () => { void refetchParticipants(); },
    // Toda (re)conexão: o que mudou enquanto a conexão estava caída só volta pelo REST.
    onFullState: () => {
      void refetchParticipants();
      void queryClient.invalidateQueries({ queryKey: ["matchHistory", token, matchId] });
      void queryClient.invalidateQueries({ queryKey: ["characterSheet", token] });
    },
```

Acrescentar `refetchParticipants` ao retorno.

- [ ] **Step 5: handler MSW padrão**

Em `src/test/handlers.ts`, junto do handler de `participants`:

```ts
  http.get(`${baseUrl}/matches/:id/history`, () => HttpResponse.json({ scenes: [] })),
```

(usar a mesma variável de base URL que os handlers vizinhos usam.)

- [ ] **Step 6: rodar tudo**

Run: `npm run test`
Expected: PASS em tudo (as páginas ainda não buscam histórico, mas o handler não atrapalha).

- [ ] **Step 7: commit**

```bash
git add src/features/match/combat/useMatchCombat.ts src/features/match/combat/useGameTable.ts src/test/handlers.ts src/features/match/combat/__tests__/useMatchCombat.test.ts
git commit -m "feat(combate): o WS avisa, o REST busca — participantes, histórico e ficha rebuscados"
```

---

### Task 4: F11 — selecionar uma peça não troca a aba da direita

**Files:**
- Modify: `src/pages/GameMasterPage.tsx`
- Modify: `src/features/match/combat/AsideTabs.tsx`
- Test: `src/pages/__tests__/GameMasterPage.test.tsx`

**Interfaces:**
- Produces: `AsideTabs` volta a ter só `{ defaultTab, historico, personagens }`.

- [ ] **Step 1: teste que falha**

Em `GameMasterPage.test.tsx` há um teste da Fase 6 que afirma que inspecionar força a aba
Personagens (procure por `personagens`/`inspected`). **Inverta-o**:

```ts
  it("F11: inspecionar uma peça que o mestre não controla não troca a aba da direita", async () => {
    // mesmo arranjo do teste de inspeção existente (mestre, sem ator, clica na peça de um jogador)
    // …
    await user.click(await screen.findByTestId("select-actor-c1"));
    expect(screen.getByRole("button", { name: "Histórico", pressed: true })).toBeInTheDocument();
    expect(screen.getByTestId("map-stub")).toHaveAttribute("data-inspected-piece-id", /* id da peça de c1 no fixture */ expect.any(String));
  });
```

Use o arranjo (renderização, socket, fixtures) do teste que está sendo invertido — copie-o, não
reinvente. O botão da aba se chama "Histórico" (`AsideTabs`); o da topbar tem `aria-label`
"Ocultar histórico"/"Ver histórico", então `name: "Histórico"` casa só a aba.

- [ ] **Step 2: rodar e ver falhar**

Run: `npm run test -- src/pages/__tests__/GameMasterPage.test.tsx`
Expected: FAIL (a aba pula para Personagens).

- [ ] **Step 3: implementar**

`GameMasterPage.tsx`:
- Remover `const [asideTab, setAsideTab] = useState<AsideTab>("historico");` e o `import type { AsideTab }`.
- Em `handlePieceTap`, o ramo final vira só `setInspectedId(charId);` (saem `setAsideTab` e `setAsideOpen(true)`). Tirar `setAsideOpen` das dependências se sobrar sem uso ali.
- `<AsideTabs defaultTab="historico" historico={…} personagens={…} />` — sem `tab`/`onTabChange`.
- O `useEffect` de `scrollIntoView` continua (só age se o card estiver no DOM, isto é, se a aba Personagens estiver aberta).

`AsideTabs.tsx`: remover `tab`, `onTabChange`, `controlledTab`; `selectTab` vira `setInternalTab`.
Atualizar o comentário do componente (tirar o parágrafo do modo controlado).

- [ ] **Step 4: rodar**

Run: `npm run test -- src/pages src/features/match/combat`
Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add src/pages/GameMasterPage.tsx src/features/match/combat/AsideTabs.tsx src/pages/__tests__/GameMasterPage.test.tsx
git commit -m "fix(combate): inspecionar uma peça não troca a aba da direita (F11)"
```

---

### Task 5: F5 — os cards usam o dado público

**Files:**
- Create: `src/features/match/sidebarCharacter.ts`
- Modify: `src/features/match/MatchCharactersSidebar.tsx`
- Test: `src/features/match/__tests__/sidebarCharacter.test.ts` (criar a pasta)
- Test: `src/pages/__tests__/GamePlayerPage.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export type SidebarCharacter = Parameters<typeof CharacterSidebarItem>[0]["character"];
  export function toSidebarCharacter(sheet: CharacterSheetWithVisibility | CharacterPrivateSummary): SidebarCharacter;
  ```
  `MatchCharactersSidebar` ganha prop opcional `ownPlayerUuid?: string` (o card de quem tem esse `playerUuid` é clicável).

- [ ] **Step 1: teste do adaptador**

```ts
import { describe, it, expect } from "vitest";
import { toSidebarCharacter } from "../sidebarCharacter";

const base = {
  uuid: "c1", nickName: "Gon", avatarUrl: "a.png", coverUrl: "c.png", deadAt: "2026-01-01",
  createdAt: "", updatedAt: "",
};

describe("toSidebarCharacter", () => {
  it("participante sem private: a base inteira, sem vida", () => {
    const c = toSidebarCharacter({ ...base, playerUuid: "u2" });
    expect(c).toMatchObject({ uuid: "c1", nickName: "Gon", avatarUrl: "a.png", coverUrl: "c.png", deadAt: "2026-01-01", playerUuid: "u2" });
    expect(c.health).toBeUndefined();
  });

  it("participante com private: mescla", () => {
    const health = { min: 0, current: 50, max: 100 };
    const stamina = { min: 0, current: 10, max: 10 };
    const c = toSidebarCharacter({ ...base, private: { fullName: "Gon Freecss", health, stamina, level: 3 } as never });
    expect(c).toMatchObject({ fullName: "Gon Freecss", health, level: 3, nickName: "Gon" });
  });

  it("CharacterPrivateSummary plano passa como está", () => {
    const health = { min: 0, current: 5, max: 9 };
    const c = toSidebarCharacter({ ...base, health, stamina: health, fullName: "X" } as never);
    expect(c.health).toEqual(health);
  });
});
```

- [ ] **Step 2: rodar e ver falhar**

Run: `npm run test -- src/features/match/__tests__/sidebarCharacter.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: implementar o adaptador**

`src/features/match/sidebarCharacter.ts`:

```ts
import type CharacterSidebarItem from "../../components/molecules/CharacterSidebarItem";
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import type { CharacterSheetWithVisibility } from "../../types/match";

export type SidebarCharacter = Parameters<typeof CharacterSidebarItem>[0]["character"];

/**
 * Os dois formatos que chegam ao card (participante `{...base, private}` e o plano
 * `CharacterPrivateSummary` da campanha) viram um só. A base é pública — cor de NPC, de
 * morto, avatar e capa saem dela — e o `private` entra quando o servidor o mandou.
 */
export function toSidebarCharacter(
  sheet: CharacterSheetWithVisibility | CharacterPrivateSummary,
): SidebarCharacter {
  if ("private" in sheet) {
    const { private: priv, ...rest } = sheet;
    return { ...rest, ...(priv ?? {}) };
  }
  return sheet;
}
```

(`import type CharacterSidebarItem from` é válido para um default export usado só em
`typeof`. Se o `tsc` reclamar, troque por `import CharacterSidebarItem from` e use
`React.ComponentProps<typeof CharacterSidebarItem>["character"]` com `import type { ComponentProps } from "react"`.)

- [ ] **Step 4: `MatchCharactersSidebar` sempre renderiza o card**

No ramo `gameStarted`:

```tsx
      renderItem={(participant) => (
        <CharacterSidebarItem
          key={participant.uuid}
          character={toSidebarCharacter(participant.characterSheet)}
          isMaster={isMaster}
          isOwn={!!ownPlayerUuid && participant.characterSheet.playerUuid === ownPlayerUuid}
          hasLeft={!!participant.leftAt}
          onClick={() => onSelectCharacterSheet(participant.characterSheet.uuid)}
        />
      )}
```

Acrescentar `ownPlayerUuid?: string` às props. Remover `BasicParticipantItem`, `LeftBadge`, o
import de `styled`, `colors`, `fonts` e de `CharacterPrivateSummary` se ficarem sem uso.

- [ ] **Step 5: teste de página**

Em `GamePlayerPage.test.tsx`, um teste: com um participante **sem** `private` e com
`avatarUrl`, abrir a aba Personagens e verificar que existe `character-row-<uuid>` (o card, que
tem esse `data-testid`) e o selo "NPC" para um participante sem `playerUuid`. Copie o arranjo
de renderização de um teste existente do arquivo; acrescente ao fixture de participantes um NPC
`{ uuid: "p-npc", joinedAt: "…", characterSheet: { uuid: "npc-1", nickName: "Guarda", masterUuid: "…", createdAt: "", updatedAt: "" } }`.

```ts
    await user.click(screen.getByRole("button", { name: "Personagens" }));
    expect(await screen.findByTestId("character-row-npc-1")).toBeInTheDocument();
    expect(screen.getByText("NPC")).toBeInTheDocument();
```

- [ ] **Step 6: rodar**

Run: `npm run test -- src/features/match src/pages`
Expected: PASS. `MatchPage` (lobby) também usa `MatchCharactersSidebar` — se algum teste dele
dependia do `BasicParticipantItem`, ajuste o seletor para o card.

- [ ] **Step 7: commit**

```bash
git add src/features/match src/pages/__tests__/GamePlayerPage.test.tsx
git commit -m "feat(combate): cards da partida usam o dado público da ficha (F5)"
```

---

### Task 6: F2 — o mestre age por qualquer NPC da partida

**Files:**
- Modify: `src/pages/GameMasterPage.tsx`
- Modify: `src/features/match/combat/MasterControls.tsx`
- Test: `src/pages/__tests__/GameMasterPage.test.tsx`

**Interfaces:**
- Consumes: T3 (`send.addNpc`, `refetchParticipants`, `onNpcAdded` já ligado em `useGameTable`), T5 (`ownPlayerUuid`).
- Produces: `AddNpcPicker` em `MasterControls.tsx`:
  ```ts
  export function AddNpcPicker(props: { candidates: Array<{ id: string; name: string }>; onAdd: (id: string) => void }): JSX.Element | null
  ```

- [ ] **Step 1: testes que falham**

Em `GameMasterPage.test.tsx` (use o arranjo existente: mestre, socket, `campaignWithNpcsApi` —
leia `src/test/fixtures/campaign.ts` para os ids de NPC):

```ts
  it("F2: pôr um NPC da campanha na partida manda add_npc", async () => {
    // arranjo: campanha com um NPC (npcFixture) que NÃO está em participants
    await user.click(screen.getByRole("button", { name: /Agir/ }));
    await user.selectOptions(screen.getByLabelText("Pôr na partida"), npcFixture.uuid);
    await user.click(screen.getByRole("button", { name: "Pôr" }));
    expect(ws.sent("add_npc")).toEqual([{ characterSheetUuid: npcFixture.uuid }]);
  });

  it("F2: npc_added rebusca os participantes", async () => {
    let calls = 0;
    server.use(http.get(`${baseUrl}/matches/:id/participants`, () => {
      calls += 1;
      return HttpResponse.json({ participants: participantsFixture });
    }));
    // renderizar, esperar a primeira busca
    await vi.waitFor(() => expect(calls).toBe(1));
    act(() => { ws.emit("npc_added", { characterId: "npc-x" }); });
    await vi.waitFor(() => expect(calls).toBe(2));
  });

  it("F2: peça de não-participante rebusca uma vez só", async () => {
    // mapa com uma peça de characterId "npc-orfao" que não está em participants
    // → exatamente uma busca a mais, mesmo depois de outro render
  });

  it("F2: npc_already_in_match não aparece como erro", async () => {
    await user.click(screen.getByRole("button", { name: /Agir/ }));
    await user.selectOptions(screen.getByLabelText("Pôr na partida"), npcFixture.uuid);
    await user.click(screen.getByRole("button", { name: "Pôr" }));
    act(() => { ws.emit("error", { code: "npc_already_in_match", message: "npc already in match" }); });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
```

Para o terceiro teste: `mapWithPiecesApi` (em `src/test/fixtures/map.ts`) — monte uma cópia com
uma peça extra `{ id: "p-orfao", characterId: "npc-orfao", coord: { slot: { kind: "square", col: 5, row: 5 }, z: 0 }, visible: true }`
e conte as chamadas como no segundo teste; depois de `await vi.waitFor(() => expect(calls).toBe(2))`,
dispare um re-render (ex.: `ws.emit("bars_updated", …)`) e confirme que `calls` continua 2.

- [ ] **Step 2: rodar e ver falhar**

Run: `npm run test -- src/pages/__tests__/GameMasterPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: `AddNpcPicker`**

Em `MasterControls.tsx`:

```tsx
/**
 * Pôr na partida um NPC da campanha que ainda não está nela (`add_npc`). Ele vira
 * participante quando `npc_added` chegar e o REST for rebuscado.
 */
export function AddNpcPicker({
  candidates,
  onAdd,
}: {
  candidates: Array<{ id: string; name: string }>;
  onAdd: (id: string) => void;
}) {
  const [chosen, setChosen] = useState("");
  if (candidates.length === 0) return null;
  return (
    <Picker>
      <PanelTitle as="label" htmlFor="add-npc-select">Pôr na partida</PanelTitle>
      <AddRow>
        <NpcSelect id="add-npc-select" value={chosen} onChange={(e) => setChosen(e.target.value)}>
          <option value="">Escolha um NPC da campanha</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </NpcSelect>
        <SmallButton type="button" disabled={!chosen} onClick={() => { onAdd(chosen); setChosen(""); }}>
          Pôr
        </SmallButton>
      </AddRow>
    </Picker>
  );
}

const AddRow = styled.div`
  display: flex;
  gap: 6px;
`;

const NpcSelect = styled.select`
  flex: 1;
  min-width: 0;
  background: ${colors.surfaceInput};
  color: ${colors.textPrimary};
  border: 1px solid ${colors.surfaceInputHover};
  border-radius: 6px;
  font-family: ${fonts.sans};
  font-size: 13px;
  padding: 4px 6px;
`;
```

(`import { useState } from "react";`. `Picker`, `PanelTitle`, `SmallButton`, `colors`, `fonts`
já estão no arquivo. Se `PanelTitle` não aceitar `as="label"`, use um `<label>` com o mesmo
estilo via `styled(PanelTitle).attrs({ as: "label" })`.) O texto do `NpcPicker` vazio muda para
"Nenhum NPC nesta partida. Ponha um NPC no mapa ou escolha abaixo."

- [ ] **Step 4: página**

`GameMasterPage.tsx`:
1. Sair: `everyone` (volta a ser `participantsWithLiveHp`), `inspectedIsNotInMatch`, a
   `PanelMessage` "Este personagem não está inscrito…", e o import de `Participant` se sobrar sem uso.
2. Candidatos:
   ```ts
  const participantIds = useMemo(() => new Set(participants.map((p) => p.characterSheet.uuid)), [participants]);
  const npcCandidates = useMemo(
    () =>
      [...live.npcMap.values()]
        .filter((cs) => !cs.playerUuid && !participantIds.has(cs.uuid))
        .map((cs) => ({ id: cs.uuid, name: cs.nickName })),
    [live.npcMap, participantIds],
  );
   ```
3. Rede de segurança (antes de B11 fechar a janela):
   ```ts
  // Peça no tabuleiro de quem não é participante: o servidor inscreve (B11) e avisa com
  // npc_added; se o aviso se perder, rebusca — uma vez por personagem, para não virar laço.
  const refetchedFor = useRef(new Set<string>());
  useEffect(() => {
    const orphan = game.boardPieces.find(
      (p) => p.characterId && !participantIds.has(p.characterId) && !refetchedFor.current.has(p.characterId),
    );
    if (!orphan?.characterId) return;
    refetchedFor.current.add(orphan.characterId);
    void game.refetchParticipants();
  }, [game.boardPieces, participantIds, game]);
   ```
   Isto só roda **depois** que os participantes chegaram: guardar com `if (!participantsLoaded) return;`
   onde `participantsLoaded` vem de `useMatchParticipants(...).isSuccess` — como `useGameTable`
   não expõe isso hoje, acrescente `participantsLoaded: isSuccess` ao retorno de `useGameTable`
   (desestruturar `isSuccess` junto de `data: participants`).
4. `npc_already_in_match` não é erro de tela: no `useEffect` que já não existe — faça no
   `MatchErrorBanner` do mestre um filtro na página:
   ```tsx
            <MatchErrorBanner
              error={state.lastError?.code === "npc_already_in_match" ? null : state.lastError}
              onDismiss={combat.dismissError}
            />
   ```
   e um efeito:
   ```ts
  // npc_already_in_match quer dizer "o NPC está na partida" (contrato, add_npc): só rebusca.
  useEffect(() => {
    if (state.lastError?.code !== "npc_already_in_match") return;
    void game.refetchParticipants();
    combat.dismissError();
  }, [state.lastError, game, combat]);
   ```
5. No painel **Agir**, abaixo do `NpcPicker`:
   `<AddNpcPicker candidates={npcCandidates} onAdd={(id) => combat.send.addNpc(id)} />`
6. `MatchCharactersSidebar` recebe `participants={participantsWithLiveHp}`.

- [ ] **Step 5: rodar**

Run: `npm run test -- src/pages src/features/match`
Expected: PASS. O teste antigo da mensagem "não está inscrito" deve ser removido (o caso deixou
de existir — documento mestre, F2).

- [ ] **Step 6: commit**

```bash
git add src/pages/GameMasterPage.tsx src/features/match/combat/MasterControls.tsx src/features/match/combat/useGameTable.ts src/pages/__tests__/GameMasterPage.test.tsx
git commit -m "feat(combate): o mestre age por qualquer NPC da partida e põe NPC por add_npc (F2)"
```

---

### Task 7: F8 — trocar de cena

**Files:**
- Create: `src/features/match/combat/SceneChangeDialog.tsx`
- Modify: `src/features/match/combat/MasterControls.tsx` (`RegencyControls`)
- Modify: `src/pages/GameMasterPage.tsx`
- Test: `src/pages/__tests__/GameMasterPage.test.tsx`

**Interfaces:**
- Consumes: T3 (`send.changeScene`), T1 (`ChangeScenePayload`).
- Produces: `SceneChangeDialog({ open, onConfirm(p: ChangeScenePayload), onCancel })`; `RegencyControls` ganha `onNewScene: () => void` e `canChangeScene: boolean`.

- [ ] **Step 1: teste que falha**

```ts
  it("F8: nova cena manda change_scene com a categoria minúscula", async () => {
    // arranjo do mestre com socket conectado e match_full_state sem openTurn
    await user.click(screen.getAllByRole("button", { name: "Nova cena" })[0]);
    await user.click(screen.getByRole("radio", { name: "Interpretação" }));
    await user.type(screen.getByLabelText("Descrição inicial"), "Taverna");
    await user.click(screen.getByRole("button", { name: "Trocar de cena" }));
    expect(ws.sent("change_scene")).toEqual([{ category: "roleplay", briefInitialDescription: "Taverna" }]);
  });

  it("F8: com turno aberto, Nova cena fica desabilitado", async () => {
    act(() => { ws.emit("turn_opened", { turnId: "t1", actorId: "c1", actionId: "a1", actionType: "" }); });
    for (const b of screen.getAllByRole("button", { name: "Nova cena" })) expect(b).toBeDisabled();
  });
```

(`getAllByRole`: no teste o jsdom não aplica media query, então o botão pode existir na topbar e
no painel da fila.)

- [ ] **Step 2: rodar e ver falhar** — `npm run test -- src/pages/__tests__/GameMasterPage.test.tsx` → FAIL.

- [ ] **Step 3: o diálogo**

Leia `CloseTurnRefusedDialog.tsx` e reuse a mesma casca (overlay, caixa, botões) — mesmos
styled-components, copiados só se não forem exportados; se forem, importe. Conteúdo:

```tsx
import { useState } from "react";
import type { ChangeScenePayload, SceneCategory } from "./combatMessages";

const CATEGORY_LABELS: Record<SceneCategory, string> = { battle: "Batalha", roleplay: "Interpretação" };

/** `change_scene`: fecha cena e round correntes e abre a nova. A categoria vai minúscula (contrato). */
export default function SceneChangeDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: (p: ChangeScenePayload) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState<SceneCategory>("battle");
  const [description, setDescription] = useState("");
  if (!open) return null;
  return (
    <Overlay role="dialog" aria-modal aria-label="Nova cena">
      <Box>
        <Title>Nova cena</Title>
        <Hint>Fecha a cena e o round atuais e abre uma cena nova.</Hint>
        <Radios role="radiogroup" aria-label="Categoria">
          {(Object.keys(CATEGORY_LABELS) as SceneCategory[]).map((c) => (
            <label key={c}>
              <input type="radio" name="scene-category" checked={category === c} onChange={() => setCategory(c)} />
              {CATEGORY_LABELS[c]}
            </label>
          ))}
        </Radios>
        <label htmlFor="scene-desc">Descrição inicial</label>
        <DescInput id="scene-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Actions>
          <SecondaryButton type="button" onClick={onCancel}>Cancelar</SecondaryButton>
          <PrimaryButton
            type="button"
            onClick={() => onConfirm({ category, briefInitialDescription: description.trim() })}
          >
            Trocar de cena
          </PrimaryButton>
        </Actions>
      </Box>
    </Overlay>
  );
}
```

`Overlay`, `Box`, `Title`, `Hint`, `Actions`, `PrimaryButton`, `SecondaryButton`: os de
`CloseTurnRefusedDialog` (mesmos nomes se existirem lá; se tiverem outros nomes, use os de lá).
`Radios` = `styled.div` flex com `gap: 12px`; `DescInput` = `styled.input` com os tokens de input
do `NpcSelect` da T6.

- [ ] **Step 4: `RegencyControls` e página**

`RegencyControls` ganha `onNewScene` e `canChangeScene`, e um botão
`<SmallButton type="button" onClick={onNewScene} disabled={!canChangeScene} title={canChangeScene ? undefined : "Feche o turno antes de trocar de cena"}>Nova cena</SmallButton>`
antes de "Abrir próxima". No painel da fila (celular), `PanelSection` ganha o mesmo botão ao lado
do `RoundModeSwitch`.

`GameMasterPage`: `const [sceneDialog, setSceneDialog] = useState(false);`, passar
`onNewScene={() => setSceneDialog(true)}` e `canChangeScene={state.openTurn == null}`; montar
`<SceneChangeDialog open={sceneDialog} onCancel={() => setSceneDialog(false)} onConfirm={(p) => { combat.send.changeScene(p); setSceneDialog(false); }} />`
junto do `CloseTurnRefusedDialog`.

- [ ] **Step 5: rodar** — `npm run test -- src/pages src/features/match/combat` → PASS.

- [ ] **Step 6: commit**

```bash
git add src/features/match/combat/SceneChangeDialog.tsx src/features/match/combat/MasterControls.tsx src/pages/GameMasterPage.tsx src/pages/__tests__/GameMasterPage.test.tsx
git commit -m "feat(combate): o mestre troca de cena (F8)"
```

---

### Task 8: F3 — a ficha abre dentro da partida

**Files:**
- Modify: `src/features/sheet/types/sheetMode.ts`
- Modify: `src/features/sheet/CharacterSheetTemplate.tsx`
- Create: `src/features/match/combat/MatchSheetPanel.tsx`
- Modify: `src/components/templates/MatchStageTemplate.tsx` (`panelWide`)
- Modify: `src/pages/GamePlayerPage.tsx`, `src/pages/GameMasterPage.tsx`
- Test: `src/pages/__tests__/GamePlayerPage.test.tsx`, `src/pages/__tests__/GameMasterPage.test.tsx`

**Interfaces:**
- Consumes: T5 (`ownPlayerUuid`), T2 (`state.hp`).
- Produces:
  - `SheetMode.embedded?: boolean`; `export const MATCH_SHEET_MODE: SheetMode`.
  - `MatchStageTemplate` prop `panelWide?: boolean` (o `PanelZone` expõe `data-wide`).
  - `MatchSheetPanel({ token, sheetUuid, liveHp, onClose }: { token: string; sheetUuid: string | undefined; liveHp?: { hp: number; maxHp: number }; onClose?: () => void })`.

- [ ] **Step 1: testes que falham**

`GamePlayerPage.test.tsx` (o arranjo existente já serve a ficha do jogador por MSW em
`/charactersheets/:id` — confira; se não, acrescente com `sheetFixture` de `src/test/fixtures/sheet.ts`):

```ts
  it("F3: Ficha no rail abre a ficha do próprio personagem dentro da partida", async () => {
    await user.click(screen.getByRole("button", { name: /Ficha/ }));
    expect(await screen.findByTestId("match-sheet")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled(); // se o arquivo não mocka navigate, verifique a rota não mudou
  });

  it("F3: a ficha mostra o HP ao vivo", async () => {
    await user.click(screen.getByRole("button", { name: /Ficha/ }));
    await screen.findByTestId("match-sheet");
    act(() => { ws.emit("character_hp_changed", { characterId: ACTOR_ID, hp: 7, maxHp: 30, damage: 3 }); });
    expect(await screen.findByText(/7/)).toBeInTheDocument();
  });
```

(O HP no header da ficha — `CharacterSheetHeader` — renderiza `current`; confira o texto exato
que ele mostra lendo o componente, sem editá-lo, e ajuste o matcher.)

`GameMasterPage.test.tsx`:

```ts
  it("F3: tocar num card abre a ficha no painel, sem navegar", async () => {
    await user.click(screen.getByRole("button", { name: "Personagens" }));
    await user.click(await screen.findByTestId("character-row-c1"));
    expect(await screen.findByTestId("match-sheet")).toBeInTheDocument();
    // o painel alarga só para a ficha, e a aba da direita continua em Personagens
    expect(screen.getByTestId("match-panel")).toHaveAttribute("data-wide", "true");
    expect(screen.getByRole("button", { name: "Personagens", pressed: true })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Fila/ }));
    expect(screen.getByTestId("match-panel")).toHaveAttribute("data-wide", "false");
  });
```

- [ ] **Step 2: rodar e ver falhar** → FAIL.

- [ ] **Step 3: o quarto modo**

`sheetMode.ts`:

```ts
export interface SheetMode {
  headerMode: HeaderMode;
  profileMode: ProfileMode;
  diagramsMode: DiagramsMode;
  proficiencyMode: ProficiencyMode;
  skillsMode: SkillsMode;
  /** Dentro de outra tela (a partida): sem voltar e sem ações de rodapé. */
  embedded?: boolean;
}

/** O quarto modo (§5.6 do documento mestre): a ficha de fora, só leitura, dentro da partida. */
export const MATCH_SHEET_MODE: SheetMode = {
  headerMode: "view",
  profileMode: "view",
  diagramsMode: "view",
  proficiencyMode: "view",
  skillsMode: "view",
  embedded: true,
};
```

`CharacterSheetTemplate.tsx`: `{!sheetMode.embedded && <BackButton />}`; e as ações de rodapé
(`SheetBottomActions`, `SubmissionActionsWrapper`, `CreateSheetArea`) só quando
`!sheetMode.embedded` — na prática, calcule `const embedded = !!sheetMode.embedded;` e acrescente
`!embedded &&` às três condições e ao `$hasBottomActions`.

- [ ] **Step 4: `MatchSheetPanel`**

```tsx
import styled from "styled-components";
import { useMemo } from "react";
import CharacterSheetTemplate from "../../sheet/CharacterSheetTemplate";
import { MATCH_SHEET_MODE } from "../../sheet/types/sheetMode";
import { useCharacterSheet } from "../../../hooks/useCharacterSheet";
import { colors, fonts } from "../../../styles/tokens";
import { PanelHint } from "./panelStyles";

/**
 * A ficha dentro da partida (F3), na zona `panel`. Só leitura. O HP é o ao vivo
 * (`character_hp_changed`) sobre o REST; o REST é rebuscado a cada reconexão.
 */
export default function MatchSheetPanel({
  token,
  sheetUuid,
  liveHp,
  onClose,
}: {
  token: string;
  sheetUuid: string | undefined;
  liveHp?: { hp: number; maxHp: number };
  onClose?: () => void;
}) {
  const { data, isLoading, error } = useCharacterSheet(token, sheetUuid);
  const charSheet = useMemo(() => {
    if (!data || !liveHp) return data;
    return {
      ...data,
      status: { ...data.status, health: { ...data.status.health, current: liveHp.hp, max: liveHp.maxHp } },
    };
  }, [data, liveHp]);

  if (!sheetUuid) return <PanelHint>Toque num personagem para ver a ficha.</PanelHint>;

  return (
    <Wrapper data-testid="match-sheet">
      {onClose && (
        <Head>
          <span>{charSheet?.profile.nickname ?? "Ficha"}</span>
          <Close type="button" aria-label="Fechar ficha" onClick={onClose}>×</Close>
        </Head>
      )}
      <CharacterSheetTemplate
        sheetMode={MATCH_SHEET_MODE}
        data={{ charSheet, isLoading, error: error ? "Não foi possível carregar a ficha." : null }}
      />
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 13px;
`;

const Close = styled.button`
  background: transparent;
  border: none;
  color: ${colors.textPlaceholderStrong};
  font-size: 18px;
  cursor: pointer;
`;
```

(Confira que `PanelHint` existe em `panelStyles.ts` — é usado por `MasterControls`.)

- [ ] **Step 4b: o painel alarga para a ficha**

Desenho do dono do produto: a ficha abre no painel, que hoje tem 340 px fixos a partir de
`railUp` e não a comporta. Em `MatchStageTemplate.tsx`:

```tsx
type Props = {
  // …as de hoje…
  /** O painel mostra algo largo (a ficha): a coluna alarga a partir de `railUp`. */
  panelWide?: boolean;
};
```

Repassar para `PanelZone` como `$wide={panelWide}` e `data-wide={!!panelWide}`, e no estilo:

```ts
const PanelZone = styled.section<{ $open: boolean; $wide?: boolean }>`
  /* …igual até o railUp… */
  ${media.railUp} {
    width: ${({ $wide }) => ($wide ? "clamp(340px, 46vw, 640px)" : "340px")};
    max-height: none;
    border-top: none;
    border-right: 1px solid ${colors.surfaceInput};
  }
`;
```

Abaixo de `railUp` nada muda (a bottom sheet já tem a largura da tela). A largura final se
confere no browser (a ficha usa container queries — ver `CharacterSheetTemplate`).

- [ ] **Step 5: páginas**

`GamePlayerPage`:
- `type RailTab = "acao" | "ficha";`, `const [railActive, setRailActive] = useState<RailTab>("acao");`, handler igual ao do mestre (`handleRailSelect`: mesmo item alterna o painel; outro item troca e abre).
- Rail: `[{ id: "acao", label: "Ação", icon: "⚔" }, { id: "ficha", label: "Ficha", icon: "📜" }]`.
- `panel`: `railActive === "ficha" ? <MatchSheetPanel token={token} sheetUuid={actorId} liveHp={actorId ? state.hp[actorId] : undefined} /> : (…o painel de ação de hoje…)`.
- `<MatchStageTemplate panelWide={railActive === "ficha"} …>`.
- `MatchCharactersSidebar`: `ownPlayerUuid={user?.uuid}` e `onSelectCharacterSheet={() => { setRailActive("ficha"); setPanelOpen(true); }}` (o único card clicável do jogador é o dele; abrir a ficha do ator é o suficiente — se ele tiver dois personagens, `setChosenActor(sheetUuid)` antes).
- Remover `useNavigate` e o `navigate`.
- Em `handlePieceTap`/`handleSlotTap`/`handlePieceHold`, que hoje abrem o painel, trocar também para `setRailActive("acao")` — compor ação volta à aba Ação.

`GameMasterPage`:
- `type RailTab = "fila" | "agir" | "ficha";`, `const [sheetId, setSheetId] = useState<string | undefined>();`
- Rail ganha `{ id: "ficha", label: "Ficha", icon: "📜" }`.
- `panel`: ramo `railActive === "ficha"` → `<MatchSheetPanel token={token} sheetUuid={sheetId} liveHp={sheetId ? state.hp[sheetId] : undefined} onClose={() => setSheetId(undefined)} />`.
- `onSelectCharacterSheet={(uuid) => { setSheetId(uuid); setRailActive("ficha"); setPanelOpen(true); }}` — o rail troca de item (é ali que a ficha mora); a aba da direita **não** muda.
- `<MatchStageTemplate panelWide={railActive === "ficha"} …>`.
- Remover `useNavigate` e o `navigate`.

- [ ] **Step 6: rodar** — `npm run test -- src/pages src/features` → PASS. `npm run build` → sem erro.

- [ ] **Step 7: commit**

```bash
git add src/features/sheet src/features/match/combat/MatchSheetPanel.tsx src/pages
git commit -m "feat(combate): a ficha abre dentro da partida, só leitura, com HP ao vivo (F3)"
```

---

### Task 9: F7 — o cálculo do turno aberto, no card da ação na Fila

**Files:**
- Create: `src/features/match/combat/ResolutionDetails.tsx`
- Modify: `src/features/match/combat/combatText.ts`
- Modify: `src/features/match/combat/QueuePanel.tsx` (card da ação em andamento)
- Modify: `src/pages/GameMasterPage.tsx`
- Test: `src/features/match/combat/__tests__/combatOrganisms.test.tsx`, `src/pages/__tests__/GameMasterPage.test.tsx`

**Interfaces:**
- Consumes: T2 (`ResolutionPayload` completo, `state.openResolution`, `state.openQueued`).
- Produces: `ResolutionDetails({ resolution, nameOf }: { resolution: ResolutionPayload; nameOf: (id: string) => string })`; `RUNG_LABELS`, `REACTION_KIND_LABELS` em `combatText.ts`; `QueuePanel` ganha a prop `open?: { actorId: string; bars?: Bar[]; resolution: ResolutionPayload | null }`.

**Desenho do dono do produto:** o cálculo não ganha item no rail. Ele aparece **anexado ao card
da própria ação**, na Fila: a ação aberta continua na lista, no topo, marcada como em andamento,
com os números embaixo. O desenho ainda vai ser refinado — faça simples e legível.

- [ ] **Step 1: teste do organismo**

Em `combatOrganisms.test.tsx`:

```tsx
describe("ResolutionDetails", () => {
  const res: ResolutionPayload = {
    turnId: "t1", isSettled: false,
    action: { skillName: "Accuracy", skillValue: 14, diceRolled: [6, 8], total: 20, isCritical: false, isCriticalFailure: false, margin: 3 },
    targets: [{
      targetId: "c2", avoided: false, defended: true, dodgeTotal: 12, defenseTotal: 15,
      rawDamage: 10, defenseApplied: 3, projectedDamage: 7,
      reaction: { kind: "repel", total: 17, reactionId: "r1", rung: "near_miss", margin: -3, difference: 3, stopsAttack: false },
      payouts: [{ amount: -3, bias: 0, applies: "action_speed", source: "system", againstKind: "anyone", againstId: "0", expiresAt: "next_turn", reason: "repel: near miss penalty" }],
    }],
    pendingReactions: [{ reactionId: "r2", actorId: "c3", kind: "dodge" }],
    errors: [{ subject: "c9", kind: "missing_sheet", detail: "x" }],
  };
  const nameOf = (id: string) => ({ c2: "Hisoka", c3: "Killua", c9: "Fantasma" }[id] ?? id);

  it("mostra acerto, alvo, reação, dano, reações pendentes e falta do motor", () => {
    render(<ResolutionDetails resolution={res} nameOf={nameOf} />);
    expect(screen.getByText(/Accuracy/)).toBeInTheDocument();
    expect(screen.getByText(/6 \+ 8/)).toBeInTheDocument();
    expect(screen.getByText("Hisoka")).toBeInTheDocument();
    expect(screen.getByText(/quase/i)).toBeInTheDocument();       // near_miss
    expect(screen.getByText(/10 → 7/)).toBeInTheDocument();
    expect(screen.getByText(/Killua/)).toBeInTheDocument();
    expect(screen.getByText(/incompleto/i)).toBeInTheDocument();
  });

  it("não tem botão nenhum (nasce só leitura)", () => {
    render(<ResolutionDetails resolution={res} nameOf={nameOf} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: rodar e ver falhar** → FAIL.

- [ ] **Step 3: textos**

`combatText.ts`:

```ts
/** `reaction.rung` do repelir — snake_case do domínio, rótulo PT na tela. */
export const RUNG_LABELS: Record<string, string> = {
  great_success: "sucesso total",
  success: "sucesso",
  near_miss: "quase",
  failure: "falha",
};

export const REACTION_KIND_LABELS: Record<string, string> = {
  nothing: "nada", dodge: "esquiva", closedDodge: "esquiva fechada", escape: "fuga",
  escapeGuard: "fuga defensiva", closedEscape: "fuga fechada", repel: "repelir",
};
```

(I5: `closedDodge` só chega assim ao mestre; o painel mostra o que veio.)

- [ ] **Step 4: o painel**

```tsx
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { ResolutionPayload } from "./combatMessages";
import { REACTION_KIND_LABELS, RUNG_LABELS } from "./combatText";

/**
 * O cálculo do turno aberto, que só o mestre recebe (F7). Nasce só leitura: dar a palavra a
 * uma reação é da Fase 7, editar é da Fase 8 — um botão antes disso não faria nada.
 */
export default function ResolutionDetails({
  resolution,
  nameOf,
}: {
  resolution: ResolutionPayload;
  nameOf: (id: string) => string;
}) {
  const { action, targets, pendingReactions, errors } = resolution;
  return (
    <Wrap aria-label="Cálculo do turno">
      {action && (
        <Block>
          <Label>Acerto</Label>
          <span>
            {action.skillName} {action.skillValue} · dados {action.diceRolled.join(" + ") || "—"} · total{" "}
            <strong>{action.total}</strong>
            {action.margin !== undefined && ` · margem ${action.margin}`}
            {action.isCritical && " · crítico"}
            {action.isCriticalFailure && " · falha crítica"}
          </span>
        </Block>
      )}
      {targets.map((t) => (
        <Target key={t.targetId}>
          <strong>{nameOf(t.targetId)}</strong>
          <Line>
            {t.avoided ? "evitou o golpe" : t.defended ? "defendeu" : "acertado"} · esquiva {t.dodgeTotal} · defesa {t.defenseTotal}
          </Line>
          {t.reaction && (
            <Line>
              reação: {REACTION_KIND_LABELS[t.reaction.kind] ?? t.reaction.kind} {t.reaction.total}
              {t.reaction.rung && ` · ${RUNG_LABELS[t.reaction.rung] ?? t.reaction.rung}`}
              {t.reaction.stopsAttack && " · para o ataque"}
            </Line>
          )}
          <Line>dano {t.rawDamage} → {t.projectedDamage} (defesa −{t.defenseApplied})</Line>
          {t.payouts?.map((p, i) => (
            <Muted key={i} title={p.reason}>
              {p.amount !== 0 && `${p.amount > 0 ? "+" : ""}${p.amount} `}
              {p.bias !== 0 && (p.bias > 0 ? "vantagem " : "desvantagem ")}
              em {p.applies === "dodge" ? "esquiva" : "velocidade de ação"}
            </Muted>
          ))}
        </Target>
      ))}
      {!!pendingReactions?.length && (
        <Block>
          <Label>Reações esperando</Label>
          {pendingReactions.map((r) => (
            <Line key={r.reactionId}>{nameOf(r.actorId)} — {REACTION_KIND_LABELS[r.kind] ?? r.kind}</Line>
          ))}
        </Block>
      )}
      {!!errors?.length && (
        <Warn>
          {errors.map((e, i) => (
            <span key={i} title={e.detail}>O cálculo de {nameOf(e.subject)} está incompleto ({e.kind}).</span>
          ))}
        </Warn>
      )}
    </Wrap>
  );
}

const Wrap = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 6px;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 12px;
`;
const Block = styled.div`display: flex; flex-direction: column; gap: 2px;`;
const Label = styled.span`font-size: 11px; color: ${colors.textPlaceholderStrong}; text-transform: uppercase;`;
const Target = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  border-radius: 6px;
  background: ${colors.surfaceInput};
`;
const Line = styled.span``;
const Muted = styled.span`color: ${colors.textPlaceholderStrong}; font-size: 12px;`;
const Warn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: ${colors.warningText};
  font-size: 12px;
`;
```

(O teste procura `/10 → 7/`; o texto acima é "dano 10 → 7" — casa.)

- [ ] **Step 5: o card da ação em andamento, na Fila**

Teste primeiro, em `combatOrganisms.test.tsx`:

```tsx
describe("QueuePanel — ação em andamento", () => {
  it("mostra no topo o card da ação aberta, marcado, com o cálculo anexado", () => {
    render(
      <QueuePanel
        queue={[{ actionId: "a2", actorId: "c3", bars: ["move"] }]}
        open={{ actorId: "c1", bars: ["action"], resolution: res }}
        nameOf={nameOf}
        onPull={() => {}}
      />,
    );
    const rows = screen.getAllByTestId(/queue-row|queue-open/);
    expect(rows[0]).toHaveAttribute("data-testid", "queue-open");
    expect(within(rows[0]).getByText(/em andamento/i)).toBeInTheDocument();
    expect(within(rows[0]).getByText("Hisoka")).toBeInTheDocument();
    expect(within(rows[0]).queryByRole("button")).not.toBeInTheDocument(); // sem "Abrir agora"
  });

  it("turno aberto ainda sem cálculo: o card aparece sem os números", () => {
    render(<QueuePanel queue={[]} open={{ actorId: "c1", resolution: null }} nameOf={nameOf} onPull={() => {}} />);
    expect(screen.getByTestId("queue-open")).toBeInTheDocument();
    expect(screen.queryByLabelText("Cálculo do turno")).not.toBeInTheDocument();
  });
});
```

(`res`/`nameOf`: os do `describe("ResolutionDetails")` — suba-os para o escopo do arquivo.
`within` vem de `@testing-library/react`.)

Em `QueuePanel.tsx`:
- Nova prop `open?: { actorId: string; bars?: Bar[]; resolution: ResolutionPayload | null }`.
- Com `open`, a lista começa por um card `data-testid="queue-open"` (mesmo `Row`, com borda de
  destaque — `colors.pieceActiveTurn`, a cor do anel de "vez de" no mapa): nome do ator, as
  barras (quando houver), o selo "em andamento", e, se `open.resolution`, o
  `<ResolutionDetails resolution={open.resolution} nameOf={nameOf} />` embaixo. Sem botão.
- A mensagem de fila vazia só aparece quando não há `queue` **nem** `open`.
- Atualizar o comentário do componente: a fila mostra também a ação em andamento, com o
  cálculo que só o mestre recebe.

`GameMasterPage`, no `QueuePanel`:

```tsx
                open={
                  state.openTurn
                    ? {
                        actorId: state.openTurn.actorId,
                        bars: state.openQueued?.bars,
                        resolution: state.openResolution,
                      }
                    : undefined
                }
```

Sem item novo no rail, e sem trocar o item ativo quando um turno abre (espírito de F11).

Teste de página: emitir `action_queued` (a1), `turn_opened` (a1) e `resolution_updated` não
liquidado; no painel Fila, `queue-open` existe e mostra o nome do alvo.

- [ ] **Step 6: rodar** → PASS.

- [ ] **Step 7: commit**

```bash
git add src/features/match/combat/ResolutionDetails.tsx src/features/match/combat/QueuePanel.tsx src/features/match/combat/combatText.ts src/pages/GameMasterPage.tsx src/features/match/combat/__tests__/combatOrganisms.test.tsx src/pages/__tests__/GameMasterPage.test.tsx
git commit -m "feat(combate): o mestre vê o cálculo do turno aberto (F7)"
```

---

### Task 10: F4 (parte 1) — o histórico do REST: tipos, serviço, hook

**Files:**
- Create: `src/types/matchHistory.ts`
- Modify: `src/services/matchService.ts`
- Create: `src/hooks/useMatchHistory.ts`
- Test: `src/hooks/__tests__/useMatchHistory.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  // src/types/matchHistory.ts
  export type RollCheck = { skillName: string; skillValue: number; attempts: { primary: number[]; secondary?: number[] }; result: number };
  export type HistoryAction = {
    uuid: string; actorId: string; targetId?: string[]; reactionKind: string; reactToId?: string; systemBias?: number;
    skills?: Array<{ skillName: string; rollCheck: RollCheck }>;
    speed?: { bar: number; rollCheck: RollCheck };
    /** O formato não está documentado em match-history.md até B15 — só a presença é lida. */
    move?: unknown;
    attack?: { weapon: string; hit?: RollCheck; damage?: RollCheck; relativeVelocity?: number };
    defense?: unknown; dodge?: { rollCheck: RollCheck }; repel?: unknown; interact?: { kind: string }; feint?: RollCheck; trigger?: Record<string, never>;
  };
  export type HistoryTurn = { uuid: string; createdAt: string; finishedAt?: string; action: HistoryAction; reactions?: HistoryAction[]; resolution?: ResolutionPayload & { isSettled: boolean } };
  export type HistoryRound = { uuid: string; mode: string; createdAt: string; finishedAt?: string; turns: HistoryTurn[] };
  export type HistoryScene = { uuid: string; category: string; briefDesc: string; createdAt: string; finishedAt?: string; rounds: HistoryRound[] };
  export type MatchHistory = { scenes: HistoryScene[] };
  ```
  `matchService.getHistory(token, matchId): Promise<MatchHistory>`;
  `useMatchHistory(token, matchId)` → `UseQueryResult<{ history: MatchHistory; fetchStartedAt: number }>`, `queryKey: ["matchHistory", token, matchId]`.

- [ ] **Step 1: teste que falha**

```tsx
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { server } from "../../test/server";
import { useMatchHistory } from "../useMatchHistory";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

describe("useMatchHistory", () => {
  it("busca o histórico e carimba a hora em que o fetch começou", async () => {
    vi.setSystemTime(new Date("2026-09-27T10:00:00Z"));
    server.use(http.get("http://localhost:5000/matches/m1/history", () => HttpResponse.json({ scenes: [{ uuid: "s1", category: "battle", briefDesc: "", createdAt: "", rounds: [] }] })));
    const { result } = renderHook(() => useMatchHistory("tok", "m1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.history.scenes).toHaveLength(1);
    expect(result.current.data?.fetchStartedAt).toBe(Date.parse("2026-09-27T10:00:00Z"));
    vi.useRealTimers();
  });
});
```

(`vi.setSystemTime` exige timers falsos em algumas versões do vitest; se falhar, use
`vi.useFakeTimers({ toFake: ["Date"] })` antes e `vi.useRealTimers()` depois.)

- [ ] **Step 2: rodar e ver falhar** → FAIL.

- [ ] **Step 3: implementar**

`src/types/matchHistory.ts`: exatamente os tipos do bloco **Produces** acima, com
`import type { ResolutionPayload } from "../features/match/combat/combatMessages";` e um
comentário de topo: "1:1 com `System_X_System/docs/dev/api/match-history.md`. A resposta já vem
projetada por leitor — não filtre no cliente."

`matchService.ts`:

```ts
  getHistory: (token: string, matchId: string): Promise<MatchHistory> =>
    httpClient.get<MatchHistory>(`/matches/${matchId}/history`, config(token)).then(({ data }) => data),
```

`src/hooks/useMatchHistory.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { matchService } from "../services/matchService";
import type { MatchHistory } from "../types/matchHistory";

/**
 * O histórico da partida, projetado para quem pede (a chave inclui o token: o mesmo turno
 * vem diferente para cada pessoa). `fetchStartedAt` é a hora LOCAL em que o fetch começou:
 * é o que decide se um evento ao vivo já está coberto por esta resposta (ver historyRows).
 */
export function useMatchHistory(token: string | null, matchId: string | undefined) {
  return useQuery<{ history: MatchHistory; fetchStartedAt: number }>({
    queryKey: ["matchHistory", token, matchId],
    queryFn: async () => {
      const fetchStartedAt = Date.now();
      const history = await matchService.getHistory(token!, matchId!);
      return { history, fetchStartedAt };
    },
    enabled: !!token && !!matchId,
    retry: 1,
  });
}
```

- [ ] **Step 4: rodar** → PASS.

- [ ] **Step 5: commit**

```bash
git add src/types/matchHistory.ts src/services/matchService.ts src/hooks/useMatchHistory.ts src/hooks/__tests__/useMatchHistory.test.tsx
git commit -m "feat(combate): histórico da partida pelo REST (F4)"
```

---

### Task 11: F4 (parte 1) — linhas do histórico e a aba Histórico — **opus**

**Files:**
- Create: `src/features/match/combat/historyRows.ts`
- Modify: `src/features/match/combat/EventStream.tsx`
- Modify: `src/pages/GamePlayerPage.tsx`, `src/pages/GameMasterPage.tsx`
- Test: `src/features/match/combat/__tests__/historyRows.test.ts`, page tests

**Interfaces:**
- Consumes: T2 (`TableEvent` com `at`/`receivedAt`), T10 (`MatchHistory`, `useMatchHistory`).
- Produces:
  ```ts
  export type HistoryRow =
    | { source: "rest"; kind: "turn"; key: string; at: number; turn: HistoryTurn }
    | { source: "live"; key: string; at: number; event: TableEvent };
  export function historyRows(history: MatchHistory | undefined, events: TableEvent[], fetchStartedAt: number | undefined, openTurnId: string | undefined): HistoryRow[];
  ```
  `EventStream({ rows, nameOf, gridKind })` (troca `events` por `rows`).

- [ ] **Step 1: testes da função pura**

```ts
import { describe, it, expect } from "vitest";
import { historyRows } from "../historyRows";
import type { TableEvent } from "../combatReducer";
import type { MatchHistory } from "../../../../types/matchHistory";

const turn = (uuid: string, finishedAt: string) => ({
  uuid, createdAt: finishedAt, finishedAt,
  action: { uuid: `a-${uuid}`, actorId: "c1", reactionKind: "" },
});
const history = (...turns: ReturnType<typeof turn>[]): MatchHistory => ({
  scenes: [{ uuid: "s1", category: "battle", briefDesc: "", createdAt: "", rounds: [{ uuid: "r1", mode: "Race", createdAt: "", turns }] }],
});
const T = (iso: string) => Date.parse(iso);

describe("historyRows", () => {
  it("turnos do REST viram linhas, em ordem de hora", () => {
    const rows = historyRows(history(turn("t2", "2026-01-01T00:02:00Z"), turn("t1", "2026-01-01T00:01:00Z")), [], 0, undefined);
    expect(rows.map((r) => r.key)).toEqual(["rest:t1", "rest:t2"]);
  });

  it("evento derivado de turno sai quando um fetch começou DEPOIS de ele chegar", () => {
    const ev: TableEvent = { kind: "turn_closed", turnId: "t1", at: T("2026-01-01T00:01:00Z"), receivedAt: 100 };
    const rows = historyRows(history(turn("t1", "2026-01-01T00:01:00Z")), [ev], 200, undefined);
    expect(rows.filter((r) => r.source === "live")).toHaveLength(0);
  });

  it("fetch que começou ANTES do evento não o derruba", () => {
    const ev: TableEvent = { kind: "turn_closed", turnId: "t9", at: T("2026-01-01T00:05:00Z"), receivedAt: 300 };
    const rows = historyRows(history(), [ev], 200, undefined);
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe("live");
  });

  it("hp_changed e resolução liquidada seguem a mesma regra", () => {
    const hp: TableEvent = { kind: "hp_changed", characterId: "c2", hp: 5, maxHp: 10, damage: 5, at: 1, receivedAt: 100 };
    expect(historyRows(history(), [hp], 200, undefined)).toHaveLength(0);
    expect(historyRows(history(), [hp], 50, undefined)).toHaveLength(1);
  });

  it("cena, regime e round fechado ficam ao vivo mesmo com fetch posterior (até B15)", () => {
    const evs: TableEvent[] = [
      { kind: "round_closed", roundMode: "Race", at: 1, receivedAt: 100 },
      { kind: "round_mode_changed", mode: "Free", at: 2, receivedAt: 100 },
      { kind: "scene_changed", scene: { sceneId: "s2", category: "battle", briefInitialDescription: "" }, at: 3, receivedAt: 100 },
    ];
    expect(historyRows(history(), evs, 999, undefined)).toHaveLength(3);
  });

  it("turn_opened fica só enquanto aquele turno está aberto", () => {
    const ev: TableEvent = { kind: "turn_opened", turnId: "t3", actorId: "c1", at: 1, receivedAt: 1 };
    expect(historyRows(history(), [ev], 999, "t3")).toHaveLength(1);
    expect(historyRows(history(), [ev], 999, undefined)).toHaveLength(0);
  });

  it("intercala REST e ao vivo pela hora do servidor; empate: REST antes", () => {
    const ev: TableEvent = { kind: "round_mode_changed", mode: "Free", at: T("2026-01-01T00:01:00Z"), receivedAt: 1 };
    const rows = historyRows(history(turn("t1", "2026-01-01T00:01:00Z"), turn("t2", "2026-01-01T00:03:00Z")), [ev], 0, undefined);
    expect(rows.map((r) => r.key)).toEqual(["rest:t1", `live:round_mode_changed:${ev.at}:0`, "rest:t2"]);
  });

  it("turno do REST sem finishedAt usa createdAt", () => {
    const t = { ...turn("t1", "2026-01-01T00:01:00Z"), finishedAt: undefined };
    expect(historyRows(history(t), [], 0, undefined)[0].at).toBe(T("2026-01-01T00:01:00Z"));
  });
});
```

- [ ] **Step 2: rodar e ver falhar** → FAIL.

- [ ] **Step 3: implementar `historyRows.ts`**

```ts
import type { TableEvent } from "./combatReducer";
import type { HistoryTurn, MatchHistory } from "../../../types/matchHistory";

export type HistoryRow =
  | { source: "rest"; kind: "turn"; key: string; at: number; turn: HistoryTurn }
  | { source: "live"; key: string; at: number; event: TableEvent };

/**
 * Eventos ao vivo que o REST cobre quando traz o turno: o servidor persiste o turno ANTES de
 * emitir qualquer mensagem do fechamento, então um fetch que COMEÇOU depois de a mensagem
 * chegar sempre o contém. Cena, regime e round fechado não estão aqui: o REST de hoje não os
 * guarda (B15) — ficam ao vivo, e recarregar os perde (perder, não divergir: §0.2).
 */
const TURN_DERIVED = new Set<TableEvent["kind"]>(["turn_closed", "hp_changed"]);

export function historyRows(
  history: MatchHistory | undefined,
  events: TableEvent[],
  fetchStartedAt: number | undefined,
  openTurnId: string | undefined,
): HistoryRow[] {
  const rest: HistoryRow[] = [];
  for (const scene of history?.scenes ?? []) {
    for (const round of scene.rounds) {
      for (const turn of round.turns) {
        rest.push({ source: "rest", kind: "turn", key: `rest:${turn.uuid}`, at: Date.parse(turn.finishedAt ?? turn.createdAt), turn });
      }
    }
  }

  const live: HistoryRow[] = [];
  events.forEach((event, i) => {
    if (event.kind === "turn_opened" && event.turnId !== openTurnId) return;
    if (TURN_DERIVED.has(event.kind) && fetchStartedAt !== undefined && fetchStartedAt > event.receivedAt) return;
    live.push({ source: "live", key: `live:${event.kind}:${event.at}:${i}`, at: event.at, event });
  });

  // Estável: REST vem antes no array, e o sort do JS é estável — empate fica REST antes.
  return [...rest, ...live].sort((a, b) => a.at - b.at);
}
```

Atenção ao teste "intercala": a chave ao vivo usa o índice **no array de eventos** (`i`), e ali
o evento é o índice 0. A resolução liquidada não é um `kind` próprio — o reducer a pendura no
evento `turn_closed` (campo `resolution`), então segue a regra do `turn_closed`.

- [ ] **Step 4: `EventStream` desenha linhas**

`EventStream.tsx`:
- Props: `{ rows: HistoryRow[]; nameOf; gridKind }`. O `useEffect` de rolagem depende de `rows`.
- `rows.length === 0` → o `Empty` de hoje.
- Para `row.source === "live"`: `eventLine(row.event, …)` como hoje.
- Para `row.source === "rest"`: nova `turnLine(row.turn, nameOf)`:

```ts
function turnLine(turn: HistoryTurn, nameOf: (id: string) => string): Line {
  const a = turn.action;
  const parts: string[] = [];
  if (a.move !== undefined) parts.push("moveu");
  if (a.attack) {
    const who = (a.targetId ?? []).map(nameOf).join(", ");
    parts.push(`atacou ${who}${a.attack.weapon ? ` com ${humanWeapon(a.attack.weapon)}` : ""}`);
  }
  if (a.interact) parts.push(`interagiu (${a.interact.kind})`);
  const outcomes = (turn.resolution?.targets ?? []).map((t) =>
    t.avoided ? `${nameOf(t.targetId)} evitou` : t.projectedDamage > 0 ? `${nameOf(t.targetId)} ${MINUS}${t.projectedDamage}` : `${nameOf(t.targetId)} sem dano`,
  );
  const what = parts.length ? ` — ${parts.join(" e ")}` : "";
  return { icon: "■", text: `Turno de ${nameOf(a.actorId)}${what}${outcomes.length ? ` · ${outcomes.join(", ")}` : ""}` };
}
```

(`humanWeapon` de `combatText`; `import type { HistoryTurn }`.) A chave do `<Row>` passa a ser
`row.key`. Atualizar o comentário do componente: a aba é o histórico do servidor com o ao vivo por
cima.

- [ ] **Step 5: páginas**

Nas duas páginas:

```ts
  const { data: historyData } = useMatchHistory(token, matchId);
  const rows = useMemo(
    () => historyRows(historyData?.history, state.events, historyData?.fetchStartedAt, state.openTurn?.turnId),
    [historyData, state.events, state.openTurn],
  );
  // …
  historico={<EventStream rows={rows} nameOf={nameOf} gridKind={gridKind} />}
```

(No jogador, `gridKind` = `map?.grid.kind ?? "square"`.) A query é a mesma que `useGameTable`
invalida em `turn_closed`/`match_full_state` (T3) — mesma chave.

Teste de página (jogador): MSW devolve um histórico com um turno de "Gon" atacando "Hisoka"; a
aba Histórico mostra "Turno de Gon — atacou Hisoka"; depois `ws.emit("turn_closed", …)` e o
handler conta uma segunda busca (`await vi.waitFor(() => expect(calls).toBe(2))`).

- [ ] **Step 6: rodar** — `npm run test` → PASS.

- [ ] **Step 7: commit**

```bash
git add src/features/match/combat/historyRows.ts src/features/match/combat/EventStream.tsx src/pages src/features/match/combat/__tests__/historyRows.test.ts
git commit -m "feat(combate): a aba Histórico vem do servidor, com o ao vivo por cima (F4)"
```

---

### Task 12: F6 (parte 1) — as barras de cada personagem

**Files:**
- Create: `src/features/match/combat/CharacterBarsStrip.tsx`
- Modify: `src/features/match/combat/GeneralBar.tsx`
- Modify: `src/styles/tokens.ts` (se precisar de cor de débito — use `colors.danger` se servir)
- Test: `src/features/match/combat/__tests__/combatOrganisms.test.tsx`

**Interfaces:**
- Consumes: `BarsPayload`, `RoundMode`.
- Produces: `CharacterBarsStrip({ bars, roundMode, nameOf }: { bars: BarsPayload; roundMode: RoundMode | ""; nameOf: (id: string) => string })`; `GeneralBar` ganha prop `roundMode: RoundMode | ""`; `export function mean(xs: number[]): number | undefined` (no mesmo arquivo da faixa).

- [ ] **Step 1: testes**

```tsx
describe("CharacterBarsStrip", () => {
  const bars: BarsPayload = {
    seq: 1,
    prices: { action: 14, move: 12 },
    characters: [{ characterId: "c1", actionBalance: -2.5, moveBalance: 3, actionSpeeds: [16, 14], moveSpeeds: [] }],
    order: [{ actorId: "c1", bars: ["action"], key: 18 }],
  };
  const nameOf = () => "Gon";

  it("Disputado: saldo com uma casa, velocidades e média", () => {
    render(<CharacterBarsStrip bars={bars} roundMode="Race" nameOf={nameOf} />);
    expect(screen.getByText("Gon")).toBeInTheDocument();
    expect(screen.getByText("−2.5")).toBeInTheDocument();
    expect(screen.getByText("16 · 14")).toBeInTheDocument();
    expect(screen.getByText("x̄ 15")).toBeInTheDocument();
    expect(screen.getAllByRole("meter")).toHaveLength(2);
  });

  it("Livre: sem barras nem média, só as velocidades", () => {
    render(<CharacterBarsStrip bars={{ ...bars, prices: {} }} roundMode="Free" nameOf={nameOf} />);
    expect(screen.queryAllByRole("meter")).toHaveLength(0);
    expect(screen.queryByText(/x̄/)).not.toBeInTheDocument();
    expect(screen.getByText("16 · 14")).toBeInTheDocument();
  });

  it("barra sem preço não é desenhada", () => {
    render(<CharacterBarsStrip bars={{ ...bars, prices: { action: 14 } }} roundMode="Race" nameOf={nameOf} />);
    expect(screen.getAllByRole("meter")).toHaveLength(1);
  });
});

describe("GeneralBar — chave na ordem", () => {
  it("mostra a key de cada slot", () => {
    render(<GeneralBar bars={bars} roundMode="Race" nameOf={() => "Gon"} />);
    expect(screen.getByTestId("order-row")).toHaveTextContent("18");
  });
});
```

(`bars` do segundo `describe`: reuse a constante do primeiro, subindo-a para o escopo do arquivo.)

- [ ] **Step 2: rodar e ver falhar** → FAIL.

- [ ] **Step 3: a faixa**

```tsx
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { Bar, BarsPayload, RoundMode } from "./combatMessages";
import { BAR_ICONS, BAR_LABELS } from "./combatText";

/** U+2212 MINUS SIGN — não é hífen. */
const MINUS = "−";

/** "A velocidade do round é a média de todas as ações que ele fez" (barra-de-acao.md). */
export function mean(xs: number[]): number | undefined {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined;
}

const fmt = (n: number) => `${n < 0 ? MINUS : ""}${Math.abs(Math.round(n * 10) / 10)}`;

/**
 * Uma linha por personagem, só com o que `bars_updated` traz (I8): o jogador não vê a
 * velocidade de ação nenhuma antes de ela abrir porque o servidor não a manda antes disso.
 * No regime Livre não há preço, média nem carry-over — só as velocidades que agiram.
 */
export default function CharacterBarsStrip({
  bars,
  roundMode,
  nameOf,
}: {
  bars: BarsPayload;
  roundMode: RoundMode | "";
  nameOf: (id: string) => string;
}) {
  const race = roundMode === "Race";
  return (
    <Strip aria-label="Barras de cada personagem">
      {bars.characters.map((c) => {
        const speeds = [...c.actionSpeeds, ...c.moveSpeeds];
        const avg = mean(speeds);
        return (
          <Row key={c.characterId}>
            <Name>{nameOf(c.characterId)}</Name>
            {race && (["action", "move"] as Bar[]).map((b) => {
              const price = bars.prices[b];
              if (price === undefined) return null;
              const balance = b === "action" ? c.actionBalance : c.moveBalance;
              return <BalanceBar key={b} bar={b} balance={balance} price={price} />;
            })}
            {speeds.length > 0 && <Speeds>{speeds.join(" · ")}</Speeds>}
            {race && avg !== undefined && <Speeds>{`x̄ ${Math.round(avg * 10) / 10}`}</Speeds>}
          </Row>
        );
      })}
    </Strip>
  );
}

/** Centrada no zero: crédito enche para a direita, débito para a esquerda, até ±preço. */
function BalanceBar({ bar, balance, price }: { bar: Bar; balance: number; price: number }) {
  const frac = Math.max(-1, Math.min(1, balance / price));
  return (
    <BarBox title={`${BAR_LABELS[bar]}: saldo ${fmt(balance)} de ${price}`}>
      <span aria-hidden>{BAR_ICONS[bar]}</span>
      <Track role="meter" aria-label={`Saldo de ${BAR_LABELS[bar]}`} aria-valuemin={-price} aria-valuemax={price} aria-valuenow={balance}>
        <Fill $frac={frac} />
      </Track>
      <Num>{fmt(balance)}</Num>
    </BarBox>
  );
}

const Strip = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
  font-family: ${fonts.sans};
  font-size: 11px;
`;
const Row = styled.div`display: flex; align-items: center; gap: 8px; white-space: nowrap;`;
const Name = styled.span`min-width: 64px; overflow: hidden; text-overflow: ellipsis;`;
const BarBox = styled.span`display: inline-flex; align-items: center; gap: 4px;`;
const Track = styled.span`
  position: relative;
  width: 72px;
  height: 6px;
  border-radius: 3px;
  background: ${colors.surfaceInput};
  overflow: hidden;
`;
const Fill = styled.span<{ $frac: number }>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: ${({ $frac }) => ($frac >= 0 ? "50%" : `${50 + $frac * 50}%`)};
  width: ${({ $frac }) => `${Math.abs($frac) * 50}%`};
  background: ${({ $frac }) => ($frac >= 0 ? colors.statusOngoing : colors.danger)};
`;
const Num = styled.span`min-width: 32px; text-align: right;`;
const Speeds = styled.span`color: ${colors.textPlaceholderStrong};`;
```

(O teste espera `"−2.5"`: `fmt(-2.5)` = `"−2.5"`. `x̄ 15`: média de `[16, 14]`.) As velocidades de
ação e de movimento aparecem juntas na mesma lista; se o browser mostrar que isso confunde,
separe por ícone na verificação e registre.

- [ ] **Step 4: `GeneralBar`**

- Nova prop `roundMode: RoundMode | ""` (as duas páginas passam `state.roundMode`).
- Chip da ordem: `{nameOf(entry.actorId)} <Icons>…</Icons> <Key>{entry.key}</Key>` com
  `const Key = styled.span\`color: ${colors.textPlaceholderStrong}; font-variant-numeric: tabular-nums;\``.
- O `Wrapper` vira coluna: a linha de hoje dentro de um `TopRow` (o flex atual) e, abaixo, a
  faixa quando `bars && bars.characters.length > 0 && stripOpen`.
- `const [stripOpen, setStripOpen] = useState(() => typeof window === "undefined" || window.matchMedia?.(\`(min-width: ${breakpoints.tabletUp}px)\`).matches !== false);`
  e um botão `<StripToggle type="button" aria-expanded={stripOpen} onClick={() => setStripOpen((o) => !o)}>Barras {stripOpen ? "▴" : "▾"}</StripToggle>` no `TopRow`
  (`breakpoints` de `src/styles/breakpoints.ts`). Em jsdom `matchMedia` pode não existir → aberta.
- `white-space: nowrap`/`overflow-x: auto` ficam no `TopRow`; o `Wrapper` perde o `nowrap`.

- [ ] **Step 5: rodar** — `npm run test -- src/features/match/combat src/pages` → PASS.

- [ ] **Step 6: commit**

```bash
git add src/features/match/combat/CharacterBarsStrip.tsx src/features/match/combat/GeneralBar.tsx src/pages src/features/match/combat/__tests__/combatOrganisms.test.tsx
git commit -m "feat(combate): as barras de cada personagem no topo do mapa (F6)"
```

---

### Checkpoint A (controlador)

- [ ] `npm run test`, `npm run lint`, `npm run build` verdes.
- [ ] **Verificação no browser da Parte A** (o que já dá sem o back novo): §8 do spec, itens 3–7 e
  10. Registrar em `.superpowers/sdd/2026-09-27-front-combat-phase-6-closure/checkpoint-a.md`.
- [ ] Conferir se o PR de back deste fechamento foi mergeado em `main` do `System_X_System`
  (`rtk gh pr list --repo 422UR4H/HxH_RPG_System --state merged --limit 5`). **Não mergeado →
  pare aqui e reporte ao dono do produto** o que está pronto e o que espera. Mergeado →
  `git -C ../System_X_System pull` e siga para a Parte B.

---

# PARTE B — depois do merge do PR de back

Em toda tarefa daqui para baixo, o **Step 1 é ler o contrato** — as seções citadas, na `main`
do `System_X_System`. Se a seção não existe ou contradiz o que a tarefa assume, **pare e
reporte** (§0 item 3 do spec).

### Task 13: F1 + F6 (parte 2) — a fila do mestre inteira, e o fantasma do mestre (espera B1)

**Files:**
- Modify: `src/features/match/combat/combatMessages.ts` (`QueuedAction`)
- Modify: `src/features/match/combat/normalizeWire.ts` (`normalizeQueuedAction`)
- Modify: `src/features/match/combat/QueuePanel.tsx`
- Modify: `src/features/match/combat/useGameTable.ts` (fantasmas)
- Modify: `src/pages/GameMasterPage.tsx` (tira `describeQueued`)
- Test: `normalizeWire.test.ts`, `combatOrganisms.test.tsx`, `GameMasterPage.test.tsx`

**Interfaces:**
- Consumes: T10 (`HistoryAction`, `RollCheck`).
- Produces: `QueuedAction = { actionId: string; actorId: string; bars: Bar[]; action?: QueuedActionDetail }` — `QueuedActionDetail` = `HistoryAction` + os campos que B1 acrescentar, com os nomes do contrato.

- [ ] **Step 1: ler o contrato.** `docs/dev/api/match-combat-ws.md`, seções `action_queued` e
  `match_full_state` (`queue`); `match-history.md` (formato de `move`). Anotar: nome do campo que
  carrega a action (o spec assume `action`), os nomes das velocidades derivadas (`actionSpeed`,
  `moveSpeed`?), onde está o `hit`, e o formato de `move` (categoria, origem, destino). Se a action
  **não** reusar o formato do histórico, pare (o documento mestre manda reusar).
- [ ] **Step 2: tipos e normalização.** Estender `HistoryAction.move` com o formato documentado
  (troca o `unknown` da T10) e declarar `QueuedActionDetail`. `normalizeQueuedAction` normaliza as
  listas não-`omitempty` que o contrato apontar (padrão R33 do arquivo). Teste em
  `normalizeWire.test.ts`: um `action_queued` com a action completa e uma lista `null` vira `[]`.
- [ ] **Step 3: card expansível (teste primeiro).** `QueuePanel`: cada `Row` ganha
  `aria-expanded` e um botão "Detalhes" (o nome do ator continua); expandido mostra, a partir de
  `action.action`: alvos por nome, arma (`humanWeapon`), movimento (categoria + `formatSlot` do
  destino), perícias (nomes), `actionSpeed` (perícia, `attempts.primary.join(" + ")`, total),
  `moveSpeed` (idem), a chave na ordem geral (a primeira `bars.order` com o mesmo `actorId` e as
  mesmas barras — `QueuePanel` ganha a prop `order: BarsPayload["order"]`) e as barras que cobra.
  Sem `action` (servidor antigo), o card fica como hoje. Teste em `combatOrganisms.test.tsx`:
  expandir mostra arma, destino e o total da velocidade.
- [ ] **Step 4: fantasma do mestre.** Em `useGameTable`, `ghosts` passa a juntar
  `state.queue` com `action.move` (destino do contrato) — excluindo `actionId`s que já estão em
  `state.declared` —, com o mesmo `{ from: posição atual da peça, to }`. Teste de página do mestre:
  um `action_queued` com movimento faz o stub do mapa receber `intentGhosts` com aquele destino
  (acrescente `data-ghosts={JSON.stringify(props.intentGhosts ?? [])}` ao stub). O fantasma some no
  `turn_opened` (a fila já tira a ação).
- [ ] **Step 5: tirar `describeQueued`** de `GameMasterPage` e a prop `describe` de `QueuePanel`.
- [ ] **Step 6:** `npm run test` → PASS; **browser**: mestre vê a ação de um jogador na fila com
  arma, alvo, destino e velocidades, e o fantasma no mapa; o **jogador não vê** velocidade nenhuma
  da própria ação antes de abrir.
- [ ] **Step 7: commit** `feat(combate): a fila do mestre mostra a ação inteira e o fantasma dela (F1)`.

### Task 14: F10 — a lista de declaradas segue o servidor (espera B12)

**Files:**
- Modify: `combatMessages.ts` (`MatchFullStatePayload`), `normalizeWire.ts`, `combatReducer.ts`
- Modify: `actionDraft.ts` (`draftFromDeclared`), `useActionComposerState.ts` (`restoreDraftFor`)
- Modify: `useGameTable.ts`, `GamePlayerPage.tsx`, `GameMasterPage.tsx`
- Create: `src/features/match/combat/LostDeclaredNotice.tsx`
- Test: `combatReducer.test.ts`, `actionDraft.test.ts`, `GamePlayerPage.test.tsx`

**Interfaces:**
- Produces: `CombatState.lostDeclared: DeclaredAction[]`; ação `LOST_DECLARED_DISMISSED`;
  `draftFromDeclared(d: Pick<DeclaredAction, "move" | "attack">): ActionDraft`;
  `useActionComposerState().restoreDraftFor(actorId: string, draft: ActionDraft): void`.

- [ ] **Step 1: ler o contrato** de `match_full_state` (o campo novo de B12 com as ações do dono).
  Anotar nome e formato. O spec assume uma lista de IDs de ação do dono (com o que ele declarou).
- [ ] **Step 2: reducer (teste primeiro).** Em `match_full_state`, quando o campo de B12 **vier**:
  `declared` = `queued` cujo `id` está na lista + `open` do turno aberto; as `queued` que não estão
  vão para `lostDeclared` (acumula; sem duplicar por `id`). Quando o campo **não vier** (servidor
  antigo), o comportamento de hoje. Testes: (a) servidor tem a ação → fica; (b) não tem → sai e
  entra em `lostDeclared`; (c) `LOST_DECLARED_DISMISSED` limpa; (d) sem o campo, nada muda.
- [ ] **Step 3: `draftFromDeclared` (teste primeiro).**
  ```ts
  /** O rascunho de uma declarada que o servidor perdeu — para o jogador declarar de novo (B12). */
  export function draftFromDeclared(d: Pick<DeclaredAction, "move" | "attack">): ActionDraft {
    return {
      moveMode: d.move ? "manual" : "none",
      ...(d.move ? { to: d.move.to, category: d.move.category } : {}),
      ...(d.attack ? { attack: { targets: [...d.attack.targets], weapon: d.attack.weapon } } : {}),
    };
  }
  ```
  Testes: só movimento; só ataque; os dois; `interact` é ignorado (não vem do compositor).
- [ ] **Step 4: `restoreDraftFor`** em `useActionComposerState`:
  ```ts
  /** Devolve um rascunho perdido — só se o do ator estiver vazio (não atropela o que o jogador começou). */
  const restoreDraftFor = useCallback((actor: string, next: ActionDraft) => {
    if (!matchId) return;
    const isEmpty = (d: ActionDraft) => d.moveMode === "none" && !d.attack;
    if (actor === actorId) {
      if (isEmpty(draft)) updateDraft(next);
      return;
    }
    if (isEmpty(loadDraft(matchId, actor))) saveDraft(matchId, actor, next);
  }, [matchId, actorId, draft, updateDraft]);
  ```
  Retornar `restoreDraftFor`. Teste em `actionDraft.test.ts` ou num teste de hook: rascunho vazio
  é substituído; rascunho com destino não é.
- [ ] **Step 5: aviso e restauração.** Em `useGameTable`, um efeito sobre `state.lostDeclared`:
  para cada ator, a perdida mais recente (`at` maior) → `composer.restoreDraftFor(actorId,
  draftFromDeclared(d))`, uma vez por `id` (ref com os ids já tratados). `LostDeclaredNotice`
  (banner persistente, `role="status"`, com ×): "O servidor perdeu {n} ação(ões) que você tinha
  declarado. O rascunho voltou para o compositor — confira e declare de novo." × →
  `LOST_DECLARED_DISMISSED`. Montar no `stage` das duas páginas, abaixo do `MatchErrorBanner`.
  **Nenhum** envio a partir daqui (I7) — teste de página: depois do `match_full_state` que perde a
  ação, `ws.sent("enqueue_action")` continua com o mesmo tamanho.
- [ ] **Step 6:** `npm run test` → PASS; **browser**: jogador declara, servidor reinicia, o
  jogador vê o aviso, a ação some da lista e o rascunho volta; nada é reenviado; o mestre vê a
  fila vazia.
- [ ] **Step 7: commit** `feat(combate): a lista de declaradas segue o servidor (F10)`.

### Task 15: F4 (parte 2) — cena, regime e round do REST; o `move` no histórico (espera B15)

**Files:** `src/types/matchHistory.ts`, `historyRows.ts`, `EventStream.tsx`, testes.

- [ ] **Step 1: ler o contrato** `match-history.md`: onde B15 põe troca de regime, troca de cena
  e round fechado na árvore (nomes, forma, hora), os valores de `category`/`mode` corrigidos, e o
  formato de `move`.
- [ ] **Step 2: tipos.** Acrescentar os eventos persistidos a `matchHistory.ts` como o contrato
  disser; `HistoryAction.move` com o formato documentado (se a T13 já fez, reusar).
- [ ] **Step 3: `historyRows` (teste primeiro).** Os eventos persistidos viram linhas `rest`, com
  a hora do contrato; `round_closed`, `round_mode_changed` e `scene_changed` entram em
  `TURN_DERIVED` renomeado para `REST_COVERED` (mesma regra do fetch posterior — confirme no
  contrato que o servidor persiste **antes** de emitir; se não, pare). Uma cena sem turno aparece.
  Testes: os três eventos vindos do REST; o ao vivo correspondente sai com fetch posterior e fica
  com fetch anterior.
- [ ] **Step 4: `EventStream`** desenha as linhas novas com os textos que o ao vivo já usa
  (`Fim do round`, `Regime: …`, `Cena: …`) e `turnLine` descreve o movimento com destino
  (`mover para ${formatSlot(to, gridKind)} (${category})`).
- [ ] **Step 5:** `npm run test` → PASS; **browser**: trocar regime, cena, fechar round; recarregar
  — as três linhas voltam.
- [ ] **Step 6: commit** `feat(combate): o histórico guarda cena, regime e round (F4)`.

### Task 16: F13 + F16 — o tabuleiro é do servidor (espera B14)

**Files:** `src/hooks/useMatchWs.ts`, `src/features/match/combat/useGameTable.ts`,
`src/features/match/combat/useLiveMapSync.ts`, `src/pages/LobbyPage.tsx`,
`src/features/match/MatchMapsPanel.tsx`, testes.

- [ ] **Step 1: ler o contrato**: `maps.md`/`match-maps.md`/`game-lobby.md` e `match-combat-ws.md`
  — confirmar que `map_state_sync` não escreve mais no servidor, que `map_full_state` sai em toda
  conexão com o tabuleiro da partida, e o erro de REST ao trocar o mapa anexado depois do
  `start_match` (status + `detail`).
- [ ] **Step 2: F13 (teste primeiro).** Teste em `useMatchWs.test.ts`: o mestre conectando **não**
  manda `map_state_sync`. Remover de `useMatchWs`: `board` (option), `boardRef`,
  `connGotMapFullStateRef`, `connRegisterDoneRef`, `connBoardSyncSentRef`, `sendBoardSync`,
  `maybeSyncBoard`, o `useEffect` do `board` e a chamada no ramo `match_full_state`; o tipo
  `MatchBoardSync` se ficar sem uso. **Manter** o watchdog de socket mudo. Em `useGameTable`, sai o
  `board`; em `useLiveMapSync`, sai `seedFromRest` (as duas páginas desenham só o que o servidor
  manda). Os comentários longos que explicavam o sync saem junto do código que explicavam; **TODOs
  não se removem** — se houver algum nesse código, mova-o para perto do que sobrar ou reporte.
- [ ] **Step 3: F16 (teste primeiro).** Teste em `LobbyPage.test.tsx`: iniciar a partida **não**
  chama `PATCH/PUT` do mapa (conte chamadas no handler MSW do mapa). Remover a chamada
  `mapsService.updateMap(... { pieces: lobbyPieces })` e o que só existia para ela.
- [ ] **Step 4: `MatchMapsPanel`.** Com a partida iniciada (`match.gameStartAt`), esconder a troca
  de mapa; se a recusa vier mesmo assim, mostrar `getApiErrorDetail(err)` mapeado para
  "O mapa não pode ser trocado depois que a partida começou." Teste de página em
  `MatchPage.test.tsx`.
- [ ] **Step 5:** `npm run test` → PASS; **browser**: mestre recarrega no meio da partida e o
  tabuleiro volta do servidor; reiniciar o servidor → posições, portas e fog voltam (B3); o mapa
  da campanha no editor continua com o desenho original depois de uma partida.
- [ ] **Step 6: commit** `feat(combate): o tabuleiro vem do servidor; o lobby não grava no mapa da campanha (F13, F16)`.

### Task 17: F12 — o mestre arrasta, põe e tira peças — **opus**

**Files:** `src/pages/GameMasterPage.tsx`, `src/features/match/combat/combatMessages.ts`
(`MasterActionPayload`), `useMatchCombat.ts`, `MasterControls.tsx` (painel Arrumar), novo
`src/features/match/combat/ArrangeConfirmDialog.tsx`, `mapCanvasStyles.ts` (botão), testes. A zona
Pixi (`PiecesLayer` etc.) **não** é modificada: usa-se o que o placer do lobby já usa
(`draggablePieceIds`, `onPieceMove`, `placingNpcId`, `onNpcPlaced`) — se `TacticalMapViewer` não
repassar alguma dessas props ao `TacticalMapStage`, acrescente o repasse (só o repasse).

- [ ] **Step 1: ler o contrato** de `enqueue_master_action` (B9/B14): formato do `move` (quem
  move — `targetIds`? `characterId`?, origem, destino), como se **põe** (move de personagem sem
  peça) e como se **tira** peça, e a confirmação (`master_action_enqueued`) e os erros.
- [ ] **Step 2: estado do modo (teste primeiro, de página).** `const [arranging, setArranging] =
  useState(false)`; `pending: { kind: "move" | "place" | "remove"; characterId; to?: SlotTriple } | null`.
  Botão "Arrumar" (`MapCornerButton`, ao lado de "Enquadrar", `aria-pressed`). No modo: `actorId`
  é solto; `draggablePieceIds` = todas as peças; `onPieceLongPress` não é passado; `onPieceSelect`
  seleciona a peça para tirar; `onPieceMove(pieceId, slot)` → `pending = { kind: "move", … }`
  (a peça **não** muda de lugar — nada em `livePieces` é tocado); o painel mostra "Arrumar o
  tabuleiro". Fora do modo, tudo como hoje. `Esc` sai do modo. Testes: entrar no modo muda
  `data-draggable-piece-ids` do stub para todas as peças; soltar (o stub ganha um botão
  `move-piece-${id}` que chama `props.onPieceMove?.(id, { kind: "square", col: 2, row: 2 })`)
  abre o diálogo e **não** envia nada.
- [ ] **Step 3: confirmação.** `ArrangeConfirmDialog` (mesma casca de `SceneChangeDialog`):
  "Mover {nome} para {formatSlot}?" / "Pôr {nome} em …?" / "Tirar {nome} do mapa?" — Confirmar
  envia `combat.send.masterAction(<payload do contrato>)`; Cancelar limpa `pending`. Testes: os
  três caminhos enviam exatamente o payload do contrato; cancelar não envia.
- [ ] **Step 4: pôr.** O painel Arrumar lista os participantes **sem peça** (`participants` menos
  `boardPieces.characterId`); escolher um liga `placingNpcId` no viewer (o nome da prop é do
  placer — aceita qualquer personagem); `onNpcPlaced(slot)` → `pending = { kind: "place", … }`.
- [ ] **Step 5: tirar.** Com uma peça selecionada no modo, botão "Tirar do mapa" →
  `pending = { kind: "remove", … }`.
- [ ] **Step 6: resiliência.** `pending` é zerado ao sair do modo e em todo `match_full_state`
  (use o `onFullState` da T3 — acrescente um segundo consumidor via ref na página, ou exponha um
  contador `fullStateSeq` no retorno de `useGameTable`). `master_action_enqueued` → a página do
  jogador ignora (o `IGNORED` de `useMatchWs` ou um ramo explícito que não faz nada); a do mestre
  não precisa de estado (a peça se move pelo `piece_moved` do servidor).
- [ ] **Step 7:** `npm run test` → PASS; **browser (a única evidência — Pixi sem teste)**: arrastar
  com e sem turno aberto, pôr o NPC que entrou por `add_npc`, tirar a peça de um jogador; em todos,
  nada muda antes de confirmar, e depois de confirmar a peça muda nas **três** telas (com fog); no
  celular, o modo não briga com o segurar (fora do modo o segurar marca alvos como antes).
- [ ] **Step 8: commit** `feat(combate): o mestre arrasta, põe e tira peças com confirmação (F12)`.

### Task 18: F14 — o mestre escolhe onde cai o escape que falhou (espera B13)

**Files:** `combatMessages.ts` (resolução + verbo), `useMatchWs.ts`/`useMatchCombat.ts` (verbo),
`ResolutionDetails.tsx`, `QueuePanel.tsx`, `GameMasterPage.tsx`, testes.

- [ ] **Step 1: ler o contrato**: como `resolution_updated` marca o escape que falhou ("posição
  final a critério do mestre"), qual verbo o mestre manda para escolher o slot, e como ele aparece
  no histórico.
- [ ] **Step 2: tipos + verbo (teste primeiro)** em `useMatchWs.test.ts`: o verbo manda o formato do
  contrato.
- [ ] **Step 3: card da ação em andamento (teste primeiro).** `ResolutionDetails` ganha a prop opcional
  `onChooseFallSlot?: (targetId: string) => void` e, para o alvo marcado, um destaque "Escape falhou
  — posição final a critério do mestre" com o botão "Escolher onde cai" (é o primeiro botão do
  cálculo, e só aparece nesse caso; fora dele o cálculo continua sem botão nenhum). `QueuePanel`
  repassa `onChooseFallSlot` ao `ResolutionDetails` do card em andamento. Mostrar o slot já
  escolhido, se a resolução o trouxer.
- [ ] **Step 4: modo de escolha na página.** `const [choosingFall, setChoosingFall] =
  useState<string | null>(null)` (o `targetId`). Nesse modo: o ator é solto; `onEmptySlotClick`
  escolhe (`intentPreview` mostra o slot; um diálogo curto confirma e envia o verbo); `onPieceSelect`
  e `onPieceLongPress` não são passados; `Esc`/× cancela. Não é o modo Arrumar (T17): os dois
  não podem estar ligados juntos — entrar num sai do outro. Teste de página: clicar "Escolher onde
  cai", clicar no slot vazio do stub, confirmar → o verbo sai com o slot.
- [ ] **Step 5:** `npm run test` → PASS; **browser**: um escape que falha (jogador escapa de um ataque
  e falha no movimento) → o mestre escolhe o slot → no fechamento a peça vai para lá; sem escolha,
  fica onde estava; o golpe entra (B13).
- [ ] **Step 6: commit** `feat(combate): o mestre escolhe onde cai o escape que falhou (F14)`.

### Task 19: F15 — começar uma partida de onde outra terminou (espera B16)

**Files:** `src/services/*` (o endpoint), um hook, `MatchMapsPanel.tsx`, testes.

- [ ] **Step 1: ler o contrato** de B16 (`match-maps.md` ou onde o back documentar): como listar as
  partidas elegíveis (mesma campanha, mesmo mapa) e como pedir a herança.
- [ ] **Step 2: serviço + hook (teste primeiro)**, no padrão de `matchService`/`useMatchParticipants`.
- [ ] **Step 3: UI (teste primeiro).** Em `MatchMapsPanel`, ao anexar um mapa numa partida **não
  iniciada**: "Continuar o tabuleiro de…" com a lista (título + data); vazio → a opção não aparece.
  Erros por `getApiErrorDetail`.
- [ ] **Step 4:** `npm run test` → PASS; **browser**: partida A termina com peças movidas e uma
  porta aberta; partida B herda; o lobby de B mostra o tabuleiro de A.
- [ ] **Step 5: commit** `feat(combate): uma partida começa de onde outra terminou (F15)`.

---

### Task 20: documentação, verificação e PR (controlador)

- [ ] **Step 1: doc do front.** Criar `docs/dev/match/combate-fechamento-fase-6.md` (PT-BR): o que
  cada F entregou, as decisões do spec §10, a regra de sobreposição do histórico, o modo Arrumar,
  o que não tem teste (Pixi: arrastar/pôr/tirar, fantasma do mestre, escolha do slot do escape).
  Em `docs/dev/match/combate-fase-6.md`, na seção "Exceções declaradas ao invariante I2", item 3
  (R25): acrescentar que o fechamento passou `ownPlayerUuid`, então o card do dono é clicável. Em
  `CLAUDE.md` do repo, na seção "Feature: match combat", apontar também para o doc novo.
- [ ] **Step 2: `npm run test`, `npm run lint`, `npm run build`** — colar a contagem de testes.
- [ ] **Step 3: verificação no browser** — spec §8, inteira, com três contas; subir back
  (`make run-dev` no `System_X_System`, api 5000 + game) e front (`npm run dev`). **A partida é
  criada do zero e o NPC entra pelo mapa no lobby.** Registrar cada item: feito / não feito / por quê.
- [ ] **Step 4: revisão final do branch** (superpowers:requesting-code-review), e corrigir o que ela
  achar.
- [ ] **Step 5: PR** no `System_X_System_React`: o que foi verificado e **o que não foi**; linkar o
  PR de back e o PR #80. Se sobrou qualquer item não verificado: `./dev-checkout.sh
  feat/combat-phase-6-closure` a partir de `System_X_System_Project/`, e dizer no PR o que o dono
  do produto deve olhar.
- [ ] **Step 6:** conferir `git worktree list` e matar servidores de worktrees (se alguma foi criada).
