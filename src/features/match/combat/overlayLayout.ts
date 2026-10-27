// A arrumação da camada HTML sobre o mapa: função pura, para testar sem layout de verdade.

export type OverlayBox = { key: string; x: number; y: number; w: number; h: number };

/** Sobreposição de verdade, com área: encostar (borda com borda) não conta. */
function overlaps(a: OverlayBox, b: OverlayBox): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Empilha os itens "acima" da peça (balões) que se sobrepõem: devolve, por chave, quanto
 * cada um sobe (≤ 0, em px). O mais baixo fica no lugar — é o que está mais perto da própria
 * peça — e cada um dos outros sobe até não sobrepor nenhum já posto, com `gap` de folga.
 * Ordem estável: y decrescente, depois x crescente (empate total mantém a ordem de entrada).
 */
export function stackAbove(boxes: OverlayBox[], gap = 4): Record<string, number> {
  const order = [...boxes].sort((a, b) => b.y - a.y || a.x - b.x);
  const placed: OverlayBox[] = [];
  const offsets: Record<string, number> = {};
  for (const box of order) {
    const cur = { ...box };
    // Cada subida passa acima de quem bateu, e o y só diminui: no máximo uma por item posto.
    for (let hit = placed.find((p) => overlaps(cur, p)); hit; hit = placed.find((p) => overlaps(cur, p))) {
      cur.y = hit.y - gap - cur.h;
    }
    placed.push(cur);
    offsets[box.key] = cur.y - box.y;
  }
  return offsets;
}

/**
 * Mantém um item centrado em `centerX` dentro da camada: devolve a borda esquerda já dentro de
 * `[margin, layerWidth - margin - width]`. `tipOffset` é quanto a ponta do balão precisa andar,
 * em relação ao centro do item, para continuar sobre `centerX` depois do deslocamento.
 * Item mais largo que a camada fica encostado na margem esquerda.
 */
export function clampToLayer(
  centerX: number,
  width: number,
  layerWidth: number,
  margin = 4,
): { left: number; tipOffset: number } {
  const max = layerWidth - margin - width;
  const wanted = centerX - width / 2;
  const left = max < margin ? margin : Math.min(Math.max(wanted, margin), max);
  return { left, tipOffset: centerX - (left + width / 2) };
}
