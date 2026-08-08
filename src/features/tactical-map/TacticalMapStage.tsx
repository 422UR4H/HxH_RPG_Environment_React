import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { colors, fonts } from "../../styles/tokens";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text } from "pixi.js";
import { Viewport } from "pixi-viewport";
import type { WallType, WallMaterial } from "../../types/tacticalMap";
import type { TacticalMapStageProps } from "./stage/stageProps";
import ViewportInner from "./stage/ViewportInner";

extend({ Container, Graphics, Sprite, Text, Viewport });

export default function TacticalMapStage({
  map, width, height,
  clampToGrid = false,
  bgInteractive = false,
  onBgPositionChange,
  piecesInteractive,
  draggablePieceIds,
  selection,
  npcMap,
  placingNpcId,
  onPieceSelect,
  onPieceMove,
  onPieceDragToRoster,
  onPieceDragStart,
  onPieceDragEnd,
  onNpcPlaced,
  onNpcPlacementCancel,
  onStageDeselect,
  onEmptySlotClick,
  onViewportScaleChange,
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
  fog,
  fogDisabled = true,
  worldWidth,
  worldHeight,
}: TacticalMapStageProps) {
  const [isBgLoading, setIsBgLoading] = useState(() => !!map.bg?.url);
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
  }, [bgUrl]);

  const handleBgLoadingChange = useCallback((loading: boolean) => {
    setIsBgLoading(loading);
    onBgLoadingChange?.(loading);
  }, [onBgLoadingChange]);

  return (
    <div ref={containerRef} style={{ position: "relative", width, height, overflow: "hidden", isolation: "isolate" }}>
      <Application width={width} height={height} background={0x101820}>
        <ViewportInner
          map={map}
          width={width}
          height={height}
          clampToGrid={clampToGrid}
          bgInteractive={bgInteractive}
          onBgPositionChange={onBgPositionChange}
          onBgLoadingChange={handleBgLoadingChange}
          piecesInteractive={piecesInteractive}
          draggablePieceIds={draggablePieceIds}
          selection={selection}
          npcMap={npcMap}
          placingNpcId={placingNpcId}
          onPieceSelect={onPieceSelect}
          onPieceMove={onPieceMove}
          onPieceDragToRoster={onPieceDragToRoster}
          onPieceDragStart={onPieceDragStart}
          onPieceDragEnd={onPieceDragEnd}
          onNpcPlaced={onNpcPlaced}
          onNpcPlacementCancel={onNpcPlacementCancel}
          onStageDeselect={onStageDeselect}
          onEmptySlotClick={onEmptySlotClick}
          onViewportScaleChange={onViewportScaleChange}
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
          fog={fog}
          fogDisabled={fogDisabled}
          worldWidth={worldWidth}
          worldHeight={worldHeight}
        />
      </Application>
      {(isBgLoading || uploading) && (
        <BgLoadingOverlay>
          <Spinner />
          <LoadingLabel>
            {uploading ? "Enviando imagem..." : "Carregando imagem..."}
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
  background: rgba(16, 24, 32, 0.85);
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
  border: 3px solid rgba(255, 255, 255, 0.15);
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
