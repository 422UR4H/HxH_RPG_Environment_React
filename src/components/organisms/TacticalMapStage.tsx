import { useCallback, useMemo } from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { Viewport } from "pixi-viewport";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { TacticalMap, GridShape, Piece } from "../../types/tacticalMap";
import { slotToWorld } from "../../features/tactical-map/utils/coords";

extend({ Container, Graphics, Sprite, Text, Viewport });

// @pixi/react v8 auto-generates JSX intrinsics only for pixi.js exports.
// Viewport comes from pixi-viewport, so we declare it manually here.
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      pixiViewport: {
        screenWidth?: number;
        screenHeight?: number;
        worldWidth?: number;
        worldHeight?: number;
        events?: unknown;
        children?: React.ReactNode;
      };
    }
  }
}

type Props = {
  map: TacticalMap;
  width: number;
  height: number;
};

export default function TacticalMapStage({ map, width, height }: Props) {
  return (
    <Application width={width} height={height} background={0x101820}>
      <pixiViewport
        screenWidth={width}
        screenHeight={height}
        worldWidth={map.grid.cols * map.grid.cellSize * 2}
        worldHeight={map.grid.rows * map.grid.cellSize * 2}
        events={undefined}
      >
        <BgLayer bg={map.bg} />
        <GridLayer grid={map.grid} />
        <pixiContainer label="decorations-layer" />
        <PiecesLayer map={map} />
        <pixiContainer label="walls-layer" />
        <pixiContainer label="overlay-layer" />
      </pixiViewport>
    </Application>
  );
}

function BgLayer({ bg }: { bg: TacticalMap["bg"] }) {
  if (!bg) return null;
  return (
    <pixiSprite
      texture={Texture.from(bg.url)}
      x={bg.x}
      y={bg.y}
      width={bg.width}
      height={bg.height}
      rotation={(bg.rotation * Math.PI) / 180}
      alpha={bg.opacity}
    />
  );
}

function GridLayer({ grid }: { grid: GridShape }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      const colorHex = parseInt(grid.color.replace("#", ""), 16);
      g.setStrokeStyle({ width: 1, color: colorHex, alpha: grid.opacity });
      if (grid.kind === "square") {
        const { cols, rows, cellSize } = grid;
        for (let c = 0; c <= cols; c++) {
          g.moveTo(c * cellSize, 0).lineTo(c * cellSize, rows * cellSize);
        }
        for (let r = 0; r <= rows; r++) {
          g.moveTo(0, r * cellSize).lineTo(cols * cellSize, r * cellSize);
        }
      } else {
        for (let r = 0; r < grid.rows; r++) {
          for (let c = 0; c < grid.cols; c++) {
            const center = slotToWorld({ kind: "hex", q: c, r }, grid);
            const size = grid.cellSize;
            for (let i = 0; i < 6; i++) {
              const angle = ((60 * i - 30) * Math.PI) / 180;
              const x = center.x + size * Math.cos(angle);
              const y = center.y + size * Math.sin(angle);
              if (i === 0) g.moveTo(x, y);
              else g.lineTo(x, y);
            }
            g.closePath();
          }
        }
      }
      g.stroke();
    },
    [grid],
  );

  return <pixiGraphics draw={draw} />;
}

function PiecesLayer({ map }: { map: TacticalMap }) {
  const pieces = useMemo(() => map.pieces, [map.pieces]);
  return (
    <pixiContainer label="pieces-layer">
      {pieces.map((p) => (
        <PieceSprite key={p.id} piece={p} grid={map.grid} />
      ))}
    </pixiContainer>
  );
}

function PieceSprite({ piece, grid }: { piece: Piece; grid: GridShape }) {
  const center = slotToWorld(piece.coord.slot, grid);
  const radius = grid.cellSize / 3;
  const zOffsetPx = piece.coord.z * 10;

  const drawShadow = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.setFillStyle({ color: 0x000000, alpha: 0.35 });
      g.circle(center.x, center.y, radius);
      g.fill();
    },
    [center.x, center.y, radius],
  );

  const drawBody = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.setFillStyle({ color: 0xff8800 });
      g.circle(center.x, center.y - zOffsetPx, radius);
      g.fill();
    },
    [center.x, center.y, radius, zOffsetPx],
  );

  return (
    <pixiContainer label={`piece-${piece.id}`}>
      <pixiGraphics draw={drawShadow} />
      <pixiGraphics draw={drawBody} />
      {piece.coord.z > 0 && (
        <pixiText
          text={`+${piece.coord.z}m`}
          x={center.x + radius}
          y={center.y - zOffsetPx - radius - 12}
          style={{ fontSize: 12, fill: 0xffffff }}
        />
      )}
    </pixiContainer>
  );
}
