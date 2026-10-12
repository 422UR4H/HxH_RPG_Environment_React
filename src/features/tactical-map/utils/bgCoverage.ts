import type { BgImage, GridShape, SlotCoord } from "../../../types/tacticalMap";
import { applyTransform, offsetToAxial, slotCorners } from "./coords";

type XY = { x: number; y: number };

// Tolerância para ruído de ponto flutuante numa borda compartilhada: só conta como
// sobreposição se a interseção tiver largura maior que isto em TODOS os eixos.
const EPS = 1e-6;

// Retângulo da imagem em WORLD, girado `rotation` graus em torno do próprio centro
// (é assim que o BgLayer desenha: anchor 0.5 + rotation).
function bgCorners(bg: NonNullable<BgImage>): XY[] {
  const cx = bg.x + bg.width / 2;
  const cy = bg.y + bg.height / 2;
  const t = (bg.rotation * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const hw = bg.width / 2;
  const hh = bg.height / 2;
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([dx, dy]) => ({
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  }));
}

function project(poly: XY[], ax: number, ay: number): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const p of poly) {
    const d = p.x * ax + p.y * ay;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return [min, max];
}

// Interseção de ÁREA POSITIVA entre dois polígonos convexos (SAT): encostar na borda
// não conta. Os eixos são as normais unitárias das arestas de ambos.
function overlaps(a: XY[], b: XY[]): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      const len = Math.hypot(q.x - p.x, q.y - p.y);
      if (len === 0) continue;
      const ax = -(q.y - p.y) / len;
      const ay = (q.x - p.x) / len;
      const [minA, maxA] = project(a, ax, ay);
      const [minB, maxB] = project(b, ax, ay);
      if (Math.min(maxA, maxB) - Math.max(minA, minB) <= EPS) return false;
    }
  }
  return true;
}

function offsetSlot(col: number, row: number, grid: GridShape): SlotCoord {
  if (grid.kind === "square") return { kind: "square", col, row };
  const { q, r } = offsetToAxial(col, row);
  return { kind: "hex", q, r };
}

// Quantas colunas/linhas de ponta a grade tem SEM nenhuma célula tocando a imagem.
// Uma coluna (linha) está descoberta se nenhuma de suas células sobrepõe a imagem;
// `right`/`bottom` contam do fim até a primeira coberta, `left`/`top` do começo.
// Se nenhuma célula é coberta, tudo 0 (não há o que aparar de forma significativa).
export function uncoveredGridLines(
  grid: GridShape,
  bg: NonNullable<BgImage>,
): { left: number; right: number; top: number; bottom: number } {
  const img = bgCorners(bg);
  const colCovered = new Array<boolean>(grid.cols).fill(false);
  const rowCovered = new Array<boolean>(grid.rows).fill(false);
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (overlaps(slotCorners(offsetSlot(c, r, grid), grid), img)) {
        colCovered[c] = true;
        rowCovered[r] = true;
      }
    }
  }

  const first = colCovered.indexOf(true);
  const firstRow = rowCovered.indexOf(true);
  if (first === -1 || firstRow === -1) return { left: 0, right: 0, top: 0, bottom: 0 };
  return {
    left: first,
    right: grid.cols - 1 - colCovered.lastIndexOf(true),
    top: firstRow,
    bottom: grid.rows - 1 - rowCovered.lastIndexOf(true),
  };
}

// Apara `right` colunas e `bottom` linhas da grade e move o bg pelo deslocamento que o
// pivô novo causa no canto local (0,0), para as células sobreviventes ficarem no mesmo
// lugar sobre a imagem (a grade salva mantém a origem recebida).
export function trimUncoveredGrid(
  grid: GridShape,
  bg: NonNullable<BgImage>,
  right: number,
  bottom: number,
): { grid: GridShape; bg: NonNullable<BgImage> } {
  const trimmed: GridShape = { ...grid, cols: grid.cols - right, rows: grid.rows - bottom };
  const a = applyTransform({ x: 0, y: 0 }, grid);
  const b = applyTransform({ x: 0, y: 0 }, trimmed);
  return { grid: trimmed, bg: { ...bg, x: bg.x + (b.x - a.x), y: bg.y + (b.y - a.y) } };
}
