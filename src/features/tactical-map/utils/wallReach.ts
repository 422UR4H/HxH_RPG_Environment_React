import type { GridShape, SlotCoord, WallSegment } from "../../../types/tacticalMap";
import { isSameSlot, isSlotInBounds, localToSlot, slotToLocal } from "./coords";
import { isMovementBlocked } from "./walls";

/**
 * Os slots que ENCOSTAM numa parede — de onde um personagem a alcança, como o vizinho de uma
 * peça. É o "alcance" de uma parede-alvo no compositor de ação.
 *
 * Anda pelo segmento no espaço LOCAL da grade (o mesmo de `p1/p2`) e, em cada amostra, olha um
 * quarto de célula para cada lado: numa parede sobre a aresta, pega as duas fileiras; numa que
 * corta células, pega as cortadas e as vizinhas. Serve para quadrado e hex, com qualquer rotação —
 * o transform nunca entra. As pontas recuam um pouco: uma parede que termina num vértice da grade
 * não alcança as células que só tocam aquele canto.
 */
export function wallContactSlots(wall: WallSegment, grid: GridShape): SlotCoord[] {
  const [x1, y1] = wall.p1;
  const [x2, y2] = wall.p2;
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len === 0) return [];
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  const side = grid.cellSize / 4;
  const samples = Math.max(1, Math.ceil(len / (grid.cellSize / 4)));
  const inset = Math.min(0.49, (grid.cellSize * 0.05) / len);

  const out: SlotCoord[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = inset + (1 - 2 * inset) * (i / samples);
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    for (const s of [1, -1]) {
      const slot = localToSlot({ x: px + nx * side * s, y: py + ny * side * s }, grid);
      if (isSlotInBounds(slot, grid) && !out.some((o) => isSameSlot(o, slot))) out.push(slot);
    }
  }
  return out;
}

/**
 * O servidor recusaria (`move_blocked`) andar em linha reta de `from` a `to`? Espelha a checagem
 * dele: centros dos slots no espaço LOCAL da grade (o das paredes) contra as paredes com `move` e
 * fechadas. Quem propõe um destino usa isto para não propor o que o servidor vai recusar.
 */
export function isPathClear(from: SlotCoord, to: SlotCoord, walls: WallSegment[], grid: GridShape): boolean {
  const a = slotToLocal(from, grid);
  const b = slotToLocal(to, grid);
  return !isMovementBlocked([a.x, a.y], [b.x, b.y], walls);
}
