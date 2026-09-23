import type { ReactNode } from "react";
import styled from "styled-components";
import { media } from "../../styles/breakpoints";
import { colors } from "../../styles/tokens";

type Props = {
  topbar: ReactNode;
  rail: ReactNode;
  stage: ReactNode;
  panel?: ReactNode;
  aside?: ReactNode;
  /** R24: abaixo de `railUp` um painel fechado some por CSS; a partir dali sempre aparece. */
  panelOpen?: boolean;
  /** R24: abaixo de `asideUp` uma gaveta fechada some por CSS; a partir dali sempre aparece. */
  asideOpen?: boolean;
};

/**
 * As cinco zonas da partida. O template decide ONDE cada zona aparece em cada largura; a
 * página decide O QUE vai dentro.
 *
 * O rail e o rodapé são o MESMO componente: quem deita o rail é o CSS, não um ramo de
 * JavaScript. Dois componentes divergiriam para sempre.
 *
 * O `stage` nunca colapsa — é a única faixa 1fr do grid.
 */
export default function MatchStageTemplate({
  topbar,
  rail,
  stage,
  panel,
  aside,
  panelOpen = true,
  asideOpen = true,
}: Props) {
  return (
    <Shell>
      <TopBarZone>{topbar}</TopBarZone>
      <Middle>
        <RailZone>{rail}</RailZone>
        {panel && (
          <PanelZone data-testid="match-panel" data-open={panelOpen} $open={panelOpen}>
            {panel}
          </PanelZone>
        )}
        <StageZone>{stage}</StageZone>
        {aside && (
          <AsideZone data-testid="match-aside" data-open={asideOpen} $open={asideOpen}>
            {aside}
          </AsideZone>
        )}
      </Middle>
    </Shell>
  );
}

const Shell = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100dvh;
  overflow: hidden;
  background: ${colors.surfaceSidebar};
`;

const TopBarZone = styled.header`
  min-height: 44px;
`;

const Middle = styled.div`
  position: relative;
  display: grid;
  min-height: 0;
  grid-template-areas: "stage";
  grid-template-columns: 1fr;

  ${media.railUp} {
    grid-template-areas: "rail panel stage";
    grid-template-columns: auto auto 1fr;
  }
  ${media.asideUp} {
    grid-template-areas: "rail panel stage aside";
    grid-template-columns: auto auto 1fr 320px;
  }
`;

/**
 * Final review, Important 4: abaixo de `railUp` o rail é uma barra fixa no rodapé (ver
 * `RailZone`) — esta é a altura dela, definida uma vez só, para o `PanelZone` poder ficar
 * ACIMA dela (`bottom: RAIL_BAR_HEIGHT`) e o `StageZone` reservar a mesma faixa no próprio
 * rodapé, senão o mapa fica embaixo do rail. Antes os dois eram `fixed; bottom: 0`
 * empilhados no mesmo canto — o painel aberto cobria o rail (único controle pra fechá-lo)
 * e não havia como fechar. Acima de `railUp` o rail entra na grade como coluna estática e
 * nada disto se aplica.
 */
const RAIL_BAR_HEIGHT = "56px";

const StageZone = styled.main`
  grid-area: stage;
  position: relative;
  min-width: 0;
  min-height: 0;
  padding-bottom: ${RAIL_BAR_HEIGHT};

  ${media.railUp} {
    padding-bottom: 0;
  }
`;

/* Rodapé abaixo de railUp; coluna em pé a partir dele. Um componente, duas formas. */
const RailZone = styled.nav`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  height: ${RAIL_BAR_HEIGHT};
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  background: ${colors.surfaceSidebar};

  ${media.railUp} {
    position: static;
    grid-area: rail;
    height: auto;
    flex-direction: column;
    justify-content: flex-start;
    width: 72px;
  }
`;

/* Bottom sheet no celular e no tablet em pé; coluna a partir de railUp. Fechado (R24) some
   por CSS abaixo de railUp — dali em diante é coluna fixa e sempre aparece. Important 4:
   abaixo de railUp fica ACIMA do rail (bottom: RAIL_BAR_HEIGHT), não empilhado nele. */
const PanelZone = styled.section<{ $open: boolean }>`
  position: fixed;
  left: 0;
  right: 0;
  bottom: ${RAIL_BAR_HEIGHT};
  z-index: 30;
  max-height: 70dvh;
  overflow-y: auto;
  background: ${colors.surfaceSidebar};
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  display: ${({ $open }) => ($open ? "block" : "none")};

  ${media.tabletUp} {
    max-height: 80dvh;
  }
  ${media.railUp} {
    display: block;
    position: static;
    bottom: auto;
    grid-area: panel;
    width: 320px;
    max-height: none;
    border-radius: 0;
  }
`;

/* Gaveta sobre o stage; fixa a partir de asideUp. Fechada (R24) some por CSS abaixo de
   asideUp — dali em diante é coluna fixa e sempre aparece. */
const AsideZone = styled.aside<{ $open: boolean }>`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(86%, 360px);
  z-index: 25;
  overflow-y: auto;
  background: ${colors.surfaceSidebar};
  display: ${({ $open }) => ($open ? "block" : "none")};

  ${media.asideUp} {
    display: block;
    position: static;
    grid-area: aside;
    width: auto;
  }
`;
