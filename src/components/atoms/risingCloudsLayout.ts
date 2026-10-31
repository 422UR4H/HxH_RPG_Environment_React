// Geometria pura das nuvens do `RisingClouds`: o componente monta o CSS a partir daqui e o
// teste resolve as mesmas medidas em pixels para provar que nenhuma nuvem cobre outra.

// ─── Parâmetros ajustáveis ────────────────────────────────────────────────────────────
// Segundos para o céu subir uma altura de tela. É a velocidade da referência da Task 6
// (17 s para 100vh + a maior nuvem, ou seja, de ~13.5 s no monitor a ~15 s no celular).
// Menor = mais rápido.
export const SECONDS_PER_SCREEN = 14.5;
// Altura do padrão, em telas: o céu se repete depois disso. Acima de 1 para caberem as seis
// nuvens, cada uma uma vez, sem adensar o céu. Com as seis a 1/6 do padrão uma da outra,
// ficam sempre de 3 a 4 visíveis se o espaço entre elas (padrão / 6) estiver entre
// (tela + nuvem mais alta) / 4 e (tela + nuvem mais baixa) / 3: nas cinco telas do teste,
// isso dá de 1.84 a 2.09 telas.
export const PATTERN_SCREENS = 1.9;
// Inclinação da trajetória, em graus a partir da vertical (0 = sobe reto).
export const TRAJECTORY_ANGLE_DEG = 12;
// Sentido da deriva horizontal enquanto sobe: 1 = para a direita, -1 = para a esquerda.
export const DRIFT_DIRECTION: 1 | -1 = 1;
// Opacidade padrão; as nuvens de núcleo ralo podem subir um pouco (ver `CLOUDS`).
export const CLOUD_OPACITY = 0.5;
// Fração da largura do corpo da nuvem que fica para fora da borda no meio da travessia.
export const EDGE_BLEED = 0.3;
// Teto da borda esfumaçada na tela, em vmax: o dobro da referência (`cloud` a 22 vmax dá
// 0.25). Acima disso a nuvem esticada fica com aspecto de borrão.
export const MAX_SOFT_EDGE_VMAX = 0.5;
// Corpo a partir do qual uma nuvem conta como grande: duas grandes seguidas na mesma coluna
// pesam demais na borda.
export const LARGE_BODY_VMAX = 20;
// ──────────────────────────────────────────────────────────────────────────────────────

// Segundos de uma volta inteira do padrão: todas as nuvens usam a mesma.
export const CROSSING_SECONDS = Number((SECONDS_PER_SCREEN * PATTERN_SCREENS).toFixed(2));

interface CloudImage {
  /** Tamanho do arquivo inteiro: reserva a altura antes de a imagem carregar. */
  file: { width: number; height: number };
  /** Caixa do corpo opaco (alfa > 10%) dentro do arquivo, sem a margem transparente. */
  body: { x: number; y: number; width: number; height: number };
  /** Largura da borda esfumaçada sobre a largura do corpo, medida no original. */
  softEdge: number;
}

// Medido nos WebP com `magick <arquivo> -alpha extract -threshold 10% -format "%@" info:`;
// a borda esfumaçada vem da medição do controlador nos originais.
export const IMAGES = {
  cloud: {
    file: { width: 1522, height: 782 },
    body: { x: 26, y: 26, width: 1468, height: 730 },
    softEdge: 0.011,
  },
  cloud2: {
    file: { width: 730, height: 529 },
    body: { x: 27, y: 27, width: 676, height: 475 },
    softEdge: 0.022,
  },
  cloud3: {
    file: { width: 274, height: 195 },
    body: { x: 28, y: 28, width: 201, height: 139 },
    softEdge: 0.071,
  },
  cloud4: {
    file: { width: 518, height: 186 },
    body: { x: 30, y: 30, width: 456, height: 127 },
    softEdge: 0.028,
  },
  cloud5: {
    file: { width: 1200, height: 584 },
    body: { x: 13, y: 13, width: 1174, height: 558 },
    softEdge: 0.009,
  },
  cloud6: {
    file: { width: 705, height: 492 },
    body: { x: 24, y: 24, width: 657, height: 444 },
    softEdge: 0.031,
  },
} as const satisfies Record<string, CloudImage>;

