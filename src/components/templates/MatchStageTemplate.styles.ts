import styled, { css } from "styled-components";
import { media } from "../../styles/breakpoints";
import { colors } from "../../styles/tokens";
import { iconButtonFx } from "../../styles/iconButtonFx";
import CloseButton from "../ions/CloseButton";

/** Altura do rodapé: o rail deita no celular em pé e, sem `queue`, até `railUp`; no celular deitado ele é sempre coluna. */
export const RAIL_BAR_HEIGHT = 56;

// BF4: a gaveta (aside) é posicionada sobre o palco abaixo de `tabletUp` e precisa ficar
// acima de QUALQUER coisa que flutue sobre o mapa. Pilha de baixo para cima:
// - barra geral e botão de enquadrar do mapa: 30; pílula do relógio: 40;
// - avisos do palco (`StageNotices`, onde mora o MatchErrorBanner): 50;
// - painel do relógio do mestre (`CLOCK_PANEL_Z_INDEX`, em clockLayout.ts): 52;
// - véu transparente da ficha (`SHEET_SCRIM_Z_INDEX`, dentro do palco): 53;
// - a ficha (`SHEET_Z_INDEX`, folha ou caixa): 54;
// - a navegação e os véus do painel e da gaveta (`NAV_Z_INDEX` = `SCRIM_Z_INDEX`): 55 — a
//   navegação fica por cima da folha, que desce por trás dela; o véu da gaveta, depois no
//   DOM, continua por cima da navegação;
// - a gaveta do Histórico (`ASIDE_DRAWER_Z_INDEX`): 60.
// Sem isso a barra geral fica desenhada por cima da gaveta e esconde as abas Histórico/
// Personagens quando ela está aberta em telas estreitas.
const ASIDE_DRAWER_Z_INDEX = 60;
const SCRIM_Z_INDEX = 55;
const NAV_Z_INDEX = 55;
export const SHEET_SCRIM_Z_INDEX = 53;
export const SHEET_Z_INDEX = 54;

/* Coluna lateral do painel/fila: largura fixa, sem teto de altura, divisória à direita. */
const sideColumn = (width: string) => css`
  width: ${width};
  max-height: none;
  border-top: none;
  border-right: 1px solid ${colors.surfaceInput};
`;

/* Grade com o rail em pé e (opcional) a fila embaixo do painel: tablet do mestre e celular deitado dividido. */
const queueSplitGrid = css`
  grid-template-columns: 72px auto minmax(0, 1fr) auto;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-areas:
    "rail panel stage aside"
    "rail queue stage aside";
`;

/* Grade de uma coluna de painel só: jogador a partir de railUp e celular deitado sem fila. */
const singleColumnGrid = css`
  grid-template-columns: 72px auto minmax(0, 1fr) auto;
  grid-template-rows: minmax(0, 1fr);
  grid-template-areas: "rail panel stage aside";
`;

/* O Histórico vira coluna de 200 px (tablet em diante e celular deitado). */
const asideColumn = css`
  position: static;
  grid-area: aside;
  width: 200px;
  box-shadow: none;
`;

/* A ficha como caixa na área do palco, por cima do mapa e sem deslocá-lo. */
const sheetBox = (width: string) => css`
  position: relative;
  grid-area: stage;
  justify-self: start;
  inset: auto;
  height: 100%;
  width: ${width};
  /* Nunca passa da largura do palco: em tela estreita não pode vazar sobre a coluna do Histórico. */
  max-width: 100%;
  padding-bottom: 0;
  border-radius: 0;
  border-right: 1px solid ${colors.surfaceInput};
  box-shadow: 8px 0 24px ${colors.shadowStrong};
`;

export const Shell = styled.div`
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

export const TopBarZone = styled.header`
  min-height: 44px;
  border-bottom: 1px solid ${colors.surfaceInput};
