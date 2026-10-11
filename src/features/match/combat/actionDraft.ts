// O rascunho de uma ação: o que o jogador (ou o mestre, por um NPC) está montando antes de
// declarar. Ação e movimento são METADES INDEPENDENTES — cada uma pode estar ligada ou não,
// e a ação declarada é o que estiver ligado: só movimento, só a ação sobre o alvo, ou os dois
// juntos (a ação combinada de `barra-de-acao.md`, que cobra as duas barras num turno só).
//
// A metade de ação (`act`) MIRA: personagens e paredes, um ou vários (um golpe em área pega
// vários de uma vez). Com personagem, ou com mais de um alvo, ela é sempre um ataque; com uma
// parede só ela pode ser também abrir, fechar ou arrombar (`wallVerbs.ts`) — e aí exige estar
// encostado nela. A parede é um alvo como uma peça: tem alcance, e um alvo longe puxa a
// aproximação.
//
// Nada aqui calcula onde a peça PARA (isso é do servidor). O que se calcula é uma
// proposta de destino — "anda até ficar ao lado do alvo" — que aparece destacada no mapa e
// que o jogador troca ou desliga antes de declarar.
import type { GridShape, SlotCoord, WallSegment } from "../../../types/tacticalMap";
import type { SlotTriple } from "../../tactical-map/utils/coords";
import { isSameSlot, slotToTriple, tripleToSlot } from "../../tactical-map/utils/coords";
import { approachReach, approachSlot, slotDistance, stepsToReach } from "../../tactical-map/utils/reach";
import type { EnqueueActionPayload, MoveCategory } from "./combatMessages";
import type { DeclaredAction } from "./combatReducer";
import { actorWallVerbs } from "./wallVerbs";
import type { ActKind } from "./wallVerbs";

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
  /**
   * Presente = a metade de ação ligada. `targets` vazio = alvo ainda não escolhido. `kind`
   * ausente = ataque; um verbo de parede só vale com uma parede como alvo único.
   */
  act?: { targets: string[]; kind?: ActKind; weapon?: string };
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
  return withTargets(draft, [characterId], "attack");
}

/**
 * Tocar numa parede faz dela o alvo, como uma peça. O verbo: se a ação já era um ataque e a
 * parede aceita ataque, continua ataque; senão, o primeiro verbo dela (passar pela porta vem
 * antes de quebrá-la). Uma parede sem verbo (destruída, terreno) não muda nada.
 */
export function chooseWallTarget(draft: ActionDraft, wall: WallSegment): ActionDraft {
  const verbs = actorWallVerbs(wall);
  if (verbs.length === 0) return draft;
  const keepAttack = draft.act && (draft.act.kind ?? "attack") === "attack" && verbs.includes("attack");
  return withTargets(draft, [wall.id], keepAttack ? "attack" : verbs[0]);
}

/** Segurar num personagem liga/desliga ele na lista de alvos (vários alvos) — sempre ataque. */
export function toggleTarget(draft: ActionDraft, characterId: string): ActionDraft {
  const current = draft.act?.targets ?? [];
  const next = current.includes(characterId)
    ? current.filter((t) => t !== characterId)
    : [...current, characterId];
  return withTargets(draft, next, "attack");
}

/**
 * Segurar numa parede liga/desliga ela entre os alvos, junto de personagens e outras paredes (um
 * golpe em área). Sozinha, é como o toque (o verbo dela). Junto de outros alvos é ataque — a
 * indestrutível entra (só não recebe dano); o terreno, que não se ataca, não.
 */
export function toggleWallTarget(draft: ActionDraft, wall: WallSegment): ActionDraft {
  const current = draft.act?.targets ?? [];
  if (current.includes(wall.id)) {
    return withTargets(draft, current.filter((t) => t !== wall.id), draft.act?.kind);
  }
  if (current.length === 0) return chooseWallTarget(draft, wall);
  if (!actorWallVerbs(wall).includes("attack")) return draft;
  return withTargets(draft, [...current, wall.id], "attack");
}

export function removeTarget(draft: ActionDraft, targetId: string): ActionDraft {
  return withTargets(draft, (draft.act?.targets ?? []).filter((t) => t !== targetId), draft.act?.kind);
}

