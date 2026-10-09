// Os textos dos balões (spec §4.9): funções puras, para a mesa inteira ler a mesma frase.
import type { GridKind } from "../../../types/tacticalMap";
import type { HistoryAction } from "../../../types/matchHistory";
import type { ResolutionPayload, ResolutionTarget } from "./combatMessages";
import { REACTION_KIND_LABELS, avoidedVerb, formatSlot, humanWeapon, interactLabel } from "./combatText";

export type BalloonTone = "neutral" | "success" | "failure";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A mecânica da ação aberta: "Ataca A, B · Espada", "Dash → casa", "Abrir". */
export function actionMechanicsText(
  action: HistoryAction,
  nameOf: (id: string) => string,
  gridKind: GridKind,
): string {
  const parts: string[] = [];
  if (action.attack) {
    const who = (action.targetId ?? []).map(nameOf).join(", ");
    parts.push(`Ataca${who ? ` ${who}` : ""}${action.attack.weapon ? ` · ${humanWeapon(action.attack.weapon)}` : ""}`);
  }
  if (action.move) {
    const to = action.move.position;
    parts.push(`${action.move.category}${to ? ` → ${formatSlot(to, gridKind)}` : ""}`);
  }
  if (action.interact) parts.push(capitalize(interactLabel(action.interact.kind)));
  return parts.join(" · ");
}

/** A mecânica da reação aberta: "Fuga fechada → casa", "Repelir · Espada", "Nada". */
export function reactionMechanicsText(reaction: HistoryAction, gridKind: GridKind): string {
  const label = capitalize(REACTION_KIND_LABELS[reaction.reactionKind] ?? reaction.reactionKind);
  const to = reaction.move?.position;
  // `repel` vem `unknown` no tipo do histórico: só a arma, e só se o servidor a mostrou.
  const weapon = (reaction.repel as { weapon?: string } | undefined)?.weapon;
  if (to) return `${label} → ${formatSlot(to, gridKind)}`;
  if (weapon) return `${label} · ${humanWeapon(weapon)}`;
  return label;
}

/** Verde = o alvo se saiu bem (evitou, ou nem levou dano); vermelho = foi acertado (D6). */
export function targetResultText(t: ResolutionTarget): { text: string; tone: "success" | "failure" } {
  if (t.avoided) return { text: avoidedVerb(t), tone: "success" };
  if (t.defended) {
    return t.projectedDamage > 0
      ? { text: `defendeu · −${t.projectedDamage}`, tone: "failure" }
      : { text: "defendeu", tone: "success" };
  }
  return t.projectedDamage > 0
    ? { text: `−${t.projectedDamage}`, tone: "failure" }
    : { text: "sem dano", tone: "success" };
}

/** Verde = o ator acertou alguém. Acertado é "não evitou" — a defesa ainda é um acerto. */
export function actorResultText(r: ResolutionPayload): { text: string; tone: "success" | "failure" } {
  const hits = r.targets.filter((t) => !t.avoided).length;
  return hits > 0
    ? { text: `acertou ${hits} de ${r.targets.length}`, tone: "success" }
    : { text: "errou", tone: "failure" };
}
