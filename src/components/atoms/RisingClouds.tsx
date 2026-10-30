import styled, { keyframes } from "styled-components";
import cloudImage from "../../assets/images/cloud.webp";
import cloud2Image from "../../assets/images/cloud2.webp";

// ─── Parâmetros ajustáveis ────────────────────────────────────────────────────────────
// Segundos que uma nuvem do plano de perto leva para atravessar a tela de baixo até em cima.
// Menor = mais rápido. Os planos do meio e de longe são múltiplos deste valor.
const NEAR_CROSSING_SECONDS = 7;
// Quantas vezes mais devagar cada plano é que o de perto (paralaxe).
const LAYER_SPEED_FACTOR = { near: 1, mid: 1.6, far: 2.4 } as const;
// Inclinação da trajetória, em graus a partir da vertical (0 = sobe reto).
const TRAJECTORY_ANGLE_DEG = 12;
// Sentido da deriva horizontal enquanto sobe: 1 = para a direita, -1 = para a esquerda.
const DRIFT_DIRECTION: 1 | -1 = 1;
// Largura de cada plano em vmax (o lado maior da tela): a mesma nuvem ocupa boa parte do
// celular em pé e uma fração menor do monitor largo, sem media query por aparelho.
const LAYER_WIDTH_VMAX = { near: 46, mid: 32, far: 22 } as const;
// Opacidade de cada plano: as de longe somem mais no azul.
const LAYER_OPACITY = { near: 0.95, mid: 0.75, far: 0.5 } as const;
// ──────────────────────────────────────────────────────────────────────────────────────

type Plane = keyof typeof LAYER_WIDTH_VMAX;

// Dimensões intrínsecas dos arquivos: reservam a altura antes de a imagem carregar, para o
// percurso (que depende da altura) não mudar no meio da animação.
const IMAGES = {
  cloud: { src: cloudImage, width: 1522, height: 782 },
  cloud2: { src: cloud2Image, width: 730, height: 529 },
} as const;

interface CloudConfig {
  image: keyof typeof IMAGES;
  /** Coluna de partida, em % da largura da tela (pode ser negativa para sangrar à esquerda). */
  left: number;
  plane: Plane;
  /** Fração do percurso já feita no primeiro quadro (0–1): espalha as nuvens desde o início
   *  e é também onde cada uma fica parada com movimento reduzido. */
  phase: number;
  mirror: boolean;
}

// Configuração fixa (nada aleatório no render): planos de longe primeiro, para os de perto
// passarem por cima deles.
const CLOUDS: readonly CloudConfig[] = [
  { image: "cloud2", left: 6, plane: "far", phase: 0.3, mirror: false },
  { image: "cloud", left: 60, plane: "far", phase: 0.75, mirror: true },
  { image: "cloud", left: -8, plane: "mid", phase: 0.55, mirror: false },
  { image: "cloud2", left: 68, plane: "mid", phase: 0.2, mirror: true },
  { image: "cloud2", left: 34, plane: "mid", phase: 0.9, mirror: false },
  { image: "cloud", left: 38, plane: "near", phase: 0.4, mirror: false },
  { image: "cloud2", left: -12, plane: "near", phase: 0.85, mirror: true },
];

const DRIFT_PER_RISE = DRIFT_DIRECTION * Math.tan((TRAJECTORY_ANGLE_DEG * Math.PI) / 180);

/**
 * Nuvens decorativas subindo inclinadas atrás do conteúdo (abertura de Hunter x Hunter, 2011).
 *
 * Fica atrás do conteúdo com `z-index: -1`: o pai precisa criar um contexto de empilhamento
 * (`isolation: isolate`), senão as nuvens vão para trás do fundo azul dele. Assim o conteúdo
 * da página não precisa de `z-index` nenhum.
 */
export default function RisingClouds() {
  return (
    <Layer aria-hidden="true">
      {CLOUDS.map((cloud, index) => {
        const image = IMAGES[cloud.image];
        const width = LAYER_WIDTH_VMAX[cloud.plane];
        const height = (width * image.height) / image.width;
        const duration = NEAR_CROSSING_SECONDS * LAYER_SPEED_FACTOR[cloud.plane];
        // Subida = altura da tela + altura da nuvem: entra toda por baixo e sai toda por cima.
        const rise = `(100vh + ${height.toFixed(2)}vmax)`;
        return (
          <Cloud
            key={index}
            data-testid="rising-cloud"
            $left={cloud.left}
            $width={width}
            $opacity={LAYER_OPACITY[cloud.plane]}
            $duration={duration}
            $delay={-cloud.phase * duration}
            $travelX={`calc(${DRIFT_PER_RISE.toFixed(4)} * ${rise})`}
            $travelY={`calc(-1 * ${rise})`}
          >
            <CloudImage
              src={image.src}
              width={image.width}
              height={image.height}
              alt=""
              draggable={false}
              $mirror={cloud.mirror}
            />
          </Cloud>
        );
      })}
    </Layer>
  );
}

const rise = keyframes`
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(var(--travel-x), var(--travel-y), 0);
  }
`;

// Presa à janela: o cadastro rola por baixo dela, e o overflow escondido impede que nuvens
// fora da tela criem barra de rolagem.
const Layer = styled.div`
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
`;

const Cloud = styled.div<{
  $left: number;
  $width: number;
  $opacity: number;
  $duration: number;
  $delay: number;
  $travelX: string;
  $travelY: string;
}>`
  --travel-x: ${({ $travelX }) => $travelX};
  --travel-y: ${({ $travelY }) => $travelY};

  position: absolute;
  /* Ponto de partida logo abaixo da borda de baixo da tela. */
  top: 100%;
  left: ${({ $left }) => $left}%;
  width: ${({ $width }) => $width}vmax;
  opacity: ${({ $opacity }) => $opacity};
  will-change: transform;
  animation: ${rise} ${({ $duration }) => $duration}s linear
    ${({ $delay }) => $delay.toFixed(2)}s infinite;

  /* Pausada com o atraso negativo, cada nuvem fica parada na posição espalhada do primeiro
     quadro em vez de sumir abaixo da tela. */
  @media (prefers-reduced-motion: reduce) {
    animation-play-state: paused;
  }
`;

// O espelho fica na imagem para não brigar com o transform animado do wrapper.
const CloudImage = styled.img<{ $mirror: boolean }>`
  display: block;
  width: 100%;
  height: auto;
  ${({ $mirror }) => ($mirror ? "transform: scaleX(-1);" : "")}
`;
