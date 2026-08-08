import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { GridShape } from "../../../types/tacticalMap";
import { applyTransform, offsetToAxial } from "../utils/coords";
import { hexToPixel } from "../utils/hex";

// Grid lines are drawn directly in WORLD space: every endpoint is pushed through
// applyTransform (rotation + screen-space skew). This avoids a skewed Pixi
// container, which would scale the stroke width non-uniformly and make lines
// vanish at certain skew/zoom combinations. An affine transform keeps straight
// lines straight, so transforming just the two endpoints of each line is exact.
export default function GridLayer({ grid, vpScale }: { grid: GridShape; vpScale: number }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      const colorHex = parseInt(grid.color.replace("#", ""), 16);
      g.setStrokeStyle({ width: 1 / vpScale, color: colorHex, alpha: grid.opacity });
      if (grid.kind === "square") {
        const { cols, rows, cellSize } = grid;
        const gw = cols * cellSize;
        const gh = rows * cellSize;
        for (let c = 0; c <= cols; c++) {
          const a = applyTransform({ x: c * cellSize, y: 0 }, grid);
          const b = applyTransform({ x: c * cellSize, y: gh }, grid);
          g.moveTo(a.x, a.y).lineTo(b.x, b.y);
        }
        for (let r = 0; r <= rows; r++) {
          const a = applyTransform({ x: 0, y: r * cellSize }, grid);
          const b = applyTransform({ x: gw, y: r * cellSize }, grid);
          g.moveTo(a.x, a.y).lineTo(b.x, b.y);
        }
      } else {
        const size = grid.cellSize;
        for (let r = 0; r < grid.rows; r++) {
          for (let c = 0; c < grid.cols; c++) {
            const { q, r: ar } = offsetToAxial(c, r);
            const center = hexToPixel({ q, r: ar }, size);
            for (let i = 0; i < 6; i++) {
              const angle = ((60 * i - 30) * Math.PI) / 180;
              const p = applyTransform(
                { x: center.x + size * Math.cos(angle), y: center.y + size * Math.sin(angle) },
                grid,
              );
              if (i === 0) g.moveTo(p.x, p.y);
              else g.lineTo(p.x, p.y);
            }
            g.closePath();
          }
        }
      }
      g.stroke();
    },
    [grid, vpScale],
  );

  return <pixiGraphics draw={draw} />;
}
