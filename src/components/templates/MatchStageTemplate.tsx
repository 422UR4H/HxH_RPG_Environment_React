import type { ReactNode } from "react";
import styled from "styled-components";
import { media } from "../../styles/breakpoints";
import { colors, fonts } from "../../styles/tokens";

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
};

/** Altura do rail quando ele deita e vira rodapé (abaixo de `railUp`). */
export const RAIL_BAR_HEIGHT = 56;

// BF4: a gaveta (aside) é posicionada sobre o palco abaixo de `asideUp` e precisa ficar
// acima de QUALQUER coisa que flutue sobre o mapa — hoje o maior desses overlays é o
// MatchErrorBanner (z-index: 50), seguido da barra geral e do botão de enquadrar (30).
// Sem isso a barra geral fica desenhada por cima da gaveta e esconde as abas Histórico/
// Personagens quando ela está aberta em telas estreitas.
const ASIDE_DRAWER_Z_INDEX = 60;

/**
 * As cinco zonas da partida. O template decide ONDE cada zona aparece em cada largura; a
 * página decide O QUE vai dentro.
 *
 * - Abaixo de `railUp` (celular, tablet em pé) é uma coluna: mapa, painel (quando aberto)
 *   e o rail deitado no rodapé. O painel EMPURRA o mapa em vez de cobri-lo — quem compõe
 *   uma ação precisa tocar no mapa com o painel aberto.
 * - A partir de `railUp` o rail fica em pé à esquerda e o painel vira coluna ao lado dele.
 * - O `aside` é gaveta sobre o mapa até `asideUp`, e coluna a partir dali.
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
}: Props) {
  return (
    <Shell>
      <TopBarZone>{topbar}</TopBarZone>
      <Middle>
        <StageZone>{stage}</StageZone>
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
      </Middle>
    </Shell>
  );
}

// O reset global põe `font-family: 'Lato'` em TODO elemento, e Lato não é carregada (o
// index.html só traz Roboto): qualquer <span> sem fonte própria cairia na serifada padrão.
// Aqui a tela inteira herda uma fonte só.
const Shell = styled.div`
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100dvh;
  overflow: hidden;
  background: ${colors.surfaceSidebar};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};

  & * {
    font-family: inherit;
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
