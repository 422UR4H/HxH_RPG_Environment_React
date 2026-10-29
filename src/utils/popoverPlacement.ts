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
