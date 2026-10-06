import type { AttachReactionPayload, Bar, MoveCategory, ReactionKind } from "./combatMessages";
import type { CombatState, OwnReaction } from "./combatReducer";

/** Os cinco botões da reação; a Evasão é um toggle à parte que refina o tipo. */
export type ReactionButton = "nothing" | "dodge" | "escape" | "escapeGuard" | "repel";
export type ReactionStatus = "available" | "sending" | "attached" | "opened";

export const REACTION_BUTTONS: ReactionButton[] = ["nothing", "dodge", "escape", "escapeGuard", "repel"];
export const REACTION_BUTTON_LABELS: Record<ReactionButton, string> = {
  nothing: "Não fazer nada", dodge: "Esquivar", escape: "Escapar", escapeGuard: "Escape defensivo", repel: "Repelir",
};

/** Barras que cada tipo de reação consome (tabela do contrato). */
export const REACTION_BARS: Record<ReactionKind, Bar[]> = {
  nothing: [],
  dodge: [],
  closedDodge: [],
  escape: ["action", "move"],
  escapeGuard: ["action", "move"],
  closedEscape: ["move"],
  repel: ["action"],
};

/** Evasão só muda Esquivar e Escapar (decisão 9): nos demais o toggle é ignorado. */
export function supportsEvasion(b: ReactionButton): boolean {
  return b === "dodge" || b === "escape";
}

/** Botão + Evasão -> tipo do contrato. Evasão fecha a esquiva/fuga (closedDodge/closedEscape). */
export function reactionKindOf(b: ReactionButton, evasion: boolean): ReactionKind {
  if (b === "dodge") return evasion ? "closedDodge" : "dodge";
  if (b === "escape") return evasion ? "closedEscape" : "escape";
  return b;
}

/** Fugas exigem a casa de destino; o resto reage no lugar. */
export function needsDestination(kind: ReactionKind): boolean {
  return kind === "escape" || kind === "escapeGuard" || kind === "closedEscape";
}

/** Categoria do movimento é fixa por tipo (matriz §11.4): fuga aberta é Dash, fechada é Shift. */
export function moveCategoryOf(kind: ReactionKind): MoveCategory | undefined {
  if (kind === "escape" || kind === "escapeGuard") return "Dash";
  if (kind === "closedEscape") return "Shift";
  return undefined;
}

/**
 * Payload mínimo do `attach_reaction`: o servidor deriva as perícias, então só vão
 * o tipo e o que o contrato exige (`dodge` vazio nas esquivas/fugas, `move` nas fugas,
 * `repel` com a arma opcional).
 */
export function buildReactionPayload(input: {
  actorId: string; reactToId: string; kind: ReactionKind;
  position?: [number, number, number]; weapon?: string;
}): AttachReactionPayload {
  const { actorId, reactToId, kind, position, weapon } = input;
  const payload: AttachReactionPayload = { actorId, reactToId, reactionKind: kind };
  if (kind === "dodge" || kind === "closedDodge") payload.dodge = {};
  if (kind === "repel") payload.repel = weapon ? { weapon } : {};
  const category = moveCategoryOf(kind);
  if (category) {
    // Fuga sem casa é bug de quem chama: a UI só habilita o envio com destino escolhido.
    if (!position) throw new Error("a fuga precisa da casa de destino");
    payload.dodge = {};
    payload.move = { category, position };
  }
  return payload;
}

/**
 * Os meus personagens que são alvo da ação aberta, na ordem de `targetId`. Parede nunca
 * vira botão porque `mine` só tem fichas. Sem turno ou sem a declaração (servidor antigo),
 * ninguém. O atacante que se alveja também reage (Review Focus 5): não o excluímos.
 */
export function reactableTargets(openTurn: CombatState["openTurn"], mine: ReadonlySet<string>): string[] {
  const targets = openTurn?.action?.targetId ?? [];
  return targets.filter((id) => mine.has(id));
}

/** Estado de um alvo meu: só conta a reação do MESMO turno; sem ela, "available". */
export function reactionStatusOf(actorId: string, own: OwnReaction[], turnId: string | undefined): ReactionStatus {
  if (turnId === undefined) return "available";
  const found = own.find((r) => r.actorId === actorId && r.turnId === turnId);
  return found ? found.status : "available";
}
