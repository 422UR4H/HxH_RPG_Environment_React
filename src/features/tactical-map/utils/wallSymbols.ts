import type { GridShape } from "../../../types/tacticalMap";
import { applyTransform } from "./coords";

type XY = { x: number; y: number };
type LocalPoint = [number, number];

const ARC_SEGMENTS = 16;

// Geometria dos símbolos de porta e janela no CHÃO da grade: o desenho é feito em LOCAL e
// cada ponto é projetado com `applyTransform`, como a própria parede. Assim o arco e os
// tracinhos acompanham a grade girada/achatada (isométrica) em vez de ficarem de pé na tela.

function lengths(p1: LocalPoint, p2: LocalPoint, grid: GridShape) {
  const lenLocal = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  const a1 = applyTransform({ x: p1[0], y: p1[1] }, grid);
  const a2 = applyTransform({ x: p2[0], y: p2[1] }, grid);
  const lenWorld = Math.hypot(a2.x - a1.x, a2.y - a1.y);
  return { lenLocal, lenWorld };
}

// Quarto de círculo em LOCAL centrado em p1 (a dobradiça), do sentido da parede até +90°.
// Raio = fração t da parede: 85% dela, no máximo 20 px de tela (medido ao longo da parede).
export function doorArcWorld(p1: LocalPoint, p2: LocalPoint, grid: GridShape, vpScale: number): XY[] {
  const { lenLocal, lenWorld } = lengths(p1, p2, grid);
  if (lenLocal < 1e-6 || lenWorld < 0.1) return [];
  const t = Math.min(0.85, (20 / vpScale) / lenWorld);
  const r = t * lenLocal;
  const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
  const pts: XY[] = [];
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const a = angle + (Math.PI / 2) * (i / ARC_SEGMENTS);
    pts.push(applyTransform({ x: p1[0] + Math.cos(a) * r, y: p1[1] + Math.sin(a) * r }, grid));
  }
  return pts;
}

// Dois tracinhos em 1/3 e 2/3, perpendiculares à parede em LOCAL (a direção é a do chão). O que
// se preserva é o afastamento ATRAVÉS da parede: a ponta do tracinho fica a 5/vpScale unidades
// de WORLD da linha da parede, medido perpendicularmente na tela, como numa grade plana. Na
// isométrica o eixo do chão cruza a parede em ângulo; dimensionar pelo comprimento ao longo dele
// deixaria só uma fração visível para fora do traço da parede.
export function windowTicksWorld(p1: LocalPoint, p2: LocalPoint, grid: GridShape, vpScale: number): XY[][] {
  const { lenLocal, lenWorld } = lengths(p1, p2, grid);
  if (lenLocal < 1e-6 || lenWorld < 0.1) return [];
  const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
  const nx = -dy / lenLocal, ny = dx / lenLocal;
  // û: direção da parede em WORLD; v: uma unidade LOCAL da normal levada a WORLD.
  const a1 = applyTransform({ x: p1[0], y: p1[1] }, grid);
  const a2 = applyTransform({ x: p2[0], y: p2[1] }, grid);
  const ux = (a2.x - a1.x) / lenWorld, uy = (a2.y - a1.y) / lenWorld;
  const c0 = applyTransform({ x: p1[0], y: p1[1] }, grid);
  const c1 = applyTransform({ x: p1[0] + nx, y: p1[1] + ny }, grid);
  const perp = Math.abs(ux * (c1.y - c0.y) - uy * (c1.x - c0.x));
  if (perp < 1e-6) return [];
  const half = (5 / vpScale) / perp;
  return [1 / 3, 2 / 3].map((t) => {
    const cx = p1[0] + t * dx, cy = p1[1] + t * dy;
    return [
      applyTransform({ x: cx - nx * half, y: cy - ny * half }, grid),
      applyTransform({ x: cx + nx * half, y: cy + ny * half }, grid),
    ];
  });
}