`;

export const Middle = styled.div<{ $queue: boolean; $half: boolean }>`
  position: relative;
  display: grid;
  min-height: 0;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) ${({ $half }) => ($half ? "minmax(0, 1fr)" : "auto")} ${RAIL_BAR_HEIGHT}px;
  grid-template-areas:
    "stage"
    "panel"
    "rail";

  ${media.tabletUp} {
    ${({ $queue }) =>
      $queue
        ? queueSplitGrid
        : css`
            /* Jogador no tablet em pé: o painel passa por baixo do Histórico. */
            grid-template-columns: minmax(0, 1fr) auto;
            grid-template-rows: minmax(0, 1fr) auto ${RAIL_BAR_HEIGHT}px;
            grid-template-areas:
              "stage aside"
              "panel panel"
              "rail rail";
          `}
  }
  ${media.railUp} {
    ${({ $queue }) => !$queue && singleColumnGrid}
  }
  ${media.wideUp} {
    ${({ $queue }) =>
      $queue &&
      css`
        grid-template-columns: 72px 240px 320px minmax(0, 1fr) auto;
        grid-template-rows: minmax(0, 1fr);
        grid-template-areas: "rail queue panel stage aside";
      `}
  }
  /* O celular deitado vale sobre os outros: por último. */
  ${media.landscapePhone} {
    ${({ $queue }) => ($queue ? queueSplitGrid : singleColumnGrid)}
  }
`;

/* O mapa ocupa o palco inteiro; tudo o mais flutua sobre ele (posição absoluta). */
export const StageZone = styled.main`
  grid-area: stage;
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
`;

const railUpright = css`
  flex-direction: column;
  justify-content: flex-start;
  border-top: none;
  border-right: 1px solid ${colors.surfaceInput};
  --rail-item-flex: 0 0 auto;
  --rail-item-min-height: 64px;
`;

/* Rodapé deitado ou coluna em pé. Um componente, duas formas; o RailNav lê as variáveis. */
export const RailZone = styled.nav<{ $queue: boolean }>`
  grid-area: rail;
  position: relative;
  z-index: ${NAV_Z_INDEX};
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  background: ${colors.surfaceSidebar};
  border-top: 1px solid ${colors.surfaceInput};
  --rail-item-flex: 1;
  --rail-item-min-height: auto;

  ${media.tabletUp} {
    ${({ $queue }) => $queue && railUpright}
  }
  ${media.railUp} {
    ${railUpright}
  }
  ${media.landscapePhone} {
    ${railUpright}
    /* Cinco itens precisam caber na altura do celular deitado. */
    --rail-item-flex: 1 1 0;
    --rail-item-min-height: 0;
  }
`;

export const PanelZone = styled.section<{ $open: boolean; $wide: boolean; $queue: boolean; $half: boolean }>`
  grid-area: panel;
  display: ${({ $open }) => ($open ? "block" : "none")};
  max-height: ${({ $half }) => ($half ? "none" : "46dvh")};
  overflow-y: auto;
  /* Coluna lateral nunca rola na horizontal; o conteúdo é que cabe. */
  overflow-x: hidden;
  overscroll-behavior: contain;
  background: ${colors.surfaceSidebar};
  border-top: 1px solid ${colors.surfaceInput};

  ${media.tabletUp} {
    ${({ $queue }) => ($queue ? sideColumn("280px") : "max-height: 42dvh;")}
  }
  ${media.railUp} {
    ${({ $queue }) => !$queue && sideColumn("280px")}
  }
  ${media.asideUp} {
    ${({ $queue, $wide }) => sideColumn($queue ? "320px" : $wide ? "420px" : "340px")}
  }
  ${media.landscapePhone} {
    ${sideColumn("280px")}
  }
