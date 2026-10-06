import type { GridShape, SlotCoord } from "../../../types/tacticalMap";
import { slotInradius, slotToWorld } from "./coords";

/**
 * O enquadramento do viewport do Pixi visto de fora: a origem do mundo na tela (`x`, `y`)
 * e o zoom (`scale`). É o que a camada HTML precisa para pôr coisas ao lado das peças.
 */
export type ViewportTransform = { x: number; y: number; scale: number };

/** O centro da casa em px da tela (relativos ao canto do palco). */
export function pieceScreenAnchor(
  slot: SlotCoord,
  grid: GridShape,
  t: ViewportTransform,
): { x: number; y: number } {
  const world = slotToWorld(slot, grid);
  return { x: world.x * t.scale + t.x, y: world.y * t.scale + t.y };
}

/** O raio da peça na tela — para o balão nascer na borda dela, não por cima. */
export function pieceScreenRadius(grid: GridShape, t: ViewportTransform): number {
  return slotInradius(grid) * t.scale;
}
