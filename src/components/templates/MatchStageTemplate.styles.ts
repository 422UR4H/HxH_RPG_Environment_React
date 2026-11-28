import styled, { css } from "styled-components";
import {
  ASIDE_NARROW_WIDTH,
  ASIDE_WIDTH,
  asideNarrowQuery,
  LANDSCAPE_TWO_COLUMN_QUERY,
  MASTER_COLUMN_WIDTH,
  media,
  QUEUE_COLUMN_WIDTH,
  RAIL_WIDTH,
} from "../../styles/breakpoints";
import { colors } from "../../styles/tokens";
import { iconButtonFx } from "../../styles/iconButtonFx";
import CloseButton from "../ions/CloseButton";

/** Altura do rodapé: o rail deita no empilhado (em pé até 1279 px); com colunas laterais (`media.side`) ele é coluna. */
export const RAIL_BAR_HEIGHT = 56;

// BF4: a gaveta (aside) é posicionada sobre o palco no celular em pé e precisa ficar
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

/*
 * Larguras fixas das colunas, em px. São as medidas do computador, valendo também no tablet
 * deitado e no celular deitado: a coluna da esquerda não encolhe quando a tela encolhe.
 */
export { ASIDE_NARROW_WIDTH, ASIDE_WIDTH, MASTER_COLUMN_WIDTH };
/** Coluna da esquerda do jogador (Ação; a aba Ficha também, abaixo de `asideUp`). */
export const PLAYER_COLUMN_WIDTH = 340;
/** A aba Ficha do jogador a partir de `asideUp`. */
const PLAYER_SHEET_TAB_WIDTH = 420;
/** A ficha do mestre quando toma o lugar da coluna da esquerda. */
export const SHEET_COLUMN_WIDTH = 340;
/** A gaveta do Histórico no celular em pé. */
const ASIDE_DRAWER_WIDTH = `min(86%, ${ASIDE_WIDTH}px)`;

/* Coluna lateral do painel/fila: largura fixa, sem teto de altura, divisória à direita. */
const sideColumn = (width: string) => css`
  width: ${width};
  max-height: none;
  border-top: none;
  border-right: 1px solid ${colors.surfaceInput};
`;

/* Grade com o rail em pé e a fila embaixo do painel: mestre com colunas laterais (e celular deitado dividido). */
const queueSplitGrid = css`
  grid-template-columns: ${RAIL_WIDTH}px auto minmax(0, 1fr) auto;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-areas:
    "rail panel stage aside"
    "rail queue stage aside";
`;

/* Grade de uma coluna de painel só: jogador com colunas laterais e celular deitado sem fila. */
const singleColumnGrid = css`
  grid-template-columns: ${RAIL_WIDTH}px auto minmax(0, 1fr) auto;
  grid-template-rows: minmax(0, 1fr);
  grid-template-areas: "rail panel stage aside";
`;

/* Fila e painel em colunas lado a lado, à esquerda do mapa: widescreen e celular deitado baixo e largo. */
const queueColumnsGrid = css`
  grid-template-columns: ${RAIL_WIDTH}px ${QUEUE_COLUMN_WIDTH}px ${MASTER_COLUMN_WIDTH}px minmax(0, 1fr) auto;
  grid-template-rows: minmax(0, 1fr);
  grid-template-areas: "rail queue panel stage aside";
`;

/* Empilhado largo (mestre, em pé de 900 a 1279 px): a fila à esquerda do painel de baixo. */
const stackedWideGrid = css`
  grid-template-columns: ${MASTER_COLUMN_WIDTH}px minmax(0, 1fr) auto;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr) ${RAIL_BAR_HEIGHT}px;
  grid-template-areas:
    "stage stage aside"
    "queue panel panel"
    "rail rail rail";
`;

/* O Histórico vira coluna encaixada (tablet em pé, colunas laterais, celular deitado): sem sombra, sem véu. */
const asideColumn = (width: number) => css`
  position: static;
  grid-area: aside;
  width: ${width}px;
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

/*
 * A ficha do mestre no lugar da coluna da esquerda (painel e fila somem enquanto ela está
 * aberta). Encaixada: sem sombra e sem canto. Ocupa a coluna 2 da grade (a do painel) em todas
 * as linhas; o véu transparente do palco continua, e tocar no mapa a fecha.
 */
const sheetColumn = css`
  position: relative;
  grid-column: 2;
  grid-row: 1 / -1;
  justify-self: stretch;
  inset: auto;
  height: 100%;
  width: ${SHEET_COLUMN_WIDTH}px;
  max-width: none;
  padding-bottom: 0;
  border-radius: 0;
  border-right: 1px solid ${colors.surfaceInput};
  box-shadow: none;
