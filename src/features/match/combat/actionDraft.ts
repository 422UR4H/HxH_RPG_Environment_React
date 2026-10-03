// O rascunho de uma ação: o que o jogador (ou o mestre, por um NPC) está montando antes de
// declarar. Ação e movimento são METADES INDEPENDENTES — cada uma pode estar ligada ou não,
// e a ação declarada é o que estiver ligado: só movimento, só ataque, ou os dois juntos
// (a ação combinada de `barra-de-acao.md`, que cobra as duas barras num turno só).
//
// Nada aqui calcula onde a peça PARA (isso é do servidor). O que se calcula é uma
// proposta de destino — "anda até ficar ao lado do alvo" — que aparece destacada no mapa e
// que o jogador troca ou desliga antes de declarar.
import type { GridShape, SlotCoord } from "../../../types/tacticalMap";
import type { SlotTriple } from "../../tactical-map/utils/coords";
import { slotToTriple } from "../../tactical-map/utils/coords";
import { approachSlot, slotDistance } from "../../tactical-map/utils/reach";
import type { EnqueueActionPayload, MoveCategory } from "./combatMessages";
import type { DeclaredAction } from "./combatReducer";

/**
 * - `none`: não vai se mover (o padrão).
 * - `manual`: vai para `to`, o slot que o jogador tocou (ou ainda vai tocar).
 * - `approach`: vai até ficar ao lado do alvo principal — o destino é derivado do tabuleiro.
 * - `stay`: o jogador desligou o movimento de propósito (ataque à distância); escolher outro
 *   alvo longe não o religa.
 */
export type MoveMode = "none" | "manual" | "approach" | "stay";

export type ActionDraft = {
  moveMode: MoveMode;
  /** Só em `manual`. Ausente = "quero me mover" ligado, destino ainda não escolhido. */
  to?: SlotTriple;
  /** Ausente = o padrão do momento (`defaultMoveCategory`). */
  category?: MoveCategory;
  /** Presente = "quero atacar" ligado. `targets` vazio = alvo ainda não escolhido. */
  attack?: { targets: string[]; weapon?: string };
};

export const emptyDraft = (): ActionDraft => ({ moveMode: "none" });

// ─── Transições (puras) ──────────────────────────────────────────────────────

/** Tocar num slot vazio começa (ou redireciona) um movimento para lá. */
export function chooseDestination(draft: ActionDraft, to: SlotTriple): ActionDraft {
  return { ...draft, moveMode: "manual", to };
}

/**
 * Tocar num personagem começa um ataque contra ele (troca o alvo; arma e movimento ficam).
 * Se o jogador ainda não decidiu nada sobre se mover, passa a se aproximar — o destino só
 * aparece se o alvo estiver mesmo fora de alcance.
 */
export function chooseTarget(draft: ActionDraft, characterId: string): ActionDraft {
  return withTargets(draft, [characterId]);
}

/** Segurar num personagem liga/desliga ele na lista de alvos (vários alvos). */
export function toggleTarget(draft: ActionDraft, characterId: string): ActionDraft {
  const current = draft.attack?.targets ?? [];
  const next = current.includes(characterId)
    ? current.filter((t) => t !== characterId)
    : [...current, characterId];
  return withTargets(draft, next);
}

export function removeTarget(draft: ActionDraft, characterId: string): ActionDraft {
  return withTargets(draft, (draft.attack?.targets ?? []).filter((t) => t !== characterId));
}

function withTargets(draft: ActionDraft, targets: string[]): ActionDraft {
  if (targets.length === 0) {
    // Sem alvo não há ataque — e uma aproximação sem ninguém para aproximar some junto.
    const { attack: _attack, ...rest } = draft;
    return { ...rest, moveMode: settleMoveModeWithoutTarget(draft.moveMode) };
  }
  return {
    ...draft,
    moveMode: draft.moveMode === "none" ? "approach" : draft.moveMode,
    attack: { ...draft.attack, targets },
  };
}

function settleMoveModeWithoutTarget(mode: MoveMode): MoveMode {
  return mode === "approach" || mode === "stay" ? "none" : mode;
}

/**
 * O botão "Mover". Ligado → desliga (com alvo, vira `stay`: o jogador disse que ataca de
 * onde está). Desligado → liga: com alvo longe, aproxima; senão espera o toque num slot.
 */
