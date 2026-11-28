import type { PointerEvent, ReactNode } from "react";
import {
  AsideScrim,
  AsideZone,
  Middle,
  PanelScrim,
  PanelZone,
  QueueZone,
  RailZone,
  SheetBody,
  SheetCloseIcon,
  SheetCloseX,
  SheetScrim,
  SheetZone,
  Shell,
  StageZone,
  TopBarZone,
} from "./MatchStageTemplate.styles";

type Props = {
  topbar: ReactNode;
  rail: ReactNode;
  stage: ReactNode;
  panel?: ReactNode;
  aside?: ReactNode;
  panelOpen?: boolean;
  asideOpen?: boolean;
  /** O painel mostra algo largo (a ficha): a coluna alarga a partir de `asideUp` (só sem `queue`). */
  panelWide?: boolean;
  /** O conteúdo do painel não pede toque no mapa: no empilhado, um véu cobre o palco e o toque nele fecha o painel. */
  panelDismissible?: boolean;
  onDismissPanel?: () => void;
  /** No celular em pé, com a gaveta aberta, um véu cobre o resto e o toque nele a fecha. */
  onDismissAside?: () => void;
  /** A fila fixa do mestre (só com colunas laterais): a coluna da esquerda divide em painel e fila. */
  queue?: ReactNode;
  /** No empilhado, painel e palco dividem a altura meio a meio. */
  panelHalf?: boolean;
  /**
   * A ficha: folha no empilhado; aberta, toma o lugar da coluna da esquerda (painel e fila
   * somem) com colunas laterais abaixo de `asideUp` e no celular deitado; caixa sobre o mapa a
   * partir de `asideUp`.
   */
  sheet?: ReactNode;
  sheetOpen?: boolean;
  onDismissSheet?: () => void;
  /**
   * Largura (px) da coluna da esquerda com colunas laterais: painel (deitado) e fila. A partir de
   * `asideUp` a coluna segue as medidas do computador.
   */
  columnWidth: number;
};

/**
 * As zonas da partida. O template decide ONDE cada zona aparece em cada tamanho; a página
 * decide O QUE vai dentro. Em pé até 1279 px é empilhado; deitado ou a partir de 1280 px há
 * colunas laterais (`media.side`):
 *
 * - Empilhado, celular em pé (< 600 px): mapa, painel e o rail deitado no rodapé. O painel
 *   EMPURRA o mapa (com `panelHalf`, divide a altura ao meio). A ficha é uma folha por trás do
 *   rodapé e o Histórico, uma gaveta com véu.
 * - Empilhado, tablet em pé (`media.tabletPortrait`): o mesmo, com o Histórico em coluna
 *   encaixada de 200 só na faixa do mapa (painel e rodapé passam por baixo, na largura toda).
 * - Colunas laterais (deitado, abaixo de 1280 px): rail em pé, coluna de `columnWidth`, Histórico
 *   de 280 e a ficha aberta no lugar da coluna; com `queue`, a fila ocupa a metade de baixo.
 * - Celular deitado (altura baixa, vale sobre os outros, por último): como as colunas, com
 *   Histórico de 200; a fila só divide a coluna quando há altura.
 * - Computador (`asideUp`): a ficha vira caixa de até 420 sobre o mapa; a aba Ficha do jogador
 *   alarga para 420.
 * - Widescreen (`wideUp`): a fila do mestre vira coluna própria à esquerda do painel.
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
  queue,
  panelHalf = false,
  sheet,
  sheetOpen = false,
  onDismissSheet,
  columnWidth,
}: Props) {
  const sheetInColumn = !!sheet && sheetOpen;
  return (
    <Shell>
      <TopBarZone>{topbar}</TopBarZone>
      <Middle $queue={!!queue} $half={panelHalf}>
        <StageZone>
          {stage}
          {panel && panelOpen && panelDismissible && (
            <PanelScrim data-testid="panel-scrim" aria-hidden onPointerDown={stopPointerDown} onClick={onDismissPanel} />
          )}
          {sheet && sheetOpen && onDismissSheet && (
            <SheetScrim data-testid="sheet-scrim" aria-hidden onPointerDown={stopPointerDown} onClick={onDismissSheet} />
          )}
        </StageZone>
        {panel && (
          <PanelZone
            data-testid="match-panel"
            data-open={panelOpen}
            data-wide={!!panelWide}
            $open={panelOpen}
            $wide={panelWide}
            $queue={!!queue}
            $half={panelHalf}
            $columnWidth={columnWidth}
            $sheetInColumn={sheetInColumn}
          >
            {panel}
          </PanelZone>
        )}
        {queue && (
          <QueueZone data-testid="match-queue" $columnWidth={columnWidth} $sheetInColumn={sheetInColumn}>
            {queue}
          </QueueZone>
        )}
        {sheet && (
          <SheetZone data-testid="match-sheet-zone" data-open={sheetOpen} $open={sheetOpen} $queue={!!queue}>
            {onDismissSheet && (
              <SheetCloseX type="button" aria-label="Fechar a ficha" onClick={onDismissSheet}>
                <SheetCloseIcon />
              </SheetCloseX>
            )}
            <SheetBody>{sheet}</SheetBody>
          </SheetZone>
        )}
        <RailZone>{rail}</RailZone>
        {aside && (
          <AsideZone
            data-testid="match-aside"
            data-open={asideOpen}
            $open={asideOpen}
            $queue={!!queue}
            $columnWidth={columnWidth}
          >
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