`;

/* A fila fixa do mestre: coluna de baixo da esquerda; no widescreen, coluna própria. */
export const QueueZone = styled.section`
  grid-area: queue;
  display: none;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  background: ${colors.surfaceRecessed};
  border-top: 1px solid ${colors.surfaceInput};
  border-right: 1px solid ${colors.surfaceInput};

  ${media.tabletUp} {
    display: block;
    width: 280px;
  }
  ${media.asideUp} {
    width: 320px;
  }
  ${media.wideUp} {
    width: 240px;
    border-top: none;
  }
  ${media.landscapePhone} {
    display: block;
    width: 280px;
    border-top: 1px solid ${colors.surfaceInput};
  }
`;

/* Celular em pé: folha sobre o Middle, por trás da navegação. Demais tamanhos: caixa no palco. */
export const SheetZone = styled.aside<{ $open: boolean }>`
  position: absolute;
  left: 8px;
  right: 8px;
  top: 20%;
  bottom: 0;
  z-index: ${SHEET_Z_INDEX};
  display: ${({ $open }) => ($open ? "block" : "none")};
  box-sizing: border-box;
  padding-bottom: ${RAIL_BAR_HEIGHT}px;
  background: ${colors.surfaceSidebar};
  border-radius: 22px 22px 0 0;
  box-shadow: 0 -8px 30px ${colors.shadowStrong};

  ${media.tabletUp} {
    ${sheetBox("280px")}
  }
  ${media.asideUp} {
    ${sheetBox("clamp(340px, calc(100% - 300px), 420px)")}
  }
  ${media.landscapePhone} {
    ${sheetBox("280px")}
  }
`;

/* O X vaza da folha; por isso a rolagem mora aqui dentro, não na folha. */
export const SheetBody = styled.div`
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  border-radius: inherit;
`;

export const SheetCloseX = styled.button`
  position: absolute;
  top: -10px;
  right: -5px;
  z-index: 1;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  line-height: 0;
  ${iconButtonFx(1.15)}

  ${media.tabletUp} {
    display: none;
  }
  ${media.landscapePhone} {
    display: none;
  }
`;

export const SheetCloseIcon = styled(CloseButton)`
  width: 36px;
  height: 36px;
  opacity: 1;
`;

/* Véu transparente sobre o mapa: o toque fecha a ficha sem selecionar nada. */
export const SheetScrim = styled.div`
  position: absolute;
  inset: 0;
  z-index: ${SHEET_SCRIM_Z_INDEX};
  background: transparent;
`;

/* Gaveta sobre o mapa no celular em pé; coluna de 200 px nos demais tamanhos. */
export const AsideZone = styled.aside<{ $open: boolean }>`
  position: absolute;
  top: 0;
  right: 0;
  bottom: ${RAIL_BAR_HEIGHT}px;
  width: min(86%, 360px);
  z-index: ${ASIDE_DRAWER_Z_INDEX};
  display: ${({ $open }) => ($open ? "block" : "none")};
  overflow-y: auto;
  /* Coluna lateral nunca rola na horizontal; o conteúdo é que cabe. */
  overflow-x: hidden;
  background: ${colors.surfaceSidebar};
  border-left: 1px solid ${colors.surfaceInput};
  box-shadow: -8px 0 24px ${colors.shadowStrong};

  ${media.tabletUp} {
    ${asideColumn}
  }
  ${media.landscapePhone} {
    ${asideColumn}
  }
`;

/* Véu sobre o palco inteiro: só existe como modal abaixo de railUp em pé (a partir dali o painel é coluna). */
export const PanelScrim = styled.div`
  position: absolute;
  inset: 0;
  z-index: ${SCRIM_Z_INDEX};
  background: ${colors.overlayScrim};

  ${media.railUp} {
    display: none;
  }
  ${media.landscapePhone} {
    display: none;
  }
`;

/* Véu sobre o resto da partida (filho do Middle), por baixo da gaveta; só existe no celular em pé. */
export const AsideScrim = styled.div`
  position: absolute;
  inset: 0;
  z-index: ${SCRIM_Z_INDEX};
  background: ${colors.overlayScrim};

  ${media.tabletUp} {
    display: none;
  }
  ${media.landscapePhone} {
    display: none;
  }
`;
