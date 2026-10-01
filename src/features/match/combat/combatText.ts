// Os textos de combate que mais de um componente escreve — um lugar só, para as telas
// dizerem a mesma coisa do mesmo jeito.
import type { GridKind } from "../../../types/tacticalMap";
import type { SlotTriple } from "../../tactical-map/utils/coords";
import type { Bar, RoundMode } from "./combatMessages";
import type { DeclaredAction } from "./combatReducer";

export const ROUND_MODE_LABELS: Record<RoundMode, string> = { Free: "Livre", Race: "Disputado" };

export const BAR_ICONS: Record<Bar, string> = { action: "⚔", move: "➜" };
export const BAR_LABELS: Record<Bar, string> = { action: "ação", move: "movimento" };

/** `reaction.rung` do repelir — snake_case do domínio, rótulo PT na tela. */
export const RUNG_LABELS: Record<string, string> = {
  great_success: "sucesso total",
  success: "sucesso",
  near_miss: "quase",
  failure: "falha",
};

export const REACTION_KIND_LABELS: Record<string, string> = {
  nothing: "nada",
  dodge: "esquiva",
  closedDodge: "esquiva fechada",
  escape: "fuga",
  escapeGuard: "fuga defensiva",
  closedEscape: "fuga fechada",
  repel: "repelir",
};

const INTERACT_LABELS: Record<string, string> = {
  open: "abrir",
  close: "fechar",
  toggle: "alternar",
  lockpick: "arrombar",
  examine: "examinar",
};

/**
 * W1: o verbo de "evitou" depende de COMO o alvo evitou, não de um texto fixo — o contrato
 * (`targets[].avoided`) diz que `avoided` vale por qualquer meio; pergunte a `reaction.kind`.
 * Sem reação, o alvo usou o reflexo passivo de esquiva.
 */
export function avoidedVerb(reaction?: { kind: string }): string {
  switch (reaction?.kind) {
    case "escape":
    case "escapeGuard":
    case "closedEscape":
      return "fugiu";
    case "repel":
      return "aparou";
    default:
      return "esquivou";
  }
}

/** Coordenada legível de um slot — contada a partir de 1 no quadrado. */
export function formatSlot(t: SlotTriple, kind: GridKind): string {
  return kind === "square" ? `coluna ${t[0] + 1}, linha ${t[1] + 1}` : `q ${t[0]}, r ${t[1]}`;
}

export const humanWeapon = (name: string) => name.replace(/([a-z])([A-Z])/g, "$1 $2");

/** "Mover para coluna 8, linha 5 (Dash) e atacar Hisoka com Sword". */
export function describeDeclared(
  d: Pick<DeclaredAction, "move" | "attack" | "interact">,
  nameOf: (id: string) => string,
  gridKind: GridKind,
): string {
  const parts: string[] = [];
  if (d.move) parts.push(`mover para ${formatSlot(d.move.to, gridKind)} (${d.move.category})`);
  if (d.attack) {
    const who = d.attack.targets.map(nameOf).join(", ");
    parts.push(`atacar ${who}${d.attack.weapon ? ` com ${humanWeapon(d.attack.weapon)}` : ""}`);
  }
  if (d.interact) parts.push(`${INTERACT_LABELS[d.interact.kind] ?? d.interact.kind} a passagem`);
  const text = parts.join(" e ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
