import type { Bar, BarsPayload, QueuedAction } from "./combatMessages";

export type OrderedQueueItem = { action: QueuedAction; inOrder: boolean };

/** Mesmo conjunto de barras, em qualquer ordem. */
export const sameBars = (a: readonly Bar[], b: readonly Bar[]) => [...a].sort().join(",") === [...b].sort().join(",");

/**
 * A velocidade da ação na barra que ela cobra: a de ação se cobra `action`, senão a final do
 * movimento. Sem declaração (servidor antigo) ou sem o número, vale -Infinity — o desempate
 * cai na chegada.
 */
function speedOf(a: QueuedAction): number {
  const detail = a.action;
  const speed = a.bars.includes("action") ? detail?.speed?.rollCheck?.result : detail?.move?.finalSpeed;
  return speed ?? Number.NEGATIVE_INFINITY;
}

/**
 * A fila na ordem em que o mestre vai abrir (spec §11). `order` (`bars_updated.order`, maior
 * chave primeiro) é público e não carrega id de ação, então casa por ator + barras: cada
 * entrada consome UMA ação da fila. Entre ações do mesmo ator e das mesmas barras, o servidor
 * pega a de maior chave, que cresce com a velocidade — então maior velocidade primeiro, depois
 * chegada. Ação sem entrada na ordem não cabe nesta rodada: vai ao fim, `inOrder: false`.
 * Ordem vazia (antes do primeiro `bars_updated`) é "sem informação": chegada, tudo `inOrder`.
 * Entrada sem ação na fila (a que está em andamento) é ignorada.
 */
export function orderQueue(queue: readonly QueuedAction[], order: BarsPayload["order"]): OrderedQueueItem[] {
  if (order.length === 0) return queue.map((action) => ({ action, inOrder: true }));

  const remaining = [...queue];
  const result: OrderedQueueItem[] = [];
  for (const entry of order) {
    let best = -1;
    remaining.forEach((a, i) => {
      if (a.actorId !== entry.actorId || !sameBars(a.bars, entry.bars)) return;
      // `>` estrito: empate de velocidade fica com a que chegou primeiro.
      if (best === -1 || speedOf(a) > speedOf(remaining[best])) best = i;
    });
    if (best !== -1) result.push({ action: remaining.splice(best, 1)[0], inOrder: true });
  }
  return [...result, ...remaining.map((action) => ({ action, inOrder: false }))];
}