function withTargets(draft: ActionDraft, targets: string[], kind: ActKind | undefined): ActionDraft {
  if (targets.length === 0) {
    // Sem alvo não há ação — e uma aproximação sem ninguém para aproximar some junto.
    const { act: _act, ...rest } = draft;
    return { ...rest, moveMode: settleMoveModeWithoutTarget(draft.moveMode) };
  }
  const { kind: _kind, ...act } = draft.act ?? { targets };
  return {
    ...draft,
    moveMode: draft.moveMode === "none" ? "approach" : draft.moveMode,
    act: { ...act, targets, ...(kind && kind !== "attack" ? { kind } : {}) },
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
    return { ...rest, moveMode: draft.act?.targets.length ? "stay" : "none" };
  }
  const targetIsFar = !!draft.act?.targets.length && (resolved.targetSteps ?? 0) > 1;
  // Uma aproximação que já estava pedida e não saiu (sem espaço ao lado do alvo) não se
  // repete: o jogador escolhe o slot na mão.
  if (targetIsFar && draft.moveMode !== "approach") return { ...draft, moveMode: "approach" };
  return { ...draft, moveMode: "manual" };
}

/**
 * O botão da ação (Atacar, ou o verbo da parede). Desligar leva junto uma aproximação que só
 * existia por causa do alvo. Ligar abre um ataque sem alvo.
 */
export function toggleAct(draft: ActionDraft): ActionDraft {
  if (draft.act) {
    const { act: _act, ...rest } = draft;
    return { ...rest, moveMode: settleMoveModeWithoutTarget(draft.moveMode) };
  }
  return { ...draft, act: { targets: [] } };
}

export function setMoveCategory(draft: ActionDraft, category: MoveCategory): ActionDraft {
  return { ...draft, category };
}

export function setWeapon(draft: ActionDraft, weapon: string): ActionDraft {
  if (!draft.act) return draft;
  return { ...draft, act: { ...draft.act, weapon } };
}

/** O seletor "O que fazer" de uma parede-alvo. A arma escolhida fica guardada para a volta ao ataque. */
export function setActKind(draft: ActionDraft, kind: ActKind): ActionDraft {
  if (!draft.act) return draft;
  const { kind: _kind, ...act } = draft.act;
  return { ...draft, act: kind === "attack" ? act : { ...act, kind } };
}

// ─── Resolução contra o tabuleiro ────────────────────────────────────────────

/** Onde um alvo está: a peça num slot, ou a parede com os slots que encostam nela. */
export type DraftTarget =
  | { kind: "character"; slot: SlotCoord }
  | { kind: "wall"; wall: WallSegment; reach: SlotCoord[] };

export type ReachContext = {
  grid: GridShape;
  /** Slot da peça do ator; ausente quando ele não tem peça no tabuleiro. */
  actorSlot?: SlotCoord;
  actorZ: number;
  /** Ausente: personagem sem peça, ou id que o tabuleiro não conhece. */
  targetOf: (id: string) => DraftTarget | undefined;
  isFree: (slot: SlotCoord) => boolean;
  /** O servidor aceitaria andar em linha reta de um slot ao outro (sem parede no meio)? */
  isPathClear?: (from: SlotCoord, to: SlotCoord) => boolean;
};

/** O rascunho com o destino da aproximação já derivado — é isto que a tela e o envio leem. */
export type ResolvedDraft = {
  move?: { category: MoveCategory; to?: SlotTriple; auto: boolean };
  /**
   * `kind` sempre presente aqui. `verbs`: o que a parede-alvo aceita (presente só quando o alvo
   * principal é uma parede) — a tela mostra o seletor com eles.
   */
  act?: { targets: string[]; kind: ActKind; weapon?: string; verbs?: ActKind[] };
  /** Passos entre o ator e o alvo principal, quando os dois estão no tabuleiro (encostado = 1). */
  targetSteps?: number;
  /** Aproximação pedida, mas todo vizinho do alvo está ocupado ou fora do mapa. */
  approachBlocked: boolean;
  /**
   * Um verbo de parede (abrir, fechar, arrombar) cuja parede não encosta na casa onde a ação
   * deixa o ator — o destino do movimento, ou onde ele está. O servidor recusa (`out_of_reach`).
   */
  outOfReach?: boolean;
};

/**
 * A arma com que Atacar e Repelir abrem: a primeira do catálogo que não é o Desarmado (`Fist`),
 * na ordem dada; sem nenhuma, `undefined` (e quem consome cai em Fist). Regra única do padrão,
 * a ser enriquecida depois pelo dono do produto.
 */
