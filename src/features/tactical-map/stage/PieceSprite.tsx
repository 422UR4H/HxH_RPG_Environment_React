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
import { colors } from "../../../styles/tokens";

// Pixi Graphics wants numeric colors, not CSS hex strings — same conversion
// GridLayer already does for grid.color.
const toPixiColor = (hex: string) => parseInt(hex.replace("#", ""), 16);
const SELECTION_RING_COLOR = toPixiColor(colors.pieceSelectionRing);
const TARGET_RING_COLOR = toPixiColor(colors.pieceTargetRing);
const STACK_BADGE_BG = toPixiColor(colors.pieceStackBadge);

type PieceSpriteProps = {
  piece: Piece;
  grid: GridShape;
  npc?: CharacterPrivateSummary;
  isSelected: boolean;
  isTarget?: boolean;
  piecesInteractive?: boolean;
  onPointerDown: (piece: Piece, e: FederatedPointerEvent) => void;
  // Cascade (§7.2): dx/dy are a FRACTION of the slot's inradius (from
  // stackOffsets), converted here to px so the offset scales with grid size
  // like everything else PieceSprite draws (tokenRadius, zOffsetPx).
  offset?: { dx: number; dy: number };
  // Occupant count sharing this piece's slot. The ×N badge only ever renders
  // when the caller also says this is the top piece of that group.
  stackCount?: number;
  isTopOfStack?: boolean;
};

export default function PieceSprite({
  piece, grid, npc, isSelected, isTarget, piecesInteractive, onPointerDown,
  offset, stackCount, isTopOfStack,
}: PieceSpriteProps) {
  const center = useMemo(() => slotToWorld(piece.coord.slot, grid), [piece.coord.slot, grid]);
  // 90% of the slot's inscribed-circle radius. Square keeps the original
  // 0.45·cellSize; hex tokens grow to fill their (much larger) cell by the same
  // proportion. See slotInradius.
  const tokenRadius = slotInradius(grid) * 0.9;
  const avatarRadius = tokenRadius * 0.7;
  const z = piece.coord.z;
  const zOffsetPx = z * 10;
  // §7.2: same mechanism as zOffsetPx above — a fraction of the slot converted
  // to px and added to the container's position — but for x/y cascade instead
  // of the z "height" shadow-offset.
  const inradius = slotInradius(grid);
  const stackDx = (offset?.dx ?? 0) * inradius;
  const stackDy = (offset?.dy ?? 0) * inradius;
  const showStackBadge = !!isTopOfStack && (stackCount ?? 1) > 1;

  const drawStackBadge = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (!showStackBadge) return;
      const r = tokenRadius * 0.32;
      const bx = tokenRadius - r * 0.3;
      const by = -zOffsetPx + tokenRadius - r * 0.3;
      g.setFillStyle({ color: STACK_BADGE_BG, alpha: 0.9 });
      g.circle(bx, by, r);
      g.fill();
    },
    [showStackBadge, tokenRadius, zOffsetPx],
  );

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
      g.setStrokeStyle({ color: SELECTION_RING_COLOR, width: 3.5, alpha: 1.0 });
      g.circle(0, -zOffsetPx, tokenRadius + 4);
      g.stroke();
      g.setStrokeStyle({ color: SELECTION_RING_COLOR, width: 2, alpha: 0.5 });
      g.circle(0, -zOffsetPx, tokenRadius + 8);
      g.stroke();
    },
    [isSelected, tokenRadius, zOffsetPx],
  );

  // Target ring sits further out than the selection ring so a piece that is both
  // the acting actor (selected) and its own target (self-target is legitimate,
  // spec §6) shows both rings distinctly instead of one occluding the other.
  const drawTarget = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (!isTarget) return;
      g.setStrokeStyle({ color: TARGET_RING_COLOR, width: 3.5, alpha: 1.0 });
      g.circle(0, -zOffsetPx, tokenRadius + 12);
      g.stroke();
    },
    [isTarget, tokenRadius, zOffsetPx],
  );

  return (
    <pixiContainer
      label={`piece-${piece.id}`}
      x={center.x + stackDx}
      y={center.y + stackDy}
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
      <pixiGraphics draw={drawTarget} />

      {showStackBadge && (
        <>
          <pixiGraphics draw={drawStackBadge} />
          <pixiText
            text={`×${stackCount}`}
            x={tokenRadius - tokenRadius * 0.32 * 0.3}
            y={-zOffsetPx + tokenRadius - tokenRadius * 0.32 * 0.3}
            anchor={0.5}
            style={{ fontSize: Math.max(10, tokenRadius * 0.34), fill: 0xffffff, fontWeight: "bold" }}
          />
        </>
      )}

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
