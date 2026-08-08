import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Assets, BlurFilter, ImageSource, Texture } from "pixi.js";
import type { Container, FederatedPointerEvent } from "pixi.js";
import type { Graphics as PixiGraphics } from "pixi.js";
import gungiFrameUrl from "../../../assets/icons/gungi.svg";
import avatarPlaceholderUrl from "../../../assets/placeholder/avatar.png";
import type { GridShape, Piece } from "../../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../../types/characterSheet";
import { slotToWorld, slotInradius } from "../utils/coords";
import { getAvatarBlobUrl, getAvatarInsetShadowTexture } from "../utils/avatarTexture";

type PieceSpriteProps = {
  piece: Piece;
  grid: GridShape;
  npc?: CharacterPrivateSummary;
  isSelected: boolean;
  piecesInteractive?: boolean;
  onPointerDown: (piece: Piece, e: FederatedPointerEvent) => void;
};

export default function PieceSprite({ piece, grid, npc, isSelected, piecesInteractive, onPointerDown }: PieceSpriteProps) {
  const center = useMemo(() => slotToWorld(piece.coord.slot, grid), [piece.coord.slot, grid]);
  // 90% of the slot's inscribed-circle radius. Square keeps the original
  // 0.45·cellSize; hex tokens grow to fill their (much larger) cell by the same
  // proportion. See slotInradius.
  const tokenRadius = slotInradius(grid) * 0.9;
  const avatarRadius = tokenRadius * 0.7;
  const z = piece.coord.z;
  const zOffsetPx = z * 10;

  const [avatarTexture, setAvatarTexture] = useState<Texture | null>(null);
  useEffect(() => {
    let cancelled = false;

    const makeTexture = (img: HTMLImageElement) =>
      new Texture({ source: new ImageSource({ resource: img }) });

    const loadImg = (src: string) =>
      new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });

    const run = async () => {
      const externalUrl = npc?.avatarUrl ?? null;
      if (externalUrl) {
        // getAvatarBlobUrl fetches once with mode:"cors" and caches the
        // resulting blob URL. Blob URLs are same-origin → safe for WebGL.
        // All subsequent PieceSprites for the same NPC reuse the cached promise.
        const blobUrl = await getAvatarBlobUrl(externalUrl);
        if (cancelled) return;
        if (blobUrl) {
          const img = await loadImg(blobUrl);
          if (cancelled) return;
          if (img) { setAvatarTexture(makeTexture(img)); return; }
        }
      }
      if (cancelled) return;
      const img = await loadImg(avatarPlaceholderUrl);
      if (!cancelled) setAvatarTexture(img ? makeTexture(img) : null);
    };

    run();
    return () => { cancelled = true; };
  }, [npc?.avatarUrl]);

  const [frameTexture, setFrameTexture] = useState<Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    Assets.load(gungiFrameUrl)
      .then((t: Texture) => { if (!cancelled) setFrameTexture(t); })
      .catch(() => { if (!cancelled) setFrameTexture(null); });
    return () => { cancelled = true; };
  }, []);

  const shadowRadius = z > 0 ? tokenRadius + 0.1 + z * 0.1 : tokenRadius + 0.1;
  const shadowAlpha = z > 0 ? 0.5 : 0.7;
  const shadowBlurStrength = z > 0 ? 3 + z : 3;
  const shadowFilter = useMemo(() => {
    const f = new BlurFilter({ strength: shadowBlurStrength, quality: 4 });
    // Fixed large padding prevents square-corner artifacts at any blur strength or zoom level.
    f.padding = 80;
    return f;
  }, [shadowBlurStrength]);

  const drawShadow = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.setFillStyle({ color: 0x000000, alpha: shadowAlpha });
      g.circle(0, -zOffsetPx + 2, shadowRadius);
      g.fill();
    },
    [shadowRadius, shadowAlpha, zOffsetPx],
  );

  const drawFallback = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.setFillStyle({ color: 0x2d2d3a });
      g.circle(0, -zOffsetPx, avatarRadius);
      g.fill();
    },
    [avatarRadius, zOffsetPx],
  );

  const maskRef = useRef<PixiGraphics | null>(null);
  const avatarGroupRef = useRef<Container | null>(null);
  const drawMask = useCallback(
    (g: PixiGraphics) => {
      maskRef.current = g;
      g.clear();
      g.setFillStyle({ color: 0xffffff });
      g.circle(0, -zOffsetPx, avatarRadius);
      g.fill();
      if (avatarGroupRef.current) avatarGroupRef.current.mask = g;
    },
    [avatarRadius, zOffsetPx],
  );

  const insetShadowTexture = useMemo(() => getAvatarInsetShadowTexture(avatarRadius), [avatarRadius]);

  const drawSelection = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (!isSelected) return;
      g.setStrokeStyle({ color: 0xffd700, width: 3.5, alpha: 1.0 });
      g.circle(0, -zOffsetPx, tokenRadius + 4);
      g.stroke();
      g.setStrokeStyle({ color: 0xffe066, width: 2, alpha: 0.5 });
      g.circle(0, -zOffsetPx, tokenRadius + 8);
      g.stroke();
    },
    [isSelected, tokenRadius, zOffsetPx],
  );

  return (
    <pixiContainer
      label={`piece-${piece.id}`}
      x={center.x}
      y={center.y}
      eventMode={piecesInteractive ? "static" : "none"}
      cursor={piecesInteractive ? "pointer" : "default"}
      onPointerDown={(e: FederatedPointerEvent) => onPointerDown(piece, e)}
    >
      <pixiGraphics draw={drawShadow} filters={[shadowFilter]} />

      {frameTexture && (
        <pixiSprite
          texture={frameTexture}
          x={-tokenRadius}
          y={-zOffsetPx - tokenRadius}
          width={tokenRadius * 2}
          height={tokenRadius * 2}
        />
      )}

      {avatarTexture ? (
        <>
          <pixiGraphics draw={drawMask} />
          <pixiContainer
            ref={(c: Container | null) => {
              avatarGroupRef.current = c;
              if (c && maskRef.current) c.mask = maskRef.current;
            }}
            x={-avatarRadius}
            y={-zOffsetPx - avatarRadius}
          >
            <pixiSprite
              texture={avatarTexture}
              width={avatarRadius * 2}
              height={avatarRadius * 2}
            />
          </pixiContainer>
          <pixiSprite
            texture={insetShadowTexture}
            x={-avatarRadius}
            y={-zOffsetPx - avatarRadius}
            width={avatarRadius * 2}
            height={avatarRadius * 2}
          />
        </>
      ) : (
        <pixiGraphics draw={drawFallback} />
      )}

      <pixiGraphics draw={drawSelection} />

      {z > 0 && (
        <pixiText
          text={`+${z}m`}
          x={tokenRadius + 2}
          y={-zOffsetPx - tokenRadius - 12}
          style={{ fontSize: 12, fill: 0xffffff, dropShadow: { color: 0x000000, blur: 2, distance: 1 } }}
        />
      )}
    </pixiContainer>
  );
}