export function defaultWeaponOf(names: string[]): string | undefined {
  return names.find((n) => n !== "Fist");
}

/**
 * A metade de ação contra o tabuleiro de agora: uma parede que deixou de aceitar qualquer verbo
 * (destruída) sai dos alvos; com vários alvos é ataque, e a parede que não se ataca (terreno) sai; um verbo
 * que a parede deixou de aceitar (alguém abriu a porta) cai no primeiro que ela aceita;
 * personagem entre os alvos é sempre ataque.
 */
function resolveAct(
  draftAct: NonNullable<ActionDraft["act"]>,
  ctx: ReachContext,
  defaultWeapon: string | undefined,
): NonNullable<ResolvedDraft["act"]> {
  const wallVerbsOf = (id: string) => {
    const t = ctx.targetOf(id);
    return t?.kind === "wall" ? actorWallVerbs(t.wall) : undefined;
  };
  const standing = draftAct.targets.filter((id) => wallVerbsOf(id)?.length !== 0);
  // Vários alvos = ataque: a parede que não se ataca (terreno) sai.
  const targets = standing.length > 1
    ? standing.filter((id) => wallVerbsOf(id)?.includes("attack") ?? true)
    : standing;
  const primary = targets[0] ? ctx.targetOf(targets[0]) : undefined;
  const verbs = primary?.kind === "wall" && targets.length === 1 ? actorWallVerbs(primary.wall) : undefined;
  const wanted = draftAct.kind ?? "attack";
  const kind: ActKind = verbs ? (verbs.includes(wanted) ? wanted : verbs[0]) : "attack";
  // O padrão entra na resolução (não só na tela): o que aparece escolhido é o que vai no envio.
  // Sem chave `weapon` quando nenhum dos dois existe, e nunca fora do ataque.
  const weapon = kind === "attack" ? (draftAct.weapon ?? defaultWeapon) : undefined;
  return {
    targets,
    kind,
    ...(weapon !== undefined ? { weapon } : {}),
    ...(verbs ? { verbs } : {}),
  };
}

export function resolveDraft(
  draft: ActionDraft,
  ctx: ReachContext,
  defaultCategory: MoveCategory,
  defaultWeapon?: string,
): ResolvedDraft {
  const category = draft.category ?? defaultCategory;
  const act = draft.act ? resolveAct(draft.act, ctx, defaultWeapon) : undefined;
  const primary = act?.targets[0] ? ctx.targetOf(act.targets[0]) : undefined;
  const targetSteps = !ctx.actorSlot || !primary
    ? undefined
    : primary.kind === "character"
      ? slotDistance(ctx.actorSlot, primary.slot)
      : stepsToReach(ctx.actorSlot, primary.reach);

  const base: ResolvedDraft = { act, targetSteps, approachBlocked: false };
  const resolved = resolveMove(draft, ctx, base, category, primary);
  return act && act.kind !== "attack" && primary?.kind === "wall"
    ? { ...resolved, outOfReach: !touches(resolved, ctx, primary.reach) }
    : resolved;
}

function resolveMove(
  draft: ActionDraft,
  ctx: ReachContext,
  base: ResolvedDraft,
  category: MoveCategory,
  primary: DraftTarget | undefined,
): ResolvedDraft {
  switch (draft.moveMode) {
    case "manual":
      return { ...base, move: { category, to: draft.to, auto: false } };
    case "approach": {
      if (!ctx.actorSlot || !primary) return base;
      const reachArgs = { actor: ctx.actorSlot, grid: ctx.grid, isFree: ctx.isFree, isPathClear: ctx.isPathClear };
      const r = primary.kind === "character"
        ? approachSlot({ ...reachArgs, target: primary.slot })
        : approachReach({ ...reachArgs, reach: primary.reach });
      if (r.kind === "approach") {
        return { ...base, move: { category, to: slotToTriple(r.slot, ctx.actorZ), auto: true } };
      }
      return { ...base, approachBlocked: r.kind === "no_room" };
    }
    default:
      return base;
  }
}

/**
 * A casa onde a ação deixa o ator encosta na parede? O destino do movimento, ou onde ele está.
 * Um destino ainda não escolhido não reprova aqui — o "escolha o destino" vem antes.
 */
