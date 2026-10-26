import type { PointerEvent, ReactNode } from "react";
import styled from "styled-components";
import { media } from "../../styles/breakpoints";
import { colors } from "../../styles/tokens";

type Props = {
  topbar: ReactNode;
  rail: ReactNode;
  stage: ReactNode;
  panel?: ReactNode;
  aside?: ReactNode;
  panelOpen?: boolean;
  asideOpen?: boolean;
  /** O painel mostra algo largo (a ficha): a coluna alarga a partir de `railUp`. */
  panelWide?: boolean;
  /** O conteúdo do painel não pede toque no mapa: abaixo de railUp, um véu cobre o palco e o toque nele fecha o painel. */
  panelDismissible?: boolean;
  onDismissPanel?: () => void;
  /** Abaixo de asideUp, com a gaveta aberta, um véu cobre o resto e o toque nele a fecha. */
  onDismissAside?: () => void;
};

/** Altura do rail quando ele deita e vira rodapé (abaixo de `railUp`). */
export const RAIL_BAR_HEIGHT = 56;

// BF4: a gaveta (aside) é posicionada sobre o palco abaixo de `asideUp` e precisa ficar
// acima de QUALQUER coisa que flutue sobre o mapa — hoje o maior desses overlays são os
// avisos do palco (`StageNotices`, z-index: 50, onde mora o MatchErrorBanner), seguidos da
// barra geral e do botão de enquadrar (30).
// Sem isso a barra geral fica desenhada por cima da gaveta e esconde as abas Histórico/
// Personagens quando ela está aberta em telas estreitas.
// Os véus (painel e gaveta, `SCRIM_Z_INDEX`) ficam entre os dois: acima dos avisos do palco
// (50) — o toque fora de uma folha aberta não pode cair num aviso — e abaixo da gaveta (60).
const ASIDE_DRAWER_Z_INDEX = 60;
const SCRIM_Z_INDEX = 55;

/**
 * As cinco zonas da partida. O template decide ONDE cada zona aparece em cada largura; a
 * página decide O QUE vai dentro.
 *
 * - Abaixo de `railUp` (celular, tablet em pé) é uma coluna: mapa, painel (quando aberto)
 *   e o rail deitado no rodapé. O painel EMPURRA o mapa em vez de cobri-lo — quem compõe
 *   uma ação precisa tocar no mapa com o painel aberto. Quando o conteúdo NÃO pede toque
 *   no mapa (`panelDismissible`), o painel também vira modal: um véu cobre o palco e tocar
 *   nele fecha o painel sem selecionar nada.
 * - A partir de `railUp` o rail fica em pé à esquerda e o painel vira coluna ao lado dele.
 * - O `aside` é gaveta sobre o mapa até `asideUp` (com véu: tocar fora a fecha), e coluna
 *   a partir dali.
 *
 * O rail e o rodapé são o MESMO componente: quem deita o rail é o CSS, não um ramo de
 * JavaScript. O `stage` nunca colapsa — é a única faixa flexível.
 */
export default function MatchStageTemplate({
  topbar,
  rail,
  stage,
  panel,
  aside,
  panelOpen = true,
  asideOpen = true,
  panelWide = false,
  panelDismissible = false,
  onDismissPanel,
  onDismissAside,
}: Props) {
  return (
    <Shell>
      <TopBarZone>{topbar}</TopBarZone>
      <Middle>
        <StageZone>
          {stage}
          {panel && panelOpen && panelDismissible && (
            <PanelScrim data-testid="panel-scrim" aria-hidden onPointerDown={stopPointerDown} onClick={onDismissPanel} />
          )}
        </StageZone>
        {panel && (
          <PanelZone
            data-testid="match-panel"
            data-open={panelOpen}
            data-wide={!!panelWide}
            $open={panelOpen}
            $wide={panelWide}
          >
            {panel}
          </PanelZone>
        )}
        <RailZone>{rail}</RailZone>
        {aside && (
          <AsideZone data-testid="match-aside" data-open={asideOpen} $open={asideOpen}>
            {aside}
          </AsideZone>
        )}
        {aside && asideOpen && onDismissAside && (
          <AsideScrim data-testid="aside-scrim" aria-hidden onPointerDown={stopPointerDown} onClick={onDismissAside} />
        )}
      </Middle>
    </Shell>
  );
}

