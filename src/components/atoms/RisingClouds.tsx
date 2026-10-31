import styled, { keyframes } from "styled-components";
import cloudImage from "../../assets/images/cloud.webp";
import cloud2Image from "../../assets/images/cloud2.webp";
import cloud3Image from "../../assets/images/cloud3.webp";
import cloud4Image from "../../assets/images/cloud4.webp";
import cloud5Image from "../../assets/images/cloud5.webp";
import cloud6Image from "../../assets/images/cloud6.webp";
import {
  IMAGES,
  CLOUDS,
  CROSSING_SECONDS,
  DRIFT,
  RISE,
  cloudGeometry,
  toCss,
  type CloudImageKey,
} from "./risingCloudsLayout";

// Os parâmetros ajustáveis (velocidade, ângulo, sentido, tamanhos, opacidade) e a disposição
// das nuvens ficam em `risingCloudsLayout.ts`, onde o teste prova que nenhuma cobre outra.

const IMAGE_SOURCES: Record<CloudImageKey, string> = {
  cloud: cloudImage,
  cloud2: cloud2Image,
  cloud3: cloud3Image,
  cloud4: cloud4Image,
  cloud5: cloud5Image,
  cloud6: cloud6Image,
};

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
        const { widthVmax, startLeft, opacity } = cloudGeometry(cloud);
        const size = IMAGES[cloud.image].file;
        return (
          <Cloud
            key={index}
            data-testid="rising-cloud"
            $left={toCss(startLeft)}
            $width={widthVmax}
            $opacity={opacity}
            $delay={-cloud.phase * CROSSING_SECONDS}
          >
            <CloudImage
              src={IMAGE_SOURCES[cloud.image]}
              width={size.width}
              height={size.height}
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
    transform: translate3d(${toCss(DRIFT)}, calc(-1 * ${toCss(RISE)}), 0);
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

// Mesmo percurso e mesma duração para todas: sobem juntas, como um bloco só.
const Cloud = styled.div<{ $left: string; $width: number; $opacity: number; $delay: number }>`
  position: absolute;
  /* Ponto de partida logo abaixo da borda de baixo da tela. */
  top: 100%;
  left: ${({ $left }) => $left};
  width: ${({ $width }) => $width.toFixed(2)}vmax;
  opacity: ${({ $opacity }) => $opacity};
  will-change: transform;
  animation: ${rise} ${CROSSING_SECONDS}s linear ${({ $delay }) => $delay.toFixed(2)}s infinite;

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
