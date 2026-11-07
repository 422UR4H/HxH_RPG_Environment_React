// Movimentos empilhados (spec 2026-11-06, D3–D6; contrato `match-combat-ws.md` § Movimentos
// empilhados). Os movimentos de um personagem formam uma cadeia na ordem de declaração: cada
// um se empilha no ÚLTIMO movimento ainda pendente daquele personagem (puro ou combinado) e
// parte do destino dele. Ação sem movimento não entra na cadeia nem a quebra.
//
// O `action_enqueued` só devolve o id, então a cadeia sai daqui, das listas que o cliente já
// tem, na ordem em que chegaram. Tudo puro: o mapa (Pixi) não tem teste, a geometria fica aqui.
import type { SlotTriple } from "../../tactical-map/utils/coords";
import type { QueuedAction } from "./combatMessages";
import type { ActionSummary } from "./combatText";
import { pendingMoves } from "./combatReducer";
import type { DeclaredAction } from "./combatReducer";

/** Um movimento ainda pendente (declarado, não aberto), de qualquer fonte. */
export type ChainMove = {
  id: string;
  actorId: string;
  to: SlotTriple;
  /** A origem que o servidor (ou o envio) registrou; só serve sem peça no tabuleiro. */
  from?: SlotTriple;
  /** `move.stackedOn` do wire (fila do mestre). Ausente = derivar pela ordem. */
  stackedOn?: string;
  /** Presente quando ESTE navegador o declarou — só a declarada pode "chegar" (ver `arrivedMoves`). */
  ownStatus?: DeclaredAction["status"];
  /** O que descrever no diálogo de cancelar. */
  summary: ActionSummary;
};

function summaryOfQueued(q: QueuedAction): ActionSummary {
  const a = q.action;
  return {
    move: a?.move && { category: a.move.category, to: a.move.position },
    attack: a?.attack && { targets: a.targetId ?? [], weapon: a.attack.weapon },
    interact: a?.interact && { kind: a.interact.kind, targets: a.targetId ?? [] },
  };
}

/**
 * Os movimentos pendentes na ordem de chegada ao servidor. A fila do mestre (`queue`) já está em
 * ordem de inserção; o que só existe em `declared` (o jogador; o envio do mestre ainda sem
 * `action_queued`) veio depois. Uma ação nas duas listas (o NPC que o mestre declarou) entra uma
 * vez, no lugar da fila, com o que este navegador declarou.
 */
export function pendingChainMoves(declared: DeclaredAction[], queue: QueuedAction[]): ChainMove[] {
  const own = pendingMoves(declared);
  const ownById = new Map(own.map((d) => [d.id, d]));
  const fromDeclared = (d: (typeof own)[number], stackedOn?: string): ChainMove => ({
    id: d.id,
    actorId: d.actorId,
    to: d.move.to,
    from: d.move.from,
    stackedOn,
    ownStatus: d.status,
    summary: { move: d.move, attack: d.attack, interact: d.interact },
  });
  const out: ChainMove[] = [];
  const seen = new Set<string>();
  for (const q of queue) {
    const position = q.action?.move?.position;
    if (!position) continue;
    seen.add(q.actionId);
    const stackedOn = q.action?.move?.stackedOn;
    const mine = ownById.get(q.actionId);
    out.push(mine ? fromDeclared(mine, stackedOn) : {
      id: q.actionId,
      actorId: q.actorId,
      to: position,
      from: q.action?.move?.from,
      stackedOn,
      summary: summaryOfQueued(q),
    });
  }
  for (const d of own) if (!seen.has(d.id)) out.push(fromDeclared(d));
  return out;
}

/**
 * O movimento em que `move` está empilhado, se ainda pendente. Vale o `stackedOn` do wire quando
 * aponta para um pendente; senão (ausente, ou velho — o anterior abriu ou foi consumido) a regra
 * do servidor: o último movimento pendente do mesmo personagem antes dele. Sem nenhum, ele é a
 * cabeça da cadeia e parte da peça.
 */
export function predecessorOf(move: ChainMove, moves: ChainMove[]): ChainMove | undefined {
  if (move.stackedOn) {
    const explicit = moves.find((m) => m.id === move.stackedOn);
    if (explicit) return explicit;
  }
  const i = moves.findIndex((m) => m.id === move.id);
  for (let j = i - 1; j >= 0; j--) if (moves[j].actorId === move.actorId) return moves[j];
  return undefined;
}

/** O fim da cadeia do personagem: o último movimento dele ainda pendente. */
export function chainTailOf(actorId: string, moves: ChainMove[]): ChainMove | undefined {
  for (let i = moves.length - 1; i >= 0; i--) if (moves[i].actorId === actorId) return moves[i];
  return undefined;
}

