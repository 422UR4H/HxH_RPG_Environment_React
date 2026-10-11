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

/**
 * Passagem para quem age no tabuleiro: porta, janela, e a porta secreta já revelada (encontrada,
 * ela é uma porta como as outras). A não revelada, para o ator, é uma parede.
 */
const isActorPassage = (w: WallSegment) =>
  w.wallType === "door" || w.wallType === "window" || (w.wallType === "secret_door" && !!w.revealed);

/**
 * Os verbos de um ATOR (um personagem agindo): destrancada abre ou fecha conforme está; trancada
 * se arromba (janela trancada, nada); toda parede em pé se ataca — a indestrutível também (num
 * golpe em área ela só não recebe dano). Terreno é cenário; destruída é entulho: nada. Ordem
 * importa: o primeiro é o padrão de um toque, e passar pela porta vem antes de quebrá-la.
 */
export function actorWallVerbs(w: WallSegment): ActKind[] {
  if (w.destroyed) return [];
  const out: ActKind[] = [];
  if (isActorPassage(w)) {
    if (!w.locked) out.push(w.open ? "close" : "open");
    else if (w.wallType !== "window") out.push("lockpick");
  }
  if (w.wallType !== "terrain") out.push("attack");
  return out;
}

/** A mão do mestre numa parede (`enqueue_master_action`): na hora, sem turno, sem alcance. */
export type MasterWallKind = "open" | "close" | "lock" | "unlock" | "reveal" | "destroy";

export const MASTER_WALL_LABELS: Record<MasterWallKind, string> = {
  open: "Abrir",
  close: "Fechar",
  lock: "Trancar",
  unlock: "Destrancar",
  reveal: "Revelar",
  destroy: "Destruir",
};

const isPassage = (w: WallSegment) => w.wallType === "door" || w.wallType === "window" || w.wallType === "secret_door";

/**
 * Os verbos do MESTRE agindo como mestre (sem NPC): abre e fecha qualquer passagem, trancada ou
 * não; tranca e destranca; revela a porta secreta escondida; e destrói qualquer parede em pé — a
 * indestrutível também (um terremoto não é um ataque). Destruída, nada (o card ainda mostra que
 * ela caiu).
 */
export function masterWallVerbs(w: WallSegment): MasterWallKind[] {
  if (w.destroyed) return [];
  const out: MasterWallKind[] = [];
  if (isPassage(w)) {
    out.push(w.open ? "close" : "open", w.locked ? "unlock" : "lock");
    if (w.wallType === "secret_door" && !w.revealed) out.push("reveal");
  }
  out.push("destroy");
  return out;
}

/** A vida da parede como o mestre lê: "Vida 7/10", "Indestrutível", "Destruída". */
export function wallLifeText(w: WallSegment): string {
  if (w.destroyed) return "Destruída";
  if (w.maxHp <= 0) return "Indestrutível";
  return `Vida ${w.hp}/${w.maxHp}`;
}