export function toggleMove(draft: ActionDraft, resolved: ResolvedDraft): ActionDraft {
  if (isMoveOn(draft, resolved)) {
    const { to: _to, ...rest } = draft;
    return { ...rest, moveMode: draft.attack?.targets.length ? "stay" : "none" };
  }
  const targetIsFar = !!draft.attack?.targets.length && (resolved.targetSteps ?? 0) > 1;
  // Uma aproximação que já estava pedida e não saiu (sem espaço ao lado do alvo) não se
  // repete: o jogador escolhe o slot na mão.
  if (targetIsFar && draft.moveMode !== "approach") return { ...draft, moveMode: "approach" };
  return { ...draft, moveMode: "manual" };
}

/** O botão "Atacar". Desligar leva junto uma aproximação que só existia por causa do alvo. */
export function toggleAttack(draft: ActionDraft): ActionDraft {
  if (draft.attack) {
    const { attack: _attack, ...rest } = draft;
    return { ...rest, moveMode: settleMoveModeWithoutTarget(draft.moveMode) };
  }
  return { ...draft, attack: { targets: [] } };
}

export function setMoveCategory(draft: ActionDraft, category: MoveCategory): ActionDraft {
  return { ...draft, category };
}

export function setWeapon(draft: ActionDraft, weapon: string): ActionDraft {
  if (!draft.attack) return draft;
  return { ...draft, attack: { ...draft.attack, weapon } };
}

// ─── Resolução contra o tabuleiro ────────────────────────────────────────────

export type ReachContext = {
  grid: GridShape;
  /** Slot da peça do ator; ausente quando ele não tem peça no tabuleiro. */
  actorSlot?: SlotCoord;
  actorZ: number;
  slotOf: (characterId: string) => SlotCoord | undefined;
  isFree: (slot: SlotCoord) => boolean;
};

/** O rascunho com o destino da aproximação já derivado — é isto que a tela e o envio leem. */
export type ResolvedDraft = {
  move?: { category: MoveCategory; to?: SlotTriple; auto: boolean };
  attack?: { targets: string[]; weapon?: string };
  /** Passos entre o ator e o alvo principal, quando os dois estão no tabuleiro. */
  targetSteps?: number;
  /** Aproximação pedida, mas todo vizinho do alvo está ocupado ou fora do mapa. */
  approachBlocked: boolean;
};

export function resolveDraft(
  draft: ActionDraft,
  ctx: ReachContext,
  defaultCategory: MoveCategory,
): ResolvedDraft {
  const category = draft.category ?? defaultCategory;
  const primary = draft.attack?.targets[0];
  const targetSlot = primary ? ctx.slotOf(primary) : undefined;
  const targetSteps =
    ctx.actorSlot && targetSlot ? slotDistance(ctx.actorSlot, targetSlot) : undefined;

  const base: ResolvedDraft = { attack: draft.attack, targetSteps, approachBlocked: false };

  switch (draft.moveMode) {
    case "manual":
      return { ...base, move: { category, to: draft.to, auto: false } };
    case "approach": {
      if (!ctx.actorSlot || !targetSlot) return base;
      const r = approachSlot({ actor: ctx.actorSlot, target: targetSlot, grid: ctx.grid, isFree: ctx.isFree });
      if (r.kind === "approach") {
        return { ...base, move: { category, to: slotToTriple(r.slot, ctx.actorZ), auto: true } };
      }
      return { ...base, approachBlocked: r.kind === "no_room" };
    }
    default:
      return base;
  }
}

function isMoveOn(draft: ActionDraft, resolved: ResolvedDraft): boolean {
  return draft.moveMode === "manual" || resolved.move !== undefined;
}

// ─── O que será declarado ────────────────────────────────────────────────────

export type DraftKind = "move" | "attack" | "combined";

export type DraftVerdict =
  | { ready: true; kind: DraftKind }
  | { ready: false; reason: "empty" | "needs_destination" | "needs_target" };

/**
 * Pronto quando toda metade LIGADA está completa — um "Mover" ligado sem destino não é
 * ignorado em silêncio num envio só de ataque; ele trava o envio até ser resolvido.
 */
