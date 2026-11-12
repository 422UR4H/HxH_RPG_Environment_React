// Camadas e ritmo da luz dos diagramas, copiados da referência aprovada (brilho v7,
// docs/audits/2026-11-11-briefing-regras-da-ficha/brilho-referencia.html).

export interface GlowLayer {
  blur: number; // stdDeviation do desfoque
  region: number; // margem do filtro, em fração da caixa (o desfoque maior precisa de mais)
  line: number; // largura da linha
  ring: number; // raio da bolinha × este fator
  lo: number; // opacidade mínima da respiração
  hi: number; // opacidade máxima (e o estado final sem movimento)
  breathSeconds: number;
}

// De fora para dentro.
export const GLOW_LAYERS: readonly GlowLayer[] = [
  { blur: 55, region: 1.5, line: 60, ring: 3.4, lo: 0.26, hi: 0.34, breathSeconds: 6.0 },
  { blur: 30, region: 1, line: 40, ring: 2.4, lo: 0.52, hi: 0.66, breathSeconds: 5.2 },
  { blur: 18, region: 1, line: 18, ring: 1.6, lo: 0.72, hi: 0.86, breathSeconds: 4.4 },
  { blur: 8, region: 1, line: 9, ring: 1.35, lo: 0.8, hi: 0.95, breathSeconds: 3.8 },
];

// Peças pintadas (quando a pintura não é "all") saem um pouco mais largas que as brancas,
// para a cor transbordar por cima da luz branca.
export const PAINTED_LINE_SCALE = 1.3;
export const PAINTED_BEAD_SCALE = 1.2;
// O vazamento usa a largura das linhas pintadas.
export const BLEED_LINE_SCALE = 1.3;
// Formas preenchidas (setas, arcos) levam metade da largura da linha no halo.
export const SHAPE_STROKE_SCALE = 0.5;

// Núcleo: filamento branco contínuo.
export const CORE_LINE_WIDTH = 4;
export const CORE_SOFT_LINE_WIDTH = 7;
export const CORE_SOFT_LINE_OPACITY = 0.45;
export const CORE_SOFT_BLUR = 2.5;
export const CORE_CENTER_SCALE = 0.62; // miolo branco = 0,62 × raio

// Raio de referência (bolinha de vértice do físico): bolinhas menores respiram menos.
export const BEAD_REFERENCE_RADIUS = 28.05;
export const BEAD_BREATH_GROW = 0.05; // ≤ ±5%
export const BEAD_BREATH_SECONDS: readonly [number, number] = [3.2, 5.2];
export const BEAD_BREATH_MAX_DELAY = 5;

// De vez em quando uma bolinha abre o halo um pouco mais, devagar.
export const SWELL_GROW = 0.13;
export const SWELL_INTERVAL_MS = 1800;
export const SWELL_DURATION_MS = 2400;

// Ignição ao aparecer.
export const IGNITION_LINE_SECONDS = 0.7;
export const IGNITION_STAGGER_SECONDS = 0.05;
export const IGNITION_BEAD_DELAY_SECONDS = 0.2;
export const IGNITION_BEAD_POP_SECONDS = 0.4;
export const IGNITION_GLOW_DELAY_SECONDS = 0.5;
export const IGNITION_GLOW_SECONDS = 0.8;
