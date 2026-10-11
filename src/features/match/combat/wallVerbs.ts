// O que se pode fazer com uma parede, por quem. Regra única para o compositor (o ator — jogador
// ou NPC do mestre — via `enqueue_action`), o card do mestre (`enqueue_master_action`) e o
// hit-test do mapa: uma parede sem verbo nenhum não é tocável.
import type { WallSegment, WallType } from "../../../types/tacticalMap";

/** O que a metade "mira em alguém" do rascunho faz. Personagem só aceita `attack`. */
export type ActKind = "attack" | "open" | "close" | "lockpick";
export type WallInteractKind = Exclude<ActKind, "attack">;

export const WALL_TYPE_LABELS: Record<WallType, string> = {
  door: "Porta",
  window: "Janela",
  terrain: "Terreno",
  secret_door: "P. Secreta",
  wall: "Parede",
};

export const ACT_LABELS: Record<ActKind, string> = {
  attack: "Atacar",
  open: "Abrir",
  close: "Fechar",
  lockpick: "Arrombar fechadura",
};

export const ACT_ICONS: Record<ActKind, string> = {
  attack: "⚔",
  open: "🚪",
  close: "🚪",
  lockpick: "🔓",
};

/** O substantivo do botão de declarar: "Declarar ataque", "Declarar movimento + abertura". */
export const ACT_NOUNS: Record<ActKind, string> = {
  attack: "ataque",
  open: "abertura",
  close: "fechamento",
  lockpick: "arrombamento",
};

const isPassage = (w: WallSegment) => w.wallType === "door" || w.wallType === "window";

/**
 * Os verbos de um ATOR (um personagem agindo): destrancada abre ou fecha conforme está; porta
 * trancada só se arromba (janela trancada, nada); destrutível se ataca. Destruída, nada. Ordem
 * importa: o primeiro é o padrão de um toque, e passar pela porta vem antes de quebrá-la.
 */
export function actorWallVerbs(w: WallSegment): ActKind[] {
  if (w.destroyed) return [];
  const out: ActKind[] = [];
  if (isPassage(w)) {
    if (!w.locked) out.push(w.open ? "close" : "open");
    else if (w.wallType === "door") out.push("lockpick");
  }
  if (w.wallType !== "terrain" && w.maxHp > 0) out.push("attack");
  return out;
}

/** A mão do mestre numa parede (`enqueue_master_action`): na hora, sem turno, sem alcance. */
export type MasterWallKind = "open" | "close" | "lock" | "unlock" | "reveal";

export const MASTER_WALL_LABELS: Record<MasterWallKind, string> = {
  open: "Abrir",
  close: "Fechar",
  lock: "Trancar",
  unlock: "Destrancar",
  reveal: "Revelar",
};

/**
 * Os verbos do MESTRE agindo como mestre: abre e fecha qualquer passagem, trancada ou não; tranca
 * e destranca porta e janela; revela a porta secreta que ainda não foi revelada. Parede comum e
 * terreno, nada — o mestre ataca por um NPC.
 */
export function masterWallVerbs(w: WallSegment): MasterWallKind[] {
  if (w.destroyed) return [];
  if (w.wallType === "secret_door") {
    return [w.open ? "close" : "open", ...(w.revealed ? [] : ["reveal" as const])];
  }
  if (!isPassage(w)) return [];
  return [w.open ? "close" : "open", w.locked ? "unlock" : "lock"];
}