function touches(resolved: ResolvedDraft, ctx: ReachContext, reach: SlotCoord[]): boolean {
  if (resolved.move && !resolved.move.to) return true;
  const end = resolved.move?.to ? tripleToSlot(resolved.move.to, ctx.grid.kind) : ctx.actorSlot;
  return !!end && reach.some((s) => isSameSlot(s, end));
}

function isMoveOn(draft: ActionDraft, resolved: ResolvedDraft): boolean {
  return draft.moveMode === "manual" || resolved.move !== undefined;
}

// ─── O que será declarado ────────────────────────────────────────────────────

export type DraftKind = "move" | "act" | "combined";

export type DraftVerdict =
  | { ready: true; kind: DraftKind }
  | { ready: false; reason: "empty" | "needs_destination" | "needs_target" | "out_of_reach" };

/**
 * Pronto quando toda metade LIGADA está completa — um "Mover" ligado sem destino não é
 * ignorado em silêncio num envio só de ataque; ele trava o envio até ser resolvido.
 */
export function draftVerdict(resolved: ResolvedDraft): DraftVerdict {
  const moveOn = resolved.move !== undefined;
  const actOn = resolved.act !== undefined;
  if (!moveOn && !actOn) return { ready: false, reason: "empty" };
  if (moveOn && !resolved.move!.to) return { ready: false, reason: "needs_destination" };
  if (actOn && resolved.act!.targets.length === 0) return { ready: false, reason: "needs_target" };
  if (resolved.outOfReach) return { ready: false, reason: "out_of_reach" };
  return { ready: true, kind: moveOn && actOn ? "combined" : moveOn ? "move" : "act" };
}

/**
 * O payload de `enqueue_action`. Sem perícia nenhuma: o servidor deriva `Accuracy` e soma a
 * proficiência da arma (contrato, `attack.hit`). Um verbo de parede vai como `interact` — o
 * mesmo `targetId`, o mesmo `move` junto. `from` sai da posição atual da peça do ator —
 * mandá-lo liga a checagem de parede do servidor.
 */
export function buildEnqueuePayload(
  resolved: ResolvedDraft,
  actorId: string,
  from: SlotTriple | undefined,
): EnqueueActionPayload | null {
  if (!draftVerdict(resolved).ready) return null;
  const { move, act } = resolved;
  return {
    actorId,
    ...(act
      ? {
          targetId: act.targets,
          ...(act.kind === "attack"
            ? { attack: act.weapon ? { weapon: act.weapon } : {} }
            : { interact: { kind: act.kind } }),
        }
      : {}),
    ...(move?.to
      ? { move: { category: move.category, ...(from ? { from } : {}), position: move.to } }
      : {}),
  };
}

const INTERACT_KINDS: ActKind[] = ["open", "close", "lockpick"];

/** O rascunho de uma declarada que o servidor perdeu — para o jogador declarar de novo (B12). */
export function draftFromDeclared(d: Pick<DeclaredAction, "move" | "attack" | "interact">): ActionDraft {
  const interactKind = INTERACT_KINDS.find((k) => k === d.interact?.kind);
  const act: ActionDraft["act"] = d.attack
    ? { targets: [...d.attack.targets], ...(d.attack.weapon ? { weapon: d.attack.weapon } : {}) }
    : d.interact && interactKind
      ? { targets: [...d.interact.targets], kind: interactKind }
      : undefined;
  return {
    moveMode: d.move ? "manual" : "none",
    ...(d.move ? { to: d.move.to, category: d.move.category } : {}),
    ...(act ? { act } : {}),
  };
}

// ─── Persistência ────────────────────────────────────────────────────────────
//
// Por partida + ator: sobrevive ao refresh e à troca de NPC (o mestre tem um rascunho por
// NPC). `localStorage` lança em aba privada — tudo aqui é best-effort, e o estado inicial é
// válido sem ele. A chave é versionada: o formato mudou (v3: `attack` virou `act`), e um
// rascunho no formato antigo não deve reaparecer como coisa que o jogador não escolheu.

const DRAFT_PREFIX = "match-draft:v3:";
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
    if (draft.moveMode === "none" && !draft.act && !draft.category) {
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
 * Remove as chaves dos formatos anteriores (todo `match-draft:` fora da versão atual — sem
 * versão, v2 — e `match-ghosts:*`), que ficariam órfãs para sempre.
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