export function draftVerdict(resolved: ResolvedDraft): DraftVerdict {
  const moveOn = resolved.move !== undefined;
  const attackOn = resolved.attack !== undefined;
  if (!moveOn && !attackOn) return { ready: false, reason: "empty" };
  if (moveOn && !resolved.move!.to) return { ready: false, reason: "needs_destination" };
  if (attackOn && resolved.attack!.targets.length === 0) return { ready: false, reason: "needs_target" };
  return { ready: true, kind: moveOn && attackOn ? "combined" : moveOn ? "move" : "attack" };
}

/**
 * O payload de `enqueue_action`. Sem perícia nenhuma: o servidor deriva `Accuracy` e soma a
 * proficiência da arma (contrato, `attack.hit`). `from` sai da posição atual da peça do
 * ator — mandá-lo liga a checagem de parede do servidor.
 */
export function buildEnqueuePayload(
  resolved: ResolvedDraft,
  actorId: string,
  from: SlotTriple | undefined,
): EnqueueActionPayload | null {
  if (!draftVerdict(resolved).ready) return null;
  const { move, attack } = resolved;
  return {
    actorId,
    ...(attack
      ? { targetId: attack.targets, attack: attack.weapon ? { weapon: attack.weapon } : {} }
      : {}),
    ...(move?.to
      ? { move: { category: move.category, ...(from ? { from } : {}), position: move.to } }
      : {}),
  };
}

/** O rascunho de uma declarada que o servidor perdeu — para o jogador declarar de novo (B12). */
export function draftFromDeclared(d: Pick<DeclaredAction, "move" | "attack">): ActionDraft {
  return {
    moveMode: d.move ? "manual" : "none",
    ...(d.move ? { to: d.move.to, category: d.move.category } : {}),
    ...(d.attack
      ? { attack: { targets: [...d.attack.targets], ...(d.attack.weapon ? { weapon: d.attack.weapon } : {}) } }
      : {}),
  };
}

// ─── Persistência ────────────────────────────────────────────────────────────
//
// Por partida + ator: sobrevive ao refresh e à troca de NPC (o mestre tem um rascunho por
// NPC). `localStorage` lança em aba privada — tudo aqui é best-effort, e o estado inicial é
// válido sem ele. A chave é versionada: o formato mudou, e um rascunho no formato antigo
// não deve reaparecer como coisa que o jogador não escolheu.

const DRAFT_PREFIX = "match-draft:v2:";
const draftKey = (matchUuid: string, actorId: string) => `${DRAFT_PREFIX}${matchUuid}:${actorId}`;

const MOVE_MODES: MoveMode[] = ["none", "manual", "approach", "stay"];

export function loadDraft(matchUuid: string, actorId: string): ActionDraft {
  try {
    const raw = localStorage.getItem(draftKey(matchUuid, actorId));
    if (!raw) return emptyDraft();
    const parsed = JSON.parse(raw) as Partial<ActionDraft>;
    if (!parsed || !MOVE_MODES.includes(parsed.moveMode as MoveMode)) return emptyDraft();
    return parsed as ActionDraft;
  } catch {
    return emptyDraft();
  }
}

export function saveDraft(matchUuid: string, actorId: string, draft: ActionDraft): void {
  try {
    if (draft.moveMode === "none" && !draft.attack && !draft.category) {
      localStorage.removeItem(draftKey(matchUuid, actorId));
      return;
    }
    localStorage.setItem(draftKey(matchUuid, actorId), JSON.stringify(draft));
  } catch {
    /* sem persistência; o rascunho ainda vive em memória */
  }
}

export function clearDraft(matchUuid: string, actorId: string): void {
  try {
    localStorage.removeItem(draftKey(matchUuid, actorId));
  } catch {
    /* idem */
  }
}

/**
 * Remove as chaves do formato anterior (`match-draft:{m}:{a}` sem versão e
 * `match-ghosts:*`), que ficariam órfãs para sempre.
 */
export function purgeLegacyMatchStorage(): void {
  try {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if ((k.startsWith("match-draft:") && !k.startsWith(DRAFT_PREFIX)) || k.startsWith("match-ghosts:")) {
        stale.push(k);
      }
    }
    stale.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* idem */
  }
}