export type CloudImageKey = keyof typeof IMAGES;

export interface CloudConfig {
  image: CloudImageKey;
  /** Coluna: sangra pela borda esquerda ou pela direita. O meio fica livre para o conteúdo. */
  side: "left" | "right";
  /** Largura do corpo na tela, em vmax (o lado maior da tela, sem media query por aparelho).
   *  Limitada pela nitidez: `softEdge × largura` não passa de `MAX_SOFT_EDGE_VMAX`. */
  bodyWidthVmax: number;
  /** Fração do percurso já feita no primeiro quadro (0–1): espalha as nuvens desde o início
   *  e é também onde cada uma fica parada com movimento reduzido. */
  phase: number;
  mirror: boolean;
  /** Sobrescreve `CLOUD_OPACITY` (até ~0.6) nas nuvens de núcleo ralo. */
  opacity?: number;
  /** Sobrescreve `EDGE_BLEED` nas pequenas: a deriva da subida é de ~10 vmax para cada lado
   *  do meio no celular em pé, e uma nuvem estreita sangrando 30% passaria parte da
   *  travessia toda fora da tela. Negativo = recuada para dentro. */
  edgeBleed?: number;
}

// Tamanhos: as esfumaçadas ficam pequenas, como nuvens mais distantes, e as sólidas, maiores.
// Teto de nitidez (0.5 / borda): cloud3 ≈ 7, cloud6 ≈ 16, cloud4 ≈ 18, cloud2 ≈ 22, cloud ≈ 45,
// cloud5 ≈ 55; as duas sólidas param em 22 e 26 pela composição. cloud2 fica em 18, como
// média, para cada coluna ter uma grande só (grande, média, pequena) e nunca duas grandes
// seguidas, nem na volta do loop.
//
// Por que nunca se sobrepõem:
// - Mesma duração e mesmo percurso (PATTERN_SCREENS × 100vh) para todas: o conjunto anda como
//   um bloco rígido e as posições relativas não mudam entre quadros. O percurso de 190vh
//   supera 100vh + o arquivo mais alto (cloud2, ~14 vmax) até telas ~6 vezes mais largas que
//   altas, então cada uma sai inteira por cima antes de voltar por baixo.
// - As fases vão de 1/6 em 1/6 alternando as colunas, então nuvens vizinhas na mesma coluna
//   ficam a 1/3 × 190vh ≈ 63vh na vertical, também na volta do loop (5/6 → 1 = 0), o que
//   supera o corpo mais alto (cloud2, ~12.6 vmax) até telas ~5 vezes mais largas que altas.
// - Entre colunas, as vizinhas ficam a ~32vh na vertical, o que já basta nas telas do teste;
//   no celular em pé (390 px) elas nem se cruzam na horizontal: os corpos mostram 70% de no
//   máximo 26 + 22 vmax, sobrando um vão no meio.
export const CLOUDS: readonly CloudConfig[] = [
  { image: "cloud5", side: "left", bodyWidthVmax: 26, phase: 0, mirror: false },
  { image: "cloud4", side: "right", bodyWidthVmax: 17, phase: 1 / 6, mirror: false, opacity: 0.6 },
  { image: "cloud6", side: "left", bodyWidthVmax: 15, phase: 2 / 6, mirror: true, edgeBleed: 0.1 },
  { image: "cloud", side: "right", bodyWidthVmax: 22, phase: 3 / 6, mirror: true },
  {
    image: "cloud3",
    side: "left",
    bodyWidthVmax: 7,
    phase: 4 / 6,
    mirror: false,
    opacity: 0.6,
    edgeBleed: -0.6,
  },
  { image: "cloud2", side: "right", bodyWidthVmax: 18, phase: 5 / 6, mirror: false },
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
  /** Largura do `<img>` (arquivo inteiro, com a margem transparente). */
  widthVmax: number;
  /** `left` do `<img>` no primeiro quadro da travessia (parte de `top: 100%`). */
  startLeft: LinearLength;
  /** Corpo opaco relativo ao canto do `<img>` já espelhado, em vmax. */
  body: { left: number; top: number; width: number; height: number };
  /** Altura do `<img>` inteiro, em vmax. */
  fileHeightVmax: number;
  opacity: number;
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const DRIFT_PER_RISE = DRIFT_DIRECTION * Math.tan((TRAJECTORY_ANGLE_DEG * Math.PI) / 180);

/** Subida vertical comum a todas: um padrão inteiro, em alturas de tela. */
export const RISE: LinearLength = { percent: 0, vh: PATTERN_SCREENS * 100, vmax: 0 };

/** Deslocamento horizontal ao longo de uma travessia inteira. */
export const DRIFT: LinearLength = {
  percent: 0,
  vh: DRIFT_PER_RISE * RISE.vh,
  vmax: DRIFT_PER_RISE * RISE.vmax,
};

export function cloudGeometry(cloud: CloudConfig): CloudGeometry {
  const image: CloudImage = IMAGES[cloud.image];
  const scale = cloud.bodyWidthVmax / image.body.width;
  // Espelhada, a margem da direita do arquivo passa a ficar à esquerda do corpo.
  const bodyX = cloud.mirror ? image.file.width - image.body.x - image.body.width : image.body.x;
  const body = {
    left: bodyX * scale,
    top: image.body.y * scale,
    width: cloud.bodyWidthVmax,
    height: image.body.height * scale,
  };
  // Parte com a deriva de meia tela a menos, para estar junto à borda quando passa pelo meio
  // da tela (o padrão é mais alto que a tela, então não é o meio do percurso).
  // A sangria é medida no corpo; o `<img>` começa `body.left` antes dele.
  const halfDrift = { vh: -DRIFT_PER_RISE * 50, vmax: 0 };
  const bleed = cloud.edgeBleed ?? EDGE_BLEED;
  const bodyStart =
    cloud.side === "left"
      ? { percent: 0, vmax: -bleed * body.width }
      : { percent: 100, vmax: -(1 - bleed) * body.width };
  return {
    widthVmax: image.file.width * scale,
    startLeft: {
      percent: bodyStart.percent,
      vh: halfDrift.vh,
      vmax: halfDrift.vmax + bodyStart.vmax - body.left,
    },
    body,
    fileHeightVmax: image.file.height * scale,
    opacity: cloud.opacity ?? CLOUD_OPACITY,
  };
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
 * Caixa do corpo de cada nuvem, em px, quando o relógio da animação avançou `elapsed`
 * travessias (0–1) desde o primeiro quadro. Espelha o CSS: o `<img>` parte de `top: 100%` e
 * sobe `RISE` em linha reta inclinada, voltando ao início quando completa o percurso.
 */
export function cloudBoxes(viewport: Viewport, elapsed: number): Box[] {
  const vmax = Math.max(viewport.width, viewport.height) / 100;
  const rise = toPx(RISE, viewport);
  const drift = toPx(DRIFT, viewport);
  return CLOUDS.map((cloud) => {
    const { startLeft, body } = cloudGeometry(cloud);
    const progress = (((cloud.phase + elapsed) % 1) + 1) % 1;
    return {
      left: toPx(startLeft, viewport) + progress * drift + body.left * vmax,
      top: viewport.height - progress * rise + body.top * vmax,
      width: body.width * vmax,
      height: body.height * vmax,
    };
  });
}