// O pan do mapa escuta `pointerdown` na `window` e o véu dispensa no `click`, não no
// pointerdown: dispensar no pointerdown desmontaria o véu no meio do gesto e o soltar cairia
// no canvas recém-descoberto. Por isso o pointerdown morre aqui.
const stopPointerDown = (e: PointerEvent<HTMLElement>) => e.stopPropagation();

const Shell = styled.div`
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100dvh;
  overflow: hidden;
  background: ${colors.surfaceSidebar};
  color: ${colors.textPrimary};
  /* Spec §13: arrastar no mapa/HUD não pode virar seleção de texto. Campos continuam selecionáveis. */
  user-select: none;
  -webkit-user-select: none;
  /* Sem zoom de página (pinça ou toque duplo) na mesa: só o mapa dá zoom. O canvas mantém o
     none dele; sem isto a pinça sobre o véu ampliava a página. */
  touch-action: pan-x pan-y;

  & input,
  & textarea,
  & select {
    user-select: text;
    -webkit-user-select: text;
  }
`;

const TopBarZone = styled.header`
  min-height: 44px;
  border-bottom: 1px solid ${colors.surfaceInput};
`;

const Middle = styled.div`
  position: relative;
  display: grid;
  min-height: 0;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto ${RAIL_BAR_HEIGHT}px;
  grid-template-areas:
    "stage"
    "panel"
    "rail";

  ${media.railUp} {
    grid-template-columns: 72px auto minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    grid-template-areas: "rail panel stage";
  }
  ${media.asideUp} {
    grid-template-columns: 72px auto minmax(0, 1fr) auto;
    grid-template-areas: "rail panel stage aside";
  }
`;

/* O mapa ocupa o palco inteiro; tudo o mais flutua sobre ele (posição absoluta). */
const StageZone = styled.main`
  grid-area: stage;
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
`;

/* Rodapé deitado abaixo de railUp; coluna em pé a partir dele. Um componente, duas formas. */
const RailZone = styled.nav`
  grid-area: rail;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  background: ${colors.surfaceSidebar};
  border-top: 1px solid ${colors.surfaceInput};

  ${media.railUp} {
    flex-direction: column;
    justify-content: flex-start;
    border-top: none;
    border-right: 1px solid ${colors.surfaceInput};
  }
`;

const PanelZone = styled.section<{ $open: boolean; $wide?: boolean }>`
  grid-area: panel;
  display: ${({ $open }) => ($open ? "block" : "none")};
  max-height: 46dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: ${colors.surfaceSidebar};
  border-top: 1px solid ${colors.surfaceInput};

  ${media.tabletUp} {
    max-height: 42dvh;
  }
  ${media.railUp} {
    width: ${({ $wide }) => ($wide ? "clamp(340px, 46vw, 640px)" : "340px")};
    max-height: none;
    border-top: none;
    border-right: 1px solid ${colors.surfaceInput};
  }
`;

/* Gaveta sobre o mapa abaixo de asideUp; coluna a partir dele. */
const AsideZone = styled.aside<{ $open: boolean }>`
  position: absolute;
  top: 0;
  right: 0;
  bottom: ${RAIL_BAR_HEIGHT}px;
  width: min(86%, 360px);
  z-index: ${ASIDE_DRAWER_Z_INDEX};
  display: ${({ $open }) => ($open ? "block" : "none")};
  overflow-y: auto;
  background: ${colors.surfaceSidebar};
  border-left: 1px solid ${colors.surfaceInput};
  box-shadow: -8px 0 24px ${colors.shadowStrong};

  ${media.railUp} {
    bottom: 0;
  }
  ${media.asideUp} {
    position: static;
    grid-area: aside;
    width: 320px;
    box-shadow: none;
  }
`;

/* Véu sobre o palco inteiro: só existe como modal abaixo de railUp (a partir dali o painel é coluna). */
const PanelScrim = styled.div`
  position: absolute;
  inset: 0;
  z-index: ${SCRIM_Z_INDEX};
  background: ${colors.overlayScrim};

  ${media.railUp} {
    display: none;
  }
`;

/* Véu sobre o resto da partida (filho do Middle), por baixo da gaveta; some quando ela vira coluna. */
const AsideScrim = styled.div`
  position: absolute;
  inset: 0;
  z-index: ${SCRIM_Z_INDEX};
  background: ${colors.overlayScrim};

  ${media.asideUp} {
    display: none;
  }
`;
