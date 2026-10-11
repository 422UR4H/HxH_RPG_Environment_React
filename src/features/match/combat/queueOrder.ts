import type { Bar, BarsPayload, QueuedAction, RoundMode } from "./combatMessages";

/** `key`: a chave da entrada da ordem que casou com esta ação (ausente se não coube na rodada). */
export type OrderedQueueItem = { action: QueuedAction; inOrder: boolean; key?: number };

/** Mesmo conjunto de barras, em qualquer ordem. */
export const sameBars = (a: readonly Bar[], b: readonly Bar[]) => [...a].sort().join(",") === [...b].sort().join(",");

/**
 * A velocidade da ação nas barras que ela cobra: a de ação se cobra `action`, a final do
 * movimento se cobra `move`. Cobrando as duas (investida) o servidor ordena pela MENOR das
 * chaves, então aqui também vale a menor velocidade. Sem declaração (servidor antigo) ou sem
 * o número, vale -Infinity — o desempate cai na chegada.
 */
function speedOf(a: QueuedAction): number {
  const detail = a.action;
  const speeds: number[] = [];
  if (a.bars.includes("action")) speeds.push(detail?.speed?.rollCheck?.result ?? Number.NEGATIVE_INFINITY);
  if (a.bars.includes("move")) speeds.push(detail?.move?.finalSpeed ?? Number.NEGATIVE_INFINITY);
  return speeds.length ? Math.min(...speeds) : Number.NEGATIVE_INFINITY;
}

/**
 * A fila na ordem em que o mestre vai abrir (spec §11). `order` (`bars_updated.order`, maior
 * chave primeiro) é público e não carrega id de ação, então casa por ator + barras: cada
 * entrada consome UMA ação da fila. Entre ações do mesmo ator e das mesmas barras, o servidor
 * pega a de maior chave, que cresce com a velocidade — então maior velocidade primeiro, depois
 * chegada. Ação sem entrada na ordem não cabe nesta rodada: vai ao fim, `inOrder: false`.
 * "Sem informação" (chegada, tudo `inOrder`) é: nenhum `bars_updated` ainda (`order`
 * undefined) ou fora do Race. No Free não há portão — a ordem só vem vazia com a fila vazia.
 * No Race, ordem vazia com fila cheia quer dizer que nenhuma ação consegue pagar: todas
 * `inOrder: false` (o mesmo estado em que o botão do mestre vira "Encerrar rodada").
 * A ordem é projetada só da fila pendente (a ação aberta já saiu dela), então toda entrada
 * tem uma ação na fila; entrada sem par só acontece de passagem (um `bars_updated` que
 * corre à frente de `action_queued`/`turn_opened`) e é pulada.
 */
export function orderQueue(
  queue: readonly QueuedAction[],
  order: BarsPayload["order"] | undefined,
  mode?: RoundMode | "",
): OrderedQueueItem[] {
  if (!order || (order.length === 0 && mode !== "Race")) return queue.map((action) => ({ action, inOrder: true }));

  const remaining = [...queue];
  const result: OrderedQueueItem[] = [];
  for (const entry of order) {
    let best = -1;
    remaining.forEach((a, i) => {
      if (a.actorId !== entry.actorId || !sameBars(a.bars, entry.bars)) return;
      // `>` estrito: empate de velocidade fica com a que chegou primeiro.
      if (best === -1 || speedOf(a) > speedOf(remaining[best])) best = i;
    });
    if (best !== -1) result.push({ action: remaining.splice(best, 1)[0], inOrder: true, key: entry.key });
  }
  return [...result, ...remaining.map((action) => ({ action, inOrder: false }))];
}
