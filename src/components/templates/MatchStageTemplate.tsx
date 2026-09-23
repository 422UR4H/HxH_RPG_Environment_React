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

const StageZone = styled.main`
  grid-area: stage;
  position: relative;
  min-width: 0;
  min-height: 0;
`;

/* Rodapé abaixo de railUp; coluna em pé a partir dele. Um componente, duas formas. */
const RailZone = styled.nav`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  background: ${colors.surfaceSidebar};

  ${media.railUp} {
    position: static;
    grid-area: rail;
    flex-direction: column;
    justify-content: flex-start;
    width: 72px;
  }
`;

/* Bottom sheet no celular e no tablet em pé; coluna a partir de railUp. Fechado (R24) some
   por CSS abaixo de railUp — dali em diante é coluna fixa e sempre aparece. */
const PanelZone = styled.section<{ $open: boolean }>`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
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
