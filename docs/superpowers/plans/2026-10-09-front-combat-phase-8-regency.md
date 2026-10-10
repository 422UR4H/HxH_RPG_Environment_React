# Fase 8 do combate no front — Regência — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** o mestre edita, no painel de resolução do turno aberto, o viés/ajuste/motivo de cada
rolagem que muda o desfecho e troca a perícia do dano (Push ↔ Grab) — o painel fica completo.

**Architecture:** um módulo puro (`rollEdits.ts`) decide o que é editável a partir do
`ResolutionPayload` e monta os payloads de `edit_action`; um editor inline
(`RollConditionEditor`) coleta viés/ajuste/motivo; o `ResolutionDetails` ganha as linhas
editáveis, o bloco Dano com o seletor de perícia, e uma prop `onEditAction` repassada pelo
`QueuePanel` a partir de `combat.send.editAction` no `GameMasterPage`. Sem estado otimista: o
número e o resumo em vigor vêm do `resolution_updated`/`match_full_state` (campos `conditions` e
`damageSkill` do back, PR #85).

**Tech Stack:** React 19 + TypeScript (strict, `verbatimModuleSyntax`), styled-components,
vitest + Testing Library.

**Spec:** [`docs/superpowers/specs/2026-10-09-front-combat-phase-8-regency-design.md`](../specs/2026-10-09-front-combat-phase-8-regency-design.md)
— leia antes da primeira tarefa. Contrato: `../System_X_System/docs/dev/api/match-combat-ws.md`
(`edit_action`, `resolution_updated`), no checkout do back (branch `feat/combat-phase-8-regency-back`).

**Branch:** `feat/combat-phase-8-regency` (criada a partir de `main` em `f37bddf`).

## Global Constraints

- TS strict; `verbatimModuleSyntax` — **tipo só com `import type`**; `noUnusedLocals`/`noUnusedParameters`.
- `styled-components` só; **cores e fontes por tokens** (`src/styles/tokens.ts`: `colors`, `fonts`) — nada de hex/rgba cru.
- Tudo em `src/features/match/combat/` (feature do mestre; nada promovido a `components/`).
- Texto de UI em PT-BR. Comentários explicam o porquê, no tom e densidade dos vizinhos.
- Wire camelCase, sem conversão. **Sem estado otimista** (spec F4).
- `ResolutionDetails` **sem `onEditAction` não desenha nenhum botão de edição** (o teste existente "sem onOpenReaction, não tem botão nenhum fora de uma fuga que falhou" continua passando).
- Verificação por tarefa: `npx vitest run <arquivos da tarefa>`, depois `npm run lint` e `npx tsc -b`. Antes do commit: `npm run test` (suíte inteira).
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A ação do turno sem `actionId`** — a condição em vigor do acerto/dano tem que ser achada mesmo sem o ID da ação na mão (a entrada de `conditions` cujo `actionId` não é reação nenhuma). Teste em T1.
2. **Viés escondido onde não cabe** — dano, defesa padrão e o movimento do `closedEscape` não mostram os botões de viés e o payload nunca leva `bias`. Testes em T1 e T2.
3. **Desfazer manda a entrada zerada** (`{ field }`, sem `bias`/`modifier`/`description`), com o `actionId` certo para reação. Teste em T1 e T3.
4. **O editor fecha quando a rolagem some** (turno mudou / reação saiu). Teste em T3.
5. **Nada de `Evasion`, `speed`, `feint`, perícia, nem reação pendente** vira linha editável. Teste em T1.

---

### Task 1: tipos e o modelo puro `rollEdits.ts` (spec §2.1)

**Files:**
- Modify: `src/features/match/combat/combatMessages.ts` (`ResolutionPayload`, `EditActionPayload`, tipos novos)
- Create: `src/features/match/combat/rollEdits.ts`
- Test: `src/features/match/combat/__tests__/rollEdits.test.ts`

**Interfaces:**
- Produces (usados por T2 e T3):
  - `type ConditionField = "speed" | "hit" | "damage" | "dodge" | "defense" | "repel" | "feint" | "moveSpeed"`
  - `type RollCondition = { bias: number; modifier: number; description?: string }`
  - `type ConditionEntry = { actionId: string; field?: ConditionField; skillName?: string } & RollCondition` (o que vem em `resolution.conditions`)
  - `type ConditionEdit = { field: ConditionField; bias?: number; modifier?: number; description?: string }`
  - `ResolutionPayload.damageSkill?: string`, `ResolutionPayload.conditions?: ConditionEntry[]`
  - `EditActionPayload = { actionId?: string; conditions?: ConditionEdit[]; damageSkill?: string; escapeLanding?: { position: [number, number, number] | null } }`
  - `type EditableRoll = { key: string; actionId?: string; field: ConditionField; label: string; allowsBias: boolean; current?: RollCondition; targetId?: string }`
  - `editableRolls(res: ResolutionPayload): EditableRoll[]`
  - `conditionPayload(roll: EditableRoll, draft: RollCondition): EditActionPayload`
  - `clearPayload(roll: EditableRoll): EditActionPayload`
  - `damageSkillPayload(skill: string): EditActionPayload`
  - `describeCondition(c: RollCondition): string`
  - `isNeutral(c: RollCondition): boolean`

- [ ] **Step 1: tipos** — em `combatMessages.ts`, antes de `ResolutionPayload`:

```ts
/** As rolagens que `edit_action.conditions[].field` nomeia (contrato). */
export type ConditionField = "speed" | "hit" | "damage" | "dodge" | "defense" | "repel" | "feint" | "moveSpeed";

/** A condição do mestre numa rolagem: viés nos dados (−1/0/+1), ajuste no total, motivo. */
export type RollCondition = { bias: number; modifier: number; description?: string };

/**
 * Uma condição EM VIGOR no turno aberto (`resolution.conditions`, só o mestre). `actionId` é
 * sempre o ID real — o da ação do turno também. `field` e `skillName` são alternativos.
 */
export type ConditionEntry = { actionId: string; field?: ConditionField; skillName?: string } & RollCondition;

/** Uma entrada de `edit_action.conditions`. Zerada (só `field`) = volta a "sem condição". */
export type ConditionEdit = { field: ConditionField; bias?: number; modifier?: number; description?: string };
```

Em `ResolutionPayload`, depois de `errors?`:

```ts
  /**
   * A perícia que mediu o dano ("Push" se o mestre não trocou). Presente SÓ quando a ação tem
   * ataque — é assim que o painel sabe que há acerto e dano para editar.
   */
  damageSkill?: string;
  /** As condições do mestre em vigor. Só o mestre, só com o turno aberto; ausente = nada editado. */
  conditions?: ConditionEntry[];
```

Troque `EditActionPayload` e o comentário dele por:

```ts
/**
 * `edit_action` (c→s, só o mestre). Toda seção é opcional. `actionId` ausente = a ação
 * própria do turno; senão, o id de uma reação. `conditions` se aplica POR ROLAGEM, e uma
 * entrada zerada (`{ field }`) desfaz a edição daquela rolagem. `damageSkill` troca a perícia
 * do dano. `escapeLanding` (F14): `actionId` é o da reação de fuga; `position: null` limpa.
 * `skills`/`targetIds` existem no contrato e ficam fora: editar perícias espera a corrente de
 * testes, e alvos não estão no escopo da Fase 8.
 */
export type EditActionPayload = {
  actionId?: string;
  conditions?: ConditionEdit[];
  damageSkill?: string;
  escapeLanding?: { position: [number, number, number] | null };
};
```

(O envio de F14 em `GameMasterPage.tsx` continua compilando: ele manda `actionId` e `escapeLanding`.)

- [ ] **Step 2: Failing test** — `src/features/match/combat/__tests__/rollEdits.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ResolutionPayload, ResolutionTarget } from "../combatMessages";
import {
  clearPayload, conditionPayload, damageSkillPayload, describeCondition, editableRolls, isNeutral,
} from "../rollEdits";

const target = (targetId: string, kind?: string, reactionId = `r-${targetId}`): ResolutionTarget => ({
  targetId, avoided: false, defended: false, dodgeTotal: 11, defenseTotal: 11,
  rawDamage: 10, defenseApplied: 0, projectedDamage: 10,
  reaction: kind ? { kind, total: 12, reactionId, margin: 0, difference: 0, stopsAttack: false } : undefined,
});

const base = (over: Partial<ResolutionPayload> = {}): ResolutionPayload => ({
  turnId: "t1", isSettled: false, targets: [], damageSkill: "Push", ...over,
});

const fields = (res: ResolutionPayload) => editableRolls(res).map((r) => `${r.actionId ?? "action"}:${r.field}`);

describe("editableRolls", () => {
  it("a ação com ataque tem acerto (com viés) e dano (sem viés), sem actionId", () => {
    const rolls = editableRolls(base());
    expect(rolls.map((r) => [r.field, r.actionId, r.allowsBias])).toEqual([
      ["hit", undefined, true],
      ["damage", undefined, false],
    ]);
  });

  it("sem damageSkill a ação não tem ataque: nada de acerto nem dano", () => {
    expect(fields(base({ damageSkill: undefined }))).toEqual([]);
  });

  it("cada tipo de reação aberta ganha as rolagens da tabela do contrato", () => {
    const res = base({
      damageSkill: undefined,
      targets: [
        target("a", "dodge"), target("b", "closedDodge"), target("c", "escape"),
        target("d", "escapeGuard"), target("e", "closedEscape"), target("f", "repel"), target("g", "nothing"),
      ],
    });
    expect(fields(res)).toEqual([
      "r-a:dodge", "r-a:defense",
      "r-b:dodge", "r-b:defense",
      "r-c:dodge", "r-c:moveSpeed",
      "r-d:dodge", "r-d:defense", "r-d:moveSpeed",
      "r-e:dodge", "r-e:moveSpeed",
      "r-f:repel",
    ]);
  });

  it("viés só onde a leitura é rolada", () => {
    const res = base({ damageSkill: undefined, targets: [target("d", "escapeGuard"), target("e", "closedEscape")] });
    const bias = Object.fromEntries(editableRolls(res).map((r) => [r.key, r.allowsBias]));
    expect(bias).toEqual({
      "r-d:dodge": true, "r-d:defense": false, "r-d:moveSpeed": true,
      "r-e:dodge": true, "r-e:moveSpeed": false,
    });
  });

  it("nas fechadas a esquiva se chama Reflexo", () => {
    const res = base({ damageSkill: undefined, targets: [target("a", "dodge"), target("b", "closedDodge")] });
    const labels = editableRolls(res).filter((r) => r.field === "dodge").map((r) => r.label);
    expect(labels).toEqual(["Esquiva", "Reflexo"]);
  });

  it("alvo sem reação aberta e reação pendente não ganham linha", () => {
    const res = base({
      damageSkill: undefined,
      targets: [target("a")],
      pendingReactions: [{ reactionId: "p1", actorId: "a", kind: "dodge" }],
    });
    expect(fields(res)).toEqual([]);
  });

  it("casa a condição em vigor — reação pelo actionId, ação pela entrada que não é de reação", () => {
    const res = base({
      targets: [target("a", "dodge")],
      pendingReactions: [{ reactionId: "p1", actorId: "z", kind: "dodge" }],
      conditions: [
        { actionId: "act-1", field: "hit", bias: 1, modifier: -2, description: "escuridao" },
        { actionId: "r-a", field: "dodge", bias: 0, modifier: 3 },
        { actionId: "p1", field: "dodge", bias: -1, modifier: 0 },
        { actionId: "act-1", skillName: "Evasion", bias: 1, modifier: 0 },
      ],
    });
    const byKey = Object.fromEntries(editableRolls(res).map((r) => [r.key, r.current]));
    expect(byKey["action:hit"]).toEqual({ bias: 1, modifier: -2, description: "escuridao" });
    expect(byKey["action:damage"]).toBeUndefined();
    expect(byKey["r-a:dodge"]).toEqual({ bias: 0, modifier: 3, description: undefined });
    expect(byKey["r-a:defense"]).toBeUndefined();
  });
});

describe("payloads", () => {
  const [hit, damage] = editableRolls(base());
  const reactionRoll = editableRolls(base({ damageSkill: undefined, targets: [target("a", "escapeGuard")] }))
    .find((r) => r.field === "defense")!;

  it("acerto: sem actionId, com viés, ajuste e motivo", () => {
    expect(conditionPayload(hit, { bias: 1, modifier: -2, description: " escuridao " })).toEqual({
      conditions: [{ field: "hit", bias: 1, modifier: -2, description: "escuridao" }],
    });
  });

  it("dano e defesa padrão nunca levam viés", () => {
    expect(conditionPayload(damage, { bias: 1, modifier: 4 })).toEqual({
      conditions: [{ field: "damage", modifier: 4 }],
    });
    expect(conditionPayload(reactionRoll, { bias: -1, modifier: 2 })).toEqual({
      actionId: "r-a", conditions: [{ field: "defense", modifier: 2 }],
    });
  });

  it("tudo neutro vira a entrada zerada", () => {
    expect(conditionPayload(hit, { bias: 0, modifier: 0, description: "  " })).toEqual(clearPayload(hit));
  });

  it("desfazer é a entrada zerada, com o actionId da reação", () => {
    expect(clearPayload(hit)).toEqual({ conditions: [{ field: "hit" }] });
    expect(clearPayload(reactionRoll)).toEqual({ actionId: "r-a", conditions: [{ field: "defense" }] });
  });

  it("perícia do dano", () => {
    expect(damageSkillPayload("Grab")).toEqual({ damageSkill: "Grab" });
  });
});

describe("describeCondition / isNeutral", () => {
  it("resume viés, ajuste e motivo", () => {
    expect(describeCondition({ bias: 1, modifier: -2, description: "escuridao" })).toBe("vantagem · −2 · escuridao");
    expect(describeCondition({ bias: -1, modifier: 3 })).toBe("desvantagem · +3");
    expect(describeCondition({ bias: 0, modifier: 0, description: "nota" })).toBe("nota");
  });
  it("neutro = sem viés, sem ajuste, sem motivo", () => {
    expect(isNeutral({ bias: 0, modifier: 0 })).toBe(true);
    expect(isNeutral({ bias: 0, modifier: 0, description: " " })).toBe(true);
    expect(isNeutral({ bias: 0, modifier: 1 })).toBe(false);
  });
});
```

- [ ] **Step 3: Run** — `npx vitest run src/features/match/combat/__tests__/rollEdits.test.ts`: falha (módulo não existe).

- [ ] **Step 4: Implement** — `src/features/match/combat/rollEdits.ts`:

```ts
import type {
  ConditionField, EditActionPayload, ResolutionPayload, RollCondition,
} from "./combatMessages";

/**
 * Uma rolagem que o mestre pode editar no painel do turno aberto (Fase 8). `actionId` ausente
 * = a ação própria do turno (o `edit_action` também aceita a ação sem id). `allowsBias` é
 * falso onde a leitura não tem dado para o viés escolher: o dano (o servidor recusa), a defesa
 * padrão e o movimento do `closedEscape` (passivas).
 */
export type EditableRoll = {
  key: string;
  actionId?: string;
  field: ConditionField;
  label: string;
  allowsBias: boolean;
  current?: RollCondition;
  /** O alvo cuja reação é dona da rolagem; ausente na ação. */
  targetId?: string;
};

type RollSpec = { field: ConditionField; label: string; allowsBias: boolean };

// A tabela "o que cada rolagem muda com o turno aberto" do contrato, por tipo de reação
// ABERTA. Fica de fora o que não muda nada (speed, feint, perícias) e a Evasion das fechadas
// (documento mestre §8: a corrente de testes vai redesenhá-la). Nas fechadas, `dodge` edita só
// o Reflexo — a esquiva lida é o pior entre Reflexo e Evasion —, daí o rótulo.
const REACTION_ROLLS: Record<string, RollSpec[]> = {
  dodge: [
    { field: "dodge", label: "Esquiva", allowsBias: true },
    { field: "defense", label: "Defesa padrão", allowsBias: false },
  ],
  closedDodge: [
    { field: "dodge", label: "Reflexo", allowsBias: true },
    { field: "defense", label: "Defesa padrão", allowsBias: false },
  ],
  escape: [
    { field: "dodge", label: "Esquiva", allowsBias: true },
    { field: "moveSpeed", label: "Movimento", allowsBias: true },
  ],
  escapeGuard: [
    { field: "dodge", label: "Esquiva", allowsBias: true },
    { field: "defense", label: "Defesa padrão", allowsBias: false },
    { field: "moveSpeed", label: "Movimento", allowsBias: true },
  ],
  closedEscape: [
    { field: "dodge", label: "Reflexo", allowsBias: true },
    { field: "moveSpeed", label: "Movimento", allowsBias: false },
  ],
  repel: [{ field: "repel", label: "Aparo", allowsBias: true }],
};

const ACTION_ROLLS: RollSpec[] = [
  { field: "hit", label: "Acerto", allowsBias: true },
  { field: "damage", label: "Dano", allowsBias: false },
];

const toCondition = (c: { bias: number; modifier: number; description?: string }): RollCondition => ({
  bias: c.bias, modifier: c.modifier, description: c.description,
});

/** O que o mestre pode editar agora, na ordem em que o painel mostra. */
export function editableRolls(res: ResolutionPayload): EditableRoll[] {
  const conditions = res.conditions ?? [];
  // A ação do turno vem em `conditions` com o próprio id, que o painel não tem à mão: é a
  // entrada cujo id não é de reação nenhuma do turno (aberta ou pendente).
  const reactionIds = new Set([
    ...res.targets.flatMap((t) => (t.reaction ? [t.reaction.reactionId] : [])),
    ...(res.pendingReactions ?? []).map((p) => p.reactionId),
  ]);
  const currentOf = (actionId: string | undefined, field: ConditionField) => {
    const hit = conditions.find((c) =>
      c.field === field && (actionId ? c.actionId === actionId : !reactionIds.has(c.actionId)));
    return hit ? toCondition(hit) : undefined;
  };

  const out: EditableRoll[] = [];
  // `damageSkill` só vem quando a ação tem ataque — sem ataque, não há acerto nem dano.
  if (res.damageSkill !== undefined) {
    for (const spec of ACTION_ROLLS) {
      out.push({ ...spec, key: `action:${spec.field}`, current: currentOf(undefined, spec.field) });
    }
  }
  for (const t of res.targets) {
    if (!t.reaction) continue;
    const reactionId = t.reaction.reactionId;
    for (const spec of REACTION_ROLLS[t.reaction.kind] ?? []) {
      out.push({
        ...spec, key: `${reactionId}:${spec.field}`, actionId: reactionId, targetId: t.targetId,
        current: currentOf(reactionId, spec.field),
      });
    }
  }
  return out;
}

const trimmed = (s?: string) => s?.trim() ?? "";

/** Sem viés, sem ajuste e sem motivo — o mesmo que "sem condição" para o servidor. */
export function isNeutral(c: RollCondition): boolean {
  return c.bias === 0 && c.modifier === 0 && trimmed(c.description) === "";
}

const withAction = (roll: EditableRoll, body: EditActionPayload): EditActionPayload =>
  roll.actionId ? { actionId: roll.actionId, ...body } : body;

/** Desfazer: a entrada zerada daquela rolagem. O servidor volta a "sem condição" e apaga a captura. */
export function clearPayload(roll: EditableRoll): EditActionPayload {
  return withAction(roll, { conditions: [{ field: roll.field }] });
}

/** O `edit_action` de uma rolagem. Chaves zeradas ficam de fora; tudo neutro é o desfazer. */
export function conditionPayload(roll: EditableRoll, draft: RollCondition): EditActionPayload {
  const bias = roll.allowsBias ? draft.bias : 0;
  const description = trimmed(draft.description);
  if (isNeutral({ bias, modifier: draft.modifier, description })) return clearPayload(roll);
  return withAction(roll, {
    conditions: [{
      field: roll.field,
      ...(bias !== 0 && { bias }),
      ...(draft.modifier !== 0 && { modifier: draft.modifier }),
      ...(description !== "" && { description }),
    }],
  });
}

export function damageSkillPayload(skill: string): EditActionPayload {
  return { damageSkill: skill };
}

/** U+2212, o mesmo sinal de menos do resto do painel. */
const signed = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);

/** O resumo curto de uma condição em vigor: "vantagem · −2 · escuridão". */
export function describeCondition(c: RollCondition): string {
  const parts: string[] = [];
  if (c.bias > 0) parts.push("vantagem");
  if (c.bias < 0) parts.push("desvantagem");
  if (c.modifier !== 0) parts.push(signed(c.modifier));
  if (trimmed(c.description)) parts.push(trimmed(c.description));
  return parts.join(" · ");
}
```

- [ ] **Step 5: Run** — o teste passa; `npm run lint`, `npx tsc -b`, `npm run test`.

- [ ] **Step 6: Commit**

```bash
git add src/features/match/combat/combatMessages.ts src/features/match/combat/rollEdits.ts src/features/match/combat/__tests__/rollEdits.test.ts
git commit -m "feat(combate): modelo das rolagens editáveis pelo mestre (Fase 8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: o editor inline `RollConditionEditor` (spec §2.2)

**Files:**
- Create: `src/features/match/combat/RollConditionEditor.tsx`
- Test: `src/features/match/combat/__tests__/RollConditionEditor.test.tsx`

**Interfaces:**
- Consumes: `EditableRoll`, `conditionPayload`, `clearPayload` (T1), `EditActionPayload`.
- Produces: `default function RollConditionEditor({ roll, onSend, onClose }: { roll: EditableRoll; onSend: (p: EditActionPayload) => void; onClose: () => void })`. "Aplicar" chama `onSend(conditionPayload(roll, draft))` e depois `onClose()`; "Desfazer edição" (só com `roll.current`) chama `onSend(clearPayload(roll))` e `onClose()`; "Cancelar" só `onClose()`.

- [ ] **Step 1: Failing test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RollConditionEditor from "../RollConditionEditor";
import type { EditableRoll } from "../rollEdits";

const hit: EditableRoll = { key: "action:hit", field: "hit", label: "Acerto", allowsBias: true };
const defense: EditableRoll = { key: "r1:defense", actionId: "r1", field: "defense", label: "Defesa padrão", allowsBias: false };

describe("RollConditionEditor", () => {
  it("aplica viés, ajuste e motivo e fecha", () => {
    const onSend = vi.fn();
    const onClose = vi.fn();
    render(<RollConditionEditor roll={hit} onSend={onSend} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Vantagem" }));
    fireEvent.change(screen.getByLabelText("Ajuste"), { target: { value: "-2" } });
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "escuridao" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(onSend).toHaveBeenCalledWith({ conditions: [{ field: "hit", bias: 1, modifier: -2, description: "escuridao" }] });
    expect(onClose).toHaveBeenCalled();
  });

  it("abre com a condição em vigor e desfaz", () => {
    const onSend = vi.fn();
    render(
      <RollConditionEditor
        roll={{ ...hit, current: { bias: -1, modifier: 3, description: "chuva" } }}
        onSend={onSend}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Desvantagem" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Ajuste")).toHaveValue(3);
    expect(screen.getByLabelText("Motivo")).toHaveValue("chuva");
    fireEvent.click(screen.getByRole("button", { name: "Desfazer edição" }));
    expect(onSend).toHaveBeenCalledWith({ conditions: [{ field: "hit" }] });
  });

  it("sem condição em vigor não oferece Desfazer", () => {
    render(<RollConditionEditor roll={hit} onSend={() => {}} onClose={() => {}} />);
    expect(screen.queryByRole("button", { name: "Desfazer edição" })).not.toBeInTheDocument();
  });

  it("leitura passiva: sem botões de viés, e o envio não leva viés", () => {
    const onSend = vi.fn();
    render(<RollConditionEditor roll={defense} onSend={onSend} onClose={() => {}} />);
    expect(screen.queryByRole("button", { name: "Vantagem" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ajuste"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(onSend).toHaveBeenCalledWith({ actionId: "r1", conditions: [{ field: "defense", modifier: 4 }] });
  });

  it("Cancelar fecha sem mandar", () => {
    const onSend = vi.fn();
    const onClose = vi.fn();
    render(<RollConditionEditor roll={hit} onSend={onSend} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onSend).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("ajuste vazio ou inválido conta como zero", () => {
    const onSend = vi.fn();
    render(<RollConditionEditor roll={hit} onSend={onSend} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText("Ajuste"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(onSend).toHaveBeenCalledWith({ conditions: [{ field: "hit" }] });
  });
});
```

- [ ] **Step 2: Run** — falha (componente não existe).

- [ ] **Step 3: Implement** — `RollConditionEditor.tsx`. Estrutura (ajuste estilos ao vizinho `ResolutionDetails`/`dialogStyles`, só tokens):

```tsx
import { useState } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { EditActionPayload } from "./combatMessages";
import { clearPayload, conditionPayload, type EditableRoll } from "./rollEdits";

const BIAS_OPTIONS = [
  { value: -1, label: "Desvantagem" },
  { value: 0, label: "Normal" },
  { value: 1, label: "Vantagem" },
] as const;

/**
 * O editor de uma rolagem do turno aberto (Fase 8): viés, ajuste e motivo. Inline, embaixo da
 * linha, um por vez no painel. Não guarda nada: "Aplicar" manda o `edit_action` e fecha — o
 * número e o resumo em vigor voltam pelo `resolution_updated`. "Desfazer edição" manda a
 * entrada zerada (o servidor volta a "sem condição"). O viés some onde a leitura é passiva ou
 * é o dano: lá não há dado para escolher.
 */
export default function RollConditionEditor({
  roll,
  onSend,
  onClose,
}: {
  roll: EditableRoll;
  onSend: (payload: EditActionPayload) => void;
  onClose: () => void;
}) {
  const [bias, setBias] = useState(roll.current?.bias ?? 0);
  const [modifier, setModifier] = useState(String(roll.current?.modifier ?? 0));
  const [description, setDescription] = useState(roll.current?.description ?? "");
  const send = (payload: EditActionPayload) => {
    onSend(payload);
    onClose();
  };
  const parsed = Number.parseInt(modifier, 10);
  const apply = () =>
    send(conditionPayload(roll, { bias, modifier: Number.isNaN(parsed) ? 0 : parsed, description }));

  return (
    <Editor aria-label={`Editar ${roll.label}`}>
      {roll.allowsBias && (
        <BiasRow role="group" aria-label="Viés">
          {BIAS_OPTIONS.map((o) => (
            <Toggle key={o.value} type="button" aria-pressed={bias === o.value} onClick={() => setBias(o.value)}>
              {o.label}
            </Toggle>
          ))}
        </BiasRow>
      )}
      <Field>
        <span>Ajuste</span>
        <Input
          aria-label="Ajuste"
          type="number"
          step={1}
          value={modifier}
          onChange={(e) => setModifier(e.target.value)}
        />
      </Field>
      <Field>
        <span>Motivo</span>
        <Input aria-label="Motivo" type="text" maxLength={80} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Buttons>
        <Primary type="button" onClick={apply}>Aplicar</Primary>
        {roll.current && (
          <Secondary type="button" onClick={() => send(clearPayload(roll))}>Desfazer edição</Secondary>
        )}
        <Secondary type="button" onClick={onClose}>Cancelar</Secondary>
      </Buttons>
    </Editor>
  );
}
```

Estilos: `Editor` (coluna, `gap: 6px`, `padding: 8px`, `border: 1px solid ${colors.brandAccent}`, `border-radius: 6px`); `Toggle` com `aria-pressed="true"` destacado (`background: ${colors.brandAccent}`); `Input` com `background: ${colors.surfaceInput}`, `color: ${colors.textPrimary}`, `font-family: ${fonts.sans}`; `Primary`/`Secondary` no padrão do `ActionButton` do `ResolutionDetails`. Procure em `tokens.ts` um token de borda/fundo para os campos antes de inventar; se faltar, **adicione um token** em vez de hex cru.

- [ ] **Step 4: Run** — teste, lint, tsc, suíte.

- [ ] **Step 5: Commit** — `feat(combate): editor inline de viés, ajuste e motivo` com o trailer.

---

### Task 3: o painel — linhas editáveis, bloco Dano, perícia do dano, ligação na página (spec §2.2–§2.4)

**Files:**
- Modify: `src/features/match/combat/ResolutionDetails.tsx`
- Modify: `src/features/match/combat/QueuePanel.tsx` (prop `onEditAction` repassada)
- Modify: `src/pages/GameMasterPage.tsx` (`onEditAction={combat.send.editAction}` no `QueuePanel`)
- Test: `src/features/match/combat/__tests__/combatOrganisms.test.tsx` (bloco `describe("ResolutionDetails")`)

**Interfaces:**
- Consumes: `editableRolls`, `describeCondition`, `damageSkillPayload` (T1); `RollConditionEditor` (T2); `combat.send.editAction: (p: EditActionPayload) => boolean` (já existe).
- Produces: `ResolutionDetails` prop `onEditAction?: (payload: EditActionPayload) => void`; `QueuePanel` prop `onEditAction?` repassada.

Comportamento (spec §2.2/§2.3):
- `const rolls = onEditAction ? editableRolls(resolution) : []` e um mapa `key → roll`.
- **Estado do editor:** `const [editing, setEditing] = useState<{ turnId: string; key: string } | null>(null)`; o editor aberto é `editing && editing.turnId === turnId && rolls.some(r => r.key === editing.key) ? editing.key : null` — assim ele **fecha sozinho** quando o turno muda ou a rolagem some (sem efeito; mesmo padrão de derivação do `sent` de Dar a palavra).
- **Bloco Acerto:** depois do texto existente, se há a rolagem `action:hit`: o resumo em vigor (`<Applied>{describeCondition(current)}</Applied>`, só com `current`) e o botão `Editar` (`aria-label="Editar Acerto"`); com o editor aberto nessa key, o `RollConditionEditor` embaixo.
- **Bloco Dano** (novo, logo depois do Acerto, só se `resolution.damageSkill !== undefined` **e** `onEditAction`): rótulo "Dano"; linha "medido por" com botões de alternância `Push` e `Grab` (`aria-pressed` no atual); se `damageSkill` não for nenhum dos dois, um terceiro botão desabilitado com o nome, `aria-pressed="true"`; clicar num não-atual chama `onEditAction(damageSkillPayload(nome))`; clicar no atual não faz nada. Mesma linha do resumo + `Editar` da rolagem `action:damage` (`aria-label="Editar Dano"`) e o editor.
- **Por alvo:** depois das linhas existentes do alvo, uma linha por rolagem editável daquele `targetId`: `{label}{total}` — total `t.dodgeTotal` para `dodge`, `t.defenseTotal` para `defense`, `t.reaction.total` para `repel`, nenhum para `moveSpeed` — o resumo em vigor e `Editar` (`aria-label={`Editar ${label} de ${nameOf(t.targetId)}`}`), e o editor embaixo quando aberto.
- `RollConditionEditor` recebe `onSend={onEditAction}` e `onClose={() => setEditing(null)}`.
- Atualize o comentário do topo do componente: os botões agora são Dar a palavra, Escolher onde cai, e a edição (Fase 8); o painel está completo.
- `QueuePanel`: acrescente `onEditAction?: (payload: EditActionPayload) => void` às props (com comentário "Fase 8: repassado ao cálculo do card em andamento") e repasse ao `ResolutionDetails`.
- `GameMasterPage`: no `<QueuePanel ...>` que já recebe `onOpenReaction={combat.send.openReaction}`, acrescente `onEditAction={combat.send.editAction}`.

- [ ] **Step 1: Failing tests** — no `describe("ResolutionDetails")` de `combatOrganisms.test.tsx` (importe `within` se precisar):

```tsx
  describe("edição do mestre (Fase 8)", () => {
    const editable: ResolutionPayload = {
      ...res,
      damageSkill: "Push",
      targets: [{ ...res.targets[0], reaction: { ...res.targets[0].reaction!, kind: "dodge", reactionId: "r1" } }],
      conditions: [{ actionId: "act-1", field: "hit", bias: 1, modifier: -2, description: "escuridao" }],
    };

    it("sem onEditAction não há nada de edição", () => {
      render(<ResolutionDetails resolution={editable} nameOf={resolutionNameOf} gridKind="square" />);
      expect(screen.queryByRole("button", { name: /Editar/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Grab" })).not.toBeInTheDocument();
    });

    it("mostra o resumo em vigor e os botões de cada rolagem editável", () => {
      render(<ResolutionDetails resolution={editable} nameOf={resolutionNameOf} gridKind="square" onEditAction={() => {}} />);
      expect(screen.getByText("vantagem · −2 · escuridao")).toBeInTheDocument();
      for (const name of ["Editar Acerto", "Editar Dano", "Editar Esquiva de Hisoka", "Editar Defesa padrão de Hisoka"]) {
        expect(screen.getByRole("button", { name })).toBeInTheDocument();
      }
    });

    it("editar o acerto abre o editor e manda o edit_action da ação", () => {
      const onEdit = vi.fn();
      render(<ResolutionDetails resolution={editable} nameOf={resolutionNameOf} gridKind="square" onEditAction={onEdit} />);
      fireEvent.click(screen.getByRole("button", { name: "Editar Acerto" }));
      fireEvent.click(screen.getByRole("button", { name: "Desfazer edição" }));
      expect(onEdit).toHaveBeenCalledWith({ conditions: [{ field: "hit" }] });
      expect(screen.queryByRole("button", { name: "Aplicar" })).not.toBeInTheDocument();
    });

    it("editar a defesa padrão manda com o id da reação e sem viés", () => {
      const onEdit = vi.fn();
      render(<ResolutionDetails resolution={editable} nameOf={resolutionNameOf} gridKind="square" onEditAction={onEdit} />);
      fireEvent.click(screen.getByRole("button", { name: "Editar Defesa padrão de Hisoka" }));
      expect(screen.queryByRole("button", { name: "Vantagem" })).not.toBeInTheDocument();
      fireEvent.change(screen.getByLabelText("Ajuste"), { target: { value: "3" } });
      fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
      expect(onEdit).toHaveBeenCalledWith({ actionId: "r1", conditions: [{ field: "defense", modifier: 3 }] });
    });

    it("Push/Grab manda damageSkill na hora; o atual não manda nada", () => {
      const onEdit = vi.fn();
      render(<ResolutionDetails resolution={editable} nameOf={resolutionNameOf} gridKind="square" onEditAction={onEdit} />);
      expect(screen.getByRole("button", { name: "Push" })).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(screen.getByRole("button", { name: "Push" }));
      expect(onEdit).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Grab" }));
      expect(onEdit).toHaveBeenCalledWith({ damageSkill: "Grab" });
    });

    it("sem ataque (sem damageSkill) não há bloco Dano nem acerto editável", () => {
      const noAttack = { ...editable, damageSkill: undefined };
      render(<ResolutionDetails resolution={noAttack} nameOf={resolutionNameOf} gridKind="square" onEditAction={() => {}} />);
      expect(screen.queryByRole("button", { name: "Editar Acerto" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Grab" })).not.toBeInTheDocument();
    });

    it("o editor fecha quando a rolagem some do cálculo", () => {
      const { rerender } = render(
        <ResolutionDetails resolution={editable} nameOf={resolutionNameOf} gridKind="square" onEditAction={() => {}} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Editar Esquiva de Hisoka" }));
      expect(screen.getByRole("button", { name: "Aplicar" })).toBeInTheDocument();
      rerender(
        <ResolutionDetails
          resolution={{ ...editable, targets: [{ ...editable.targets[0], reaction: undefined }] }}
          nameOf={resolutionNameOf}
          gridKind="square"
          onEditAction={() => {}}
        />,
      );
      expect(screen.queryByRole("button", { name: "Aplicar" })).not.toBeInTheDocument();
    });
  });
```

- [ ] **Step 2: Run** — falham (prop não existe).
- [ ] **Step 3: Implement** — como descrito acima.
- [ ] **Step 4: Run** — `npx vitest run src/features/match/combat/__tests__/combatOrganisms.test.tsx`, lint, tsc, `npm run test`.
- [ ] **Step 5: Commit** — `feat(combate): o mestre edita a ação aberta no painel de resolução (Fase 8)` com o trailer.

---

### Task 4: documentação de dev (spec §5)

**Files:**
- Create: `docs/dev/match/combate-fase-8.md`
- Modify: `CLAUDE.md` (seção "Feature: match combat": acrescente o ponteiro para `combate-fase-8.md`)
- Modify: `docs/dev/match/combate-fase-7.md` (última linha de "Fora do escopo": a edição do mestre agora existe — aponte para `combate-fase-8.md`)

`combate-fase-8.md`, em PT-BR, no formato do `combate-fase-7.md`: cabeçalho (spec, plano, contrato — PR #85 do back); "O que o mestre vê" (tabela: linhas editáveis por tipo de reação, resumo em vigor, editor, Push/Grab); "O modelo" (`rollEdits.ts`: tabela do contrato, viés onde cabe, a ação sem `actionId` e como a condição dela é achada); "Sem estado otimista" e §0.2 (recarregar mantém tudo pelo `match_full_state`); decisões F1–F5 do spec; "Como verificar no browser" (as três contas; aponte para o `combate-fase-7.md`); "O que não tem teste / limitações" (reação pendente não é editável — F1; esquiva/defesa passivas de quem não reagiu não são editáveis — pendência do documento mestre; Evasion e perícias fora).

- [ ] **Step 1:** escreva os três arquivos. **Step 2:** `npm run lint` (sanidade). **Step 3: Commit** — `docs(combate): Fase 8 — a regência no front` com o trailer.

---

### Task 5 (orquestrador): verificação no browser e PR

- **Servidores:** back no checkout `../System_X_System` (branch `feat/combat-phase-8-regency-back`): `make run-dev` (REST :5000 e WS). Front: `npm run dev` (5173; antes, confira que a porta não está presa por um Vite órfão). `.env` do front com `VITE_WS_URL`.
- **Cenário** (spec §4): mestre `test@` em `http://localhost:5173`, jogador `test2@` em `http://127.0.0.1:5173`, `test3@` por script WS (attach_reaction). Um ataque do jogador ao personagem de test3, reação `dodge` aberta pelo mestre. Verifique: editar o acerto (vantagem/ajuste/motivo) e ver o total e o resumo mudarem; Push → Grab muda o dano bruto; editar esquiva e defesa padrão; **recarregar o mestre**: resumo e perícia mantidos; Desfazer devolve o número; o jogador não vê nada da edição antes do fechamento; fechar o turno.
- **PR** para `main`, cross-link com o PR #85 do back (que precisa mergear antes), dizendo o que foi verificado no browser e o que não foi; rode `./dev-checkout.sh` a partir de `System_X_System_Project/` se sobrar algo não verificado.