/** A cabeça da cadeia do personagem: o movimento dele que vai abrir primeiro. */
export function chainHeadOf(actorId: string, moves: ChainMove[]): ChainMove | undefined {
  return moves.find((m) => m.actorId === actorId && !predecessorOf(m, moves));
}

/** Os movimentos empilhados em `id`, direta ou transitivamente, em ordem de cadeia (D5). */
export function stackedAfter(id: string, moves: ChainMove[]): ChainMove[] {
  const gone = new Set([id]);
  const out: ChainMove[] = [];
  for (const m of moves) {
    if (gone.has(m.id)) continue;
    const p = predecessorOf(m, moves);
    if (p && gone.has(p.id)) {
      gone.add(m.id);
      out.push(m);
    }
  }
  return out;
}

/**
 * De onde sai o fantasma: do destino do anterior enquanto ele está pendente; senão da peça (onde
 * ela ESTÁ, não onde estava ao declarar); sem peça, da origem registrada.
 */
export function ghostOrigin(move: ChainMove, moves: ChainMove[], piece: SlotTriple | undefined): SlotTriple | undefined {
  return predecessorOf(move, moves)?.to ?? piece ?? move.from;
}

/**
 * As declaradas que a peça já cumpriu (o `turn_opened` delas pode ter se perdido numa queda):
 * na fila, cabeça da cadeia, e a peça no destino. Um empilhado nunca "chega" — a peça no destino
 * dele, com o anterior pendente, é só onde ela está agora (um vai-e-volta).
 */
export function arrivedMoves(
  moves: ChainMove[],
  isAt: (actorId: string, to: SlotTriple) => boolean,
): ChainMove[] {
  return moves.filter((m) => m.ownStatus === "queued" && !predecessorOf(m, moves) && isAt(m.actorId, m.to));
}

const sameColRow = (a: SlotTriple, b: SlotTriple) => a[0] === b[0] && a[1] === b[1];

/**
 * A fuga gasta a cabeça da cadeia (D6). Se ela não vai para onde a cabeça ia, o que está
 * empilhado na cabeça é cancelado. `destination` ausente: ainda não escolhida — vale o aviso se
 * há o que perder. `[]` quando nada cai.
 */
export function stackedLostByEscape(
  actorId: string,
  moves: ChainMove[],
  destination?: SlotTriple,
): ChainMove[] {
  const head = chainHeadOf(actorId, moves);
  if (!head || (destination && sameColRow(destination, head.to))) return [];
  return stackedAfter(head.id, moves);
}

/**
 * Os ids das ações pendentes do personagem que cobram a barra de ação (ataque, interação ou
 * combinada; igual a `Action.Bars()`: só o movimento puro fica de fora): `declared` (jogador; `open` já saiu da fila) e `queue` (mestre, `bars`). Uma ação
 * nas duas listas entra uma vez.
 */
export function pendingActionBarIds(actorId: string, declared: DeclaredAction[], queue: QueuedAction[]): string[] {
  const out = new Set<string>();
  for (const q of queue) if (q.actorId === actorId && q.bars.includes("action")) out.add(q.actionId);
  for (const d of declared) {
    if (d.actorId === actorId && d.status !== "open" && (!d.move || d.attack || d.interact)) out.add(d.id);
  }
  return [...out];
}

/**
 * O repelir cobra só a barra de ação e não tem destino: o servidor gasta a melhor ação de ação
 * NÃO bloqueada (ataque/interação puros ou combinada na cabeça da cadeia) e, só sem nenhuma, uma
 * combinada empilhada. Os movimentos empilhados na ação gasta caem (cascata). O cliente não sabe
 * as chaves (os dados são secretos), então só afirma (`certain`) quando TODO candidato perderia
 * algo; `lost` é a união do que cada candidato derrubaria. Sem candidato com empilhados, nada.
 */
export function stackedLostByRepel(
  actorId: string,
  moves: ChainMove[],
  actionBarPending: string[],
): { lost: ChainMove[]; certain: boolean } {
  const byId = new Map(moves.filter((m) => m.actorId === actorId).map((m) => [m.id, m]));
  const unblocked = actionBarPending.filter((id) => {
    const m = byId.get(id);
    return !m || !predecessorOf(m, moves);
  });
  const candidates = unblocked.length > 0 ? unblocked : actionBarPending;
  const perCandidate = candidates.map((id) => (byId.has(id) ? stackedAfter(id, moves) : []));
  const lostIds = new Set(perCandidate.flat().map((m) => m.id));
  if (lostIds.size === 0) return { lost: [], certain: false };
  return {
    lost: moves.filter((m) => lostIds.has(m.id)),
    certain: perCandidate.every((l) => l.length > 0),
  };
}
