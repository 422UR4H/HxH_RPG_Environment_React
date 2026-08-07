/**
 * The subset of Pixi's Graphics API `drawStippledSegment` uses.
 *
 * Depending on this structural type instead of Pixi's `Graphics` is what lets the tests
 * record the calls and assert on the resulting dash geometry without a WebGL context —
 * the same technique `losMask.ts` and `fogDraw.ts` use for their own drawing targets.
 */
export type StippleTarget = {
  setStrokeStyle(style: { color: number; width: number; alpha: number }): unknown;
  moveTo(x: number, y: number): unknown;
  lineTo(x: number, y: number): unknown;
  stroke(): unknown;
};

/**
 * Draws a segment, alternating dash and gap along its length.
 *
 * Parametrizes the three stipple styles that used to live as separate copies in
 * WallsLayer: dashed (8/4), dotted (2/4), and destroyed-wall (1/7).
 */
export function drawStippledSegment(
  g: StippleTarget,
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  opts: { color: number; width: number; alpha: number; dashLen: number; gapLen: number },
): void {
  const { color, width, alpha, dashLen, gapLen } = opts;
  const dx = a2.x - a1.x, dy = a2.y - a1.y;
  const totalLen = Math.hypot(dx, dy);
  if (totalLen < 0.1) return;
  const ux = dx / totalLen, uy = dy / totalLen;
  let t = 0, drawing = true;
  while (t < totalLen) {
    const end = Math.min(t + (drawing ? dashLen : gapLen), totalLen);
    if (drawing) {
      g.setStrokeStyle({ color, width, alpha });
      g.moveTo(a1.x + t * ux, a1.y + t * uy);
      g.lineTo(a1.x + end * ux, a1.y + end * uy);
      g.stroke();
    }
    t = end;
    drawing = !drawing;
  }
}
