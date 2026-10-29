export interface PopoverPlacementInput {
  /** Retângulo do campo que abre o popover (coordenadas da janela). */
  field: { top: number; bottom: number; left: number };
  /** Tamanho medido do popover. */
  popover: { width: number; height: number };
  /** Tamanho da janela (`innerWidth` / `innerHeight`). */
  viewport: { width: number; height: number };
}

const GAP = 6; // folga entre o campo e o popover
const MARGIN = 8; // folga mínima até a borda da janela

/**
 * Posição de um popover `position: fixed` ancorado num campo.
 * Abaixo do campo; só acima se embaixo não couber mas em cima couber. Se não couber em
 * nenhum lado, fica preso dentro da janela (cobrindo o campo), porque rolar a página não
 * ajuda: o popover é fixo. Lateral presa a 8 px da borda.
 */
export function computePopoverPlacement({
  field,
  popover,
  viewport,
}: PopoverPlacementInput): { top: number; left: number } {
  const fitsBelow = field.bottom + GAP + popover.height <= viewport.height - MARGIN;
  const fitsAbove = field.top - GAP - popover.height >= MARGIN;

  let top: number;
  if (fitsBelow) top = field.bottom + GAP;
  else if (fitsAbove) top = field.top - GAP - popover.height;
  else top = Math.max(MARGIN, viewport.height - popover.height - MARGIN);

  const maxLeft = viewport.width - MARGIN - popover.width;
  const left = Math.max(MARGIN, Math.min(field.left, maxLeft));
  return { top, left };
}

export interface AttachedListPlacementInput {
  /** Retângulo da pílula a que a lista fica presa (coordenadas da janela). */
  field: { top: number; bottom: number };
  /** Altura natural da lista, sem limite (bordas incluídas). */
  listHeight: number;
  /** Altura da janela (`innerHeight`). */
  viewportHeight: number;
}

export interface AttachedListPlacement {
  side: "below" | "above";
  /** Topo da lista (coordenadas da janela); só embaixo. Em cima a lista é presa pela base. */
  top?: number;
  /** Distância da base da lista até a base da janela (CSS `bottom`); só em cima. */
  bottom?: number;
  /** Altura final: a natural, ou o espaço disponível menos a folga (a lista rola por dentro). */
  height: number;
}

/**
 * Lista que continua a pílula, sem folga entre as duas. Embaixo por padrão; em cima só se
 * embaixo não couber e em cima houver mais espaço. Quando nenhum lado comporta a lista
 * inteira, ela usa o espaço do lado escolhido (menos 8 px até a borda) e rola por dentro.
 */
export function computeAttachedListPlacement({
  field,
  listHeight,
  viewportHeight,
}: AttachedListPlacementInput): AttachedListPlacement {
  const roomBelow = Math.max(0, viewportHeight - field.bottom - MARGIN);
  const roomAbove = Math.max(0, field.top - MARGIN);
  const side = listHeight <= roomBelow || roomBelow >= roomAbove ? "below" : "above";
  const height = Math.min(listHeight, side === "below" ? roomBelow : roomAbove);
  // Em cima, ancora pela base: a lista pode ser mais curta que `height` (o teto) e mesmo assim encosta na pílula.
  return side === "below"
    ? { side, top: field.bottom, height }
    : { side, bottom: viewportHeight - field.top, height };
}