`;

/* Some com a zona enquanto a ficha ocupa o lugar dela. */
const hiddenBySheet = ({ $sheetInColumn }: { $sheetInColumn: boolean }) => $sheetInColumn && "display: none;";

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

  /* Tablet em pé: o empilhado do celular com o Histórico em coluna só na faixa do mapa; o painel
     e a navegação passam por baixo dele, na largura toda. */
  ${media.tabletPortrait} {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "stage aside"
      "panel panel"
      "rail rail";
  }
  ${media.stackedWide} {
    ${({ $queue }) => $queue && stackedWideGrid}
  }
  ${media.side} {
    ${({ $queue }) => ($queue ? queueSplitGrid : singleColumnGrid)}
  }
  ${media.wideUp} {
    ${({ $queue }) => $queue && queueColumnsGrid}
  }
  /* O celular deitado vale sobre os outros: por último. */
  ${media.landscapePhone} {
    ${({ $queue }) => ($queue ? queueSplitGrid : singleColumnGrid)}
  }
  /* Baixo e largo: a mesma grade do widescreen, depois da regra do celular deitado. */
  ${media.landscapeTwoColumns} {
    ${({ $queue }) => $queue && queueColumnsGrid}
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

/* Rodapé deitado (empilhado) ou coluna em pé (colunas laterais). Um componente, duas formas; o RailNav lê as variáveis. */
export const RailZone = styled.nav`
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

  ${media.side} {
    ${railUpright}
  }
  ${media.landscapePhone} {
    ${railUpright}
    /* Cinco itens precisam caber na altura do celular deitado. */
    --rail-item-flex: 1 1 0;
    --rail-item-min-height: 0;
  }
`;

export const PanelZone = styled.section<{
  $open: boolean;
  $wide: boolean;
  $queue: boolean;
  $half: boolean;
  $columnWidth: number;
  $sheetInColumn: boolean;
}>`
  grid-area: panel;
  display: ${({ $open }) => ($open ? "block" : "none")};
  max-height: ${({ $half }) => ($half ? "none" : "46dvh")};
  overflow-y: auto;
  /* Coluna lateral nunca rola na horizontal; o conteúdo é que cabe. */
  overflow-x: hidden;
  overscroll-behavior: contain;
  background: ${colors.surfaceSidebar};
  border-top: 1px solid ${colors.surfaceInput};

  ${media.side} {
    ${({ $columnWidth }) => sideColumn(`${$columnWidth}px`)}
  }
  ${media.asideUp} {
    ${({ $queue, $wide }) =>
      sideColumn(`${$queue ? MASTER_COLUMN_WIDTH : $wide ? PLAYER_SHEET_TAB_WIDTH : PLAYER_COLUMN_WIDTH}px`)}
  }
  ${media.sideBelowAsideUp} {
    ${hiddenBySheet}
  }
  /* O celular deitado vale sobre os outros: por último. */
  ${media.landscapePhone} {
    ${({ $columnWidth }) => sideColumn(`${$columnWidth}px`)}
    ${hiddenBySheet}
  }
`;

/* A fila fixa do mestre: coluna de baixo da esquerda; no widescreen, coluna própria. */
export const QueueZone = styled.section<{ $columnWidth: number; $sheetInColumn: boolean }>`
  grid-area: queue;
  display: none;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  background: ${colors.surfaceRecessed};
  border-top: 1px solid ${colors.surfaceInput};
  border-right: 1px solid ${colors.surfaceInput};

  ${media.side} {
    display: block;
    width: ${({ $columnWidth }) => $columnWidth}px;
  }
  ${media.asideUp} {
    width: ${MASTER_COLUMN_WIDTH}px;
  }
  ${media.wideUp} {
    width: ${QUEUE_COLUMN_WIDTH}px;
    border-top: none;
  }
  ${media.stackedWide} {
    display: block;
    width: ${MASTER_COLUMN_WIDTH}px;
  }
  ${media.sideBelowAsideUp} {
    ${hiddenBySheet}
  }
  ${media.landscapePhone} {
    display: block;
    width: ${({ $columnWidth }) => $columnWidth}px;
    border-top: 1px solid ${colors.surfaceInput};
    ${hiddenBySheet}
  }
  /* Em duas colunas a fila tem coluna própria e continua visível com a ficha aberta. */
  ${media.landscapeTwoColumns} {
    display: block;
    width: ${QUEUE_COLUMN_WIDTH}px;
    border-top: none;
  }
