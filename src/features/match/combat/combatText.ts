// Os textos de combate que mais de um componente escreve — um lugar só, para as telas
// dizerem a mesma coisa do mesmo jeito.
import type { GridKind } from "../../../types/tacticalMap";
import type { SlotTriple } from "../../tactical-map/utils/coords";
import type { Bar, RoundMode } from "./combatMessages";
import type { HistoryAction } from "../../../types/matchHistory";
import type { DeclaredAction } from "./combatReducer";

export const ROUND_MODE_LABELS: Record<RoundMode, string> = { Free: "Livre", Race: "Disputado" };

export const BAR_ICONS: Record<Bar, string> = { action: "⚔", move: "➜" };
export const BAR_LABELS: Record<Bar, string> = { action: "ação", move: "movimento" };

/** O que a ação/reação gasta, com a barra por extenso ("barra de ação", "barras de ação e movimento"). */
export function costLabel(bars: Bar[]): string {
  return `${bars.length > 1 ? "barras" : "barra"} de ${bars.map((b) => BAR_LABELS[b]).join(" e ")}`;
}

/** `reaction.rung` do repelir — snake_case do domínio, rótulo PT na tela. */
export const RUNG_LABELS: Record<string, string> = {
  great_success: "sucesso total",
  success: "sucesso",
  near_miss: "quase",
  failure: "falha",
};

export const REACTION_KIND_LABELS: Record<string, string> = {
  nothing: "nada",
  default: "reação padrão",
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
  // Só o mestre revela (master action `revealWall`); o jogador nunca declara isto.
  reveal: "revelar",
  // Só o mestre tranca e destranca (master action `wallInteract`).
  lock: "trancar",
  unlock: "destrancar",
  destroy: "destruir",
};

export const interactLabel = (kind: string) => INTERACT_LABELS[kind] ?? kind;

/**
 * W1: o verbo de "evitou" depende de COMO o alvo evitou, não de um texto fixo — o contrato
 * (`targets[].avoided`) diz que `avoided` vale por qualquer meio; pergunte a `reaction.kind`.
 * Com `attackStopped`, ninguém "evitou": o golpe já tinha parado. Sem reação, ou na reação padrão, o alvo usou o
 * reflexo passivo de esquiva.
 */
export function avoidedVerb(t: { reaction?: { kind: string }; attackStopped?: boolean }): string {
  // Um aparo anterior já tinha parado o golpe: nem esquiva nem fuga foi o que salvou o alvo.
  if (t.attackStopped) return "ficou a salvo";
  switch (t.reaction?.kind) {
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

/** O rótulo da arma na tela: o catálogo sempre traz `Fist`, que é o mesmo que "Desarmado". */
export const weaponLabel = (name: string) => (name === "Fist" ? "Desarmado" : humanWeapon(name));

/** " com Sword" ou " desarmado" — o complemento do verbo de ataque no texto corrido. */
export const withWeapon = (name: string) => (name === "Fist" ? " desarmado" : ` com ${humanWeapon(name)}`);

/** A ação em forma neutra: o que o rascunho (`DeclaredAction`) e o wire (`HistoryAction`) têm em comum. */
export type ActionSummary = {
  /** `to` ausente: o leitor não viu a casa (a projeção do histórico corta). */
  move?: { category: string; to?: SlotTriple };
  attack?: { targets: string[]; weapon?: string };
  /** `targets` ausente ou vazio: o texto cai em "a passagem". */
  interact?: { kind: string; targets?: string[] };
};

/** "Mover para coluna 8, linha 5 (Dash) e atacar Hisoka com Sword". */
export function describeAction(d: ActionSummary, nameOf: (id: string) => string, gridKind: GridKind): string {
  const parts: string[] = [];
  if (d.move) parts.push(`mover${d.move.to ? ` para ${formatSlot(d.move.to, gridKind)}` : ""} (${d.move.category})`);
  if (d.attack) {
    const who = d.attack.targets.map(nameOf).join(", ");
    parts.push(`atacar ${who}${d.attack.weapon ? withWeapon(d.attack.weapon) : ""}`);
  }
  if (d.interact) {
    const what = d.interact.targets?.length ? d.interact.targets.map(nameOf).join(", ") : "a passagem";
    parts.push(`${interactLabel(d.interact.kind)} ${what}`);
  }
  const text = parts.join(" e ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A declarada do rascunho. */
export function describeDeclared(
  d: Pick<DeclaredAction, "move" | "attack" | "interact">,
  nameOf: (id: string) => string,
  gridKind: GridKind,
): string {
  return describeAction(d, nameOf, gridKind);
}

/** A ação como o histórico a guarda: alvos em `targetId`, destino em `move.position` (pode faltar). */
export function describeHistoryAction(a: HistoryAction, nameOf: (id: string) => string, gridKind: GridKind): string {
  return describeAction(
    {
      move: a.move && { category: a.move.category, to: a.move.position },
      attack: a.attack && { targets: a.targetId ?? [], weapon: a.attack.weapon },
      interact: a.interact && { kind: a.interact.kind, targets: a.targetId ?? [] },
    },
    nameOf,
    gridKind,
  );
}
