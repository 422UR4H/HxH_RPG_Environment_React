// Geometria pura das nuvens do `RisingClouds`: o componente monta o CSS a partir daqui e o
// teste resolve as mesmas medidas em pixels para provar que nenhuma nuvem cobre outra.

// ─── Parâmetros ajustáveis ────────────────────────────────────────────────────────────
// Segundos que cada nuvem leva para atravessar a tela de baixo até em cima. É igual para
// todas (e o percurso também), então todas sobem na mesma velocidade. Menor = mais rápido.
export const CROSSING_SECONDS = 17;
// Inclinação da trajetória, em graus a partir da vertical (0 = sobe reto).
export const TRAJECTORY_ANGLE_DEG = 12;
// Sentido da deriva horizontal enquanto sobe: 1 = para a direita, -1 = para a esquerda.
export const DRIFT_DIRECTION: 1 | -1 = 1;
// Largura de referência em vmax (o lado maior da tela): a mesma nuvem ocupa boa parte do
// celular em pé e uma fração menor do monitor largo, sem media query por aparelho.
export const BASE_WIDTH_VMAX = 22;
// Opacidade de todas as nuvens: no azul, parecem distantes.
export const CLOUD_OPACITY = 0.5;
// Fração da largura da nuvem que fica para fora da borda no meio da travessia.
export const EDGE_BLEED = 0.3;
// ──────────────────────────────────────────────────────────────────────────────────────

// Dimensões intrínsecas dos arquivos: reservam a altura antes de a imagem carregar.
export const IMAGE_SIZES = {
  cloud: { width: 1522, height: 782 },
  cloud2: { width: 730, height: 529 },
} as const;

export type CloudImageKey = keyof typeof IMAGE_SIZES;

export interface CloudConfig {
  image: CloudImageKey;
  /** Coluna: sangra pela borda esquerda ou pela direita. O meio fica livre para o conteúdo. */
  side: "left" | "right";
  /** Multiplica `BASE_WIDTH_VMAX` (±15% no máximo, para não parecerem carimbos). */
  scale: number;
  /** Fração do percurso já feita no primeiro quadro (0–1): espalha as nuvens desde o início
   *  e é também onde cada uma fica parada com movimento reduzido. */
  phase: number;
  mirror: boolean;
}

// Por que nunca se sobrepõem:
// - Mesma duração e mesmo percurso (100vh + altura da maior nuvem) para todas: o conjunto
//   anda como um bloco rígido e as posições relativas não mudam entre quadros.
// - As fases ficam a 0.25 uma da outra, intercalando as colunas (esq. 0 e 0.5, dir. 0.25 e
//   0.75), então nuvens vizinhas ficam a pelo menos 0.25 × percurso na vertical, também na
//   volta do loop (0.75 → 1 = 0). Isso supera a altura da maior nuvem enquanto
//   100vh > 3 × altura dela, ou seja, até telas ~2.3 vezes mais largas que altas.
// - Além disso, no celular em pé (390 px) as colunas não se cruzam na horizontal: cada nuvem
//   tem no máximo ~25 vmax ≈ 215 px e mostra 70% dela, sobrando um vão no meio.
export const CLOUDS: readonly CloudConfig[] = [
  { image: "cloud", side: "left", scale: 1.1, phase: 0, mirror: false },
  { image: "cloud", side: "right", scale: 1, phase: 0.25, mirror: true },
  { image: "cloud2", side: "left", scale: 0.9, phase: 0.5, mirror: true },
  { image: "cloud", side: "right", scale: 0.88, phase: 0.75, mirror: false },
];

/** Medida linear em CSS: `percent`% da largura da tela + `vh` + `vmax`. */
export interface LinearLength {
  percent: number;
  vh: number;
  vmax: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface CloudGeometry {
  widthVmax: number;
  heightVmax: number;
  /** `left` no primeiro quadro da travessia (a nuvem parte de `top: 100%`). */
  startLeft: LinearLength;
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const DRIFT_PER_RISE = DRIFT_DIRECTION * Math.tan((TRAJECTORY_ANGLE_DEG * Math.PI) / 180);

function cloudWidthVmax(cloud: CloudConfig): number {
  return BASE_WIDTH_VMAX * cloud.scale;
}

function cloudHeightVmax(cloud: CloudConfig): number {
  const size = IMAGE_SIZES[cloud.image];
  return (cloudWidthVmax(cloud) * size.height) / size.width;
}

const MAX_HEIGHT_VMAX = Math.max(...CLOUDS.map(cloudHeightVmax));

/** Subida vertical comum a todas: entra toda por baixo e sai toda por cima, até a maior. */
export const RISE: LinearLength = { percent: 0, vh: 100, vmax: MAX_HEIGHT_VMAX };

/** Deslocamento horizontal ao longo de uma travessia inteira. */
export const DRIFT: LinearLength = {
  percent: 0,
  vh: DRIFT_PER_RISE * RISE.vh,
  vmax: DRIFT_PER_RISE * RISE.vmax,
};

export function cloudGeometry(cloud: CloudConfig): CloudGeometry {
  const widthVmax = cloudWidthVmax(cloud);
  // Parte meia deriva antes da posição-alvo, para estar junto à borda no meio da travessia.
  const halfDrift = { vh: -DRIFT.vh / 2, vmax: -DRIFT.vmax / 2 };
  const startLeft: LinearLength =
    cloud.side === "left"
      ? { percent: 0, vh: halfDrift.vh, vmax: halfDrift.vmax - EDGE_BLEED * widthVmax }
      : {
          percent: 100,
          vh: halfDrift.vh,
          vmax: halfDrift.vmax - (1 - EDGE_BLEED) * widthVmax,
        };
  return { widthVmax, heightVmax: cloudHeightVmax(cloud), startLeft };
}

export function toCss(length: LinearLength): string {
  return `calc(${length.percent}% + ${length.vh.toFixed(4)}vh + ${length.vmax.toFixed(4)}vmax)`;
}

export function toPx(length: LinearLength, viewport: Viewport): number {
  const vmax = Math.max(viewport.width, viewport.height) / 100;
  return (
    (length.percent / 100) * viewport.width + (length.vh * viewport.height) / 100 + length.vmax * vmax
  );
}

/**
 * Caixa de cada nuvem, em px, quando o relógio da animação avançou `elapsed` travessias
 * (0–1) desde o primeiro quadro. Espelha o CSS: parte de `top: 100%` e sobe `RISE` em linha
 * reta inclinada, voltando ao início quando completa o percurso.
 */
export function cloudBoxes(viewport: Viewport, elapsed: number): Box[] {
  const vmax = Math.max(viewport.width, viewport.height) / 100;
  const rise = toPx(RISE, viewport);
  const drift = toPx(DRIFT, viewport);
  return CLOUDS.map((cloud) => {
    const geometry = cloudGeometry(cloud);
    const progress = (((cloud.phase + elapsed) % 1) + 1) % 1;
    return {
      left: toPx(geometry.startLeft, viewport) + progress * drift,
      top: viewport.height - progress * rise,
      width: geometry.widthVmax * vmax,
      height: geometry.heightVmax * vmax,
    };
  });
}