`;

/*
 * Empilhado (celular e tablet em pé): folha sobre o Middle, por trás da navegação. Com colunas
 * laterais abaixo de `asideUp` e no celular deitado: no lugar da coluna da esquerda. A partir de
 * `asideUp`: caixa sobre o mapa.
 */
export const SheetZone = styled.aside<{ $open: boolean; $queue: boolean }>`
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

  ${media.sideBelowAsideUp} {
    ${sheetColumn}
  }
  ${media.asideUp} {
    ${sheetBox("clamp(340px, calc(100% - 300px), 420px)")}
  }
  /* O celular deitado vale sobre os outros: por último. */
  ${media.landscapePhone} {
    ${sheetColumn}
  }
  /* Em duas colunas a ficha toma só a coluna do painel (a 3); a fila continua na 2. */
  ${media.landscapeTwoColumns} {
    ${({ $queue }) =>
      $queue &&
      css`
        grid-column: 3;
        width: ${SHEET_COLUMN_WIDTH}px;
      `}
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

  /* O X é só da folha (empilhado). */
  ${media.side} {
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

/*
 * Gaveta sobre o mapa no celular em pé (com sombra e véu). Em coluna encaixada (tablet em pé só na
 * faixa do mapa, colunas laterais, celular deitado) tem 280, ou 200 quando o mapa ficaria com menos
 * de `MAP_MIN_WIDTH` (`media.asideNarrow`).
 */
export const AsideZone = styled.aside<{ $open: boolean; $queue: boolean; $columnWidth: number }>`
  position: absolute;
  top: 0;
  right: 0;
  bottom: ${RAIL_BAR_HEIGHT}px;
  width: ${ASIDE_DRAWER_WIDTH};
  z-index: ${ASIDE_DRAWER_Z_INDEX};
  display: ${({ $open }) => ($open ? "block" : "none")};
  overflow-y: auto;
  /* Coluna lateral nunca rola na horizontal; o conteúdo é que cabe. */
  overflow-x: hidden;
  background: ${colors.surfaceSidebar};
  border-left: 1px solid ${colors.surfaceInput};
  box-shadow: -8px 0 24px ${colors.shadowStrong};

  ${media.tabletPortrait} {
    ${asideColumn(ASIDE_WIDTH)}
    /* Sem a pilha da gaveta: a folha da ficha, que abre por cima, passa na frente da coluna. */
    z-index: auto;
  }
  ${media.side} {
    ${asideColumn(ASIDE_WIDTH)}
  }
  ${media.landscapePhone} {
    ${asideColumn(ASIDE_WIDTH)}
  }
  /* 200 só quando, descontadas as colunas à esquerda e os 280, sobra menos de MAP_MIN_WIDTH de mapa. */
  ${({ $columnWidth }) => css`
    ${media.asideNarrow($columnWidth)} {
      width: ${ASIDE_NARROW_WIDTH}px;
    }
  `}
  /* Com fila, em duas colunas a fila também fica à esquerda do mapa (declarada depois). */
  ${({ $queue }) =>
    $queue &&
    css`
      @media ${LANDSCAPE_TWO_COLUMN_QUERY} and ${asideNarrowQuery(QUEUE_COLUMN_WIDTH + MASTER_COLUMN_WIDTH)} {
        width: ${ASIDE_NARROW_WIDTH}px;
      }
    `}
`;

/* Véu sobre o palco inteiro: só existe no empilhado (com colunas laterais o painel é coluna). */
export const PanelScrim = styled.div`
  position: absolute;
  inset: 0;
  z-index: ${SCRIM_Z_INDEX};
  background: ${colors.overlayScrim};

  ${media.side} {
    display: none;
  }
`;

/* Véu sobre o resto da partida (filho do Middle), por baixo da gaveta; só existe no celular em pé. */
export const AsideScrim = styled.div`
  position: absolute;
  inset: 0;
  z-index: ${SCRIM_Z_INDEX};
  background: ${colors.overlayScrim};

  ${media.tabletPortrait} {
    display: none;
  }
  ${media.side} {
    display: none;
  }
`;
