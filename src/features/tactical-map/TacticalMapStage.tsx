import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { colors, fonts } from "../../styles/tokens";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text } from "pixi.js";
import { Viewport } from "pixi-viewport";
import type { WallType, WallMaterial } from "../../types/tacticalMap";
import type { TacticalMapStageProps } from "./stage/stageProps";
import ViewportInner from "./stage/ViewportInner";
import BgFailedNotice from "./stage/BgFailedNotice";
import { toPixi } from "../../styles/pixi";

// Backing-store density. Pixi defaults to 1, which the browser then upscales on phones and
// tablets (DPR 2–3): rings, dashes, walls and avatars all look blocky. Capped at 3 so the
// canvas on a 3× phone stays a reasonable size for the GPU.
const RENDER_RESOLUTION = Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);

extend({ Container, Graphics, Sprite, Text, Viewport });

export default function TacticalMapStage({
  map, width, height,
  clampToGrid = false,
  bgInteractive = false,
  onBgPositionChange,
  piecesInteractive,
  draggablePieceIds,
  suppressPanOnPiecePress,
  selection,
  npcMap,
  placingNpcId,
  onPieceSelect,
  onPieceLongPress,
  selectedPieceId,
  inspectedPieceId,
  targetPieceIds,
  onPieceMove,
  intentPreview,
  intentGhosts,
  activePieceId,
  highlightHoverSlot,
  fitRequest,
  onPieceDragToRoster,
  onPieceDragStart,
  onPieceDragEnd,
  onNpcPlaced,
  onNpcPlacementCancel,
  onStageDeselect,
  onEmptySlotClick,
  onViewportScaleChange,
  onViewportTransform,
  onBgLoadingChange,
  uploading = false,
  activeTool,
  onBgChange,
  onGridChange,
  onDragGestureStart,
  onDragGestureEnd,
  walls = [],
  wallsInteractive = false,
  selectedWallId = null,
  activeWallType = "wall" as WallType,
  activeMaterial = "stone" as WallMaterial,
  onWallSelect,
  onDrawComplete,
  onWallEndpointDrag,
  drawingEnabled,
  onExitWallsDrawMode,
  onWallClick,
  onWallLongPress,
  isWallTappable,
  fog,
  fogDisabled = true,
}: TacticalMapStageProps) {
  const [isBgLoading, setIsBgLoading] = useState(() => !!map.bg?.url);
  // Falha ao carregar o fundo não bloqueia o mapa: só mostra aviso com "Tentar de novo".
  const [bgFailed, setBgFailed] = useState(false);
  const [bgRetryKey, setBgRetryKey] = useState(0);
  // @pixi/react (8.0.5) renders the Pixi tree from an async root: its FIRST render awaits
  // `app.init()` and then commits the children it captured back then — overwriting every
  // newer render that happened while the renderer was initializing. Whatever arrived in
  // that window (the pieces and fog of `map_full_state`, typically) stayed off the canvas
  // until some unrelated re-render: a blank, fully fogged board where a tap never finds a
  // piece. Re-rendering once on init pushes the current props through.
  const [, rerenderAfterInit] = useReducer((n: number) => n + 1, 0);
  const bgUrl = map.bg?.url;
  const containerRef = useRef<HTMLDivElement>(null);

  // Prevent the page from scrolling when the user scrolls over the map.
  // Capture phase + passive:false works cross-browser (Chrome passive-by-default
  // wheel handling requires capture to guarantee preventDefault fires first).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => { e.preventDefault(); };
    el.addEventListener("wheel", handler, { passive: false, capture: true });
    return () => el.removeEventListener("wheel", handler, { capture: true });
  }, []);

  // useLayoutEffect fires synchronously before the browser paints the frame.
  // When bg.url changes (upload, URL paste, or clear), we set loading state
  // before paint so the overlay always appears — even for blob: URLs whose
  // img.onload fires from cache before React would otherwise flush the update.
  useLayoutEffect(() => {
    setIsBgLoading(!!bgUrl);
    setBgFailed(false);
  }, [bgUrl]);

  const handleBgLoadingChange = useCallback((loading: boolean) => {
    setIsBgLoading(loading);
    onBgLoadingChange?.(loading);
  }, [onBgLoadingChange]);

  const handleBgError = useCallback(() => setBgFailed(true), []);
  const handleBgRetry = useCallback(() => {
    setBgFailed(false);
    setIsBgLoading(true); // overlay entra no mesmo commit em que o aviso some
    setBgRetryKey((k) => k + 1);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", width, height, overflow: "hidden", isolation: "isolate" }}>
      <Application
        width={width}
        height={height}
        background={toPixi(colors.mapStageBg)}
        resolution={RENDER_RESOLUTION}
        autoDensity
        antialias
        onInit={rerenderAfterInit}
      >
        <ViewportInner
          map={map}
          width={width}
          height={height}
          clampToGrid={clampToGrid}
          bgInteractive={bgInteractive}
          onBgPositionChange={onBgPositionChange}
          onBgLoadingChange={handleBgLoadingChange}
          onBgError={handleBgError}
          bgRetryKey={bgRetryKey}
          piecesInteractive={piecesInteractive}
          draggablePieceIds={draggablePieceIds}
          suppressPanOnPiecePress={suppressPanOnPiecePress}
          selection={selection}
          npcMap={npcMap}
          placingNpcId={placingNpcId}
          onPieceSelect={onPieceSelect}
          onPieceLongPress={onPieceLongPress}
          selectedPieceId={selectedPieceId}
          inspectedPieceId={inspectedPieceId}
          targetPieceIds={targetPieceIds}
          onPieceMove={onPieceMove}
          intentPreview={intentPreview}
          intentGhosts={intentGhosts}
          activePieceId={activePieceId}
          highlightHoverSlot={highlightHoverSlot}
          fitRequest={fitRequest}
          onPieceDragToRoster={onPieceDragToRoster}
          onPieceDragStart={onPieceDragStart}
          onPieceDragEnd={onPieceDragEnd}
          onNpcPlaced={onNpcPlaced}
          onNpcPlacementCancel={onNpcPlacementCancel}
          onStageDeselect={onStageDeselect}
          onEmptySlotClick={onEmptySlotClick}
          onViewportScaleChange={onViewportScaleChange}
          onViewportTransform={onViewportTransform}
          activeTool={activeTool}
          onBgChange={onBgChange}
          onGridChange={onGridChange}
          onDragGestureStart={onDragGestureStart}
          onDragGestureEnd={onDragGestureEnd}
          walls={walls}
          wallsInteractive={wallsInteractive}
          selectedWallId={selectedWallId}
          activeWallType={activeWallType}
          activeMaterial={activeMaterial}
          onWallSelect={onWallSelect}
          onDrawComplete={onDrawComplete}
          onWallEndpointDrag={onWallEndpointDrag}
          drawingEnabled={drawingEnabled}
          onExitWallsDrawMode={onExitWallsDrawMode}
          onWallClick={onWallClick}
          onWallLongPress={onWallLongPress}
          isWallTappable={isWallTappable}
          fog={fog}
          fogDisabled={fogDisabled}
        />
      </Application>
      {bgFailed && !isBgLoading && <BgFailedNotice onRetry={handleBgRetry} />}
      {(isBgLoading || uploading) && (
        <BgLoadingOverlay>
          <Spinner />
          <LoadingLabel>
            {uploading ? "Enviando imagem…" : "Carregando imagem…"}
          </LoadingLabel>
        </BgLoadingOverlay>
      )}
    </div>
  );
}

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const BgLoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  background: ${colors.overlayStage};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  pointer-events: none;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${colors.overlayHighlight};
  border-top-color: ${colors.brandAccent};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const LoadingLabel = styled.p`
  margin: 0;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 14px;
`;
