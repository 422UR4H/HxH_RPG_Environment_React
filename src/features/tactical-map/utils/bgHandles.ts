import type { BgImage } from "../../../types/tacticalMap";

// ─── BgHandles math ───────────────────────────────────────────────────────────

export function computeNewBgFromDrag(
  handle: string,
  startBg: NonNullable<BgImage>,
  worldX: number,
  worldY: number,
  aspectRatio: number,
  freeResize: boolean,
): NonNullable<BgImage> | null {
  const MIN = 16;
  const { x, y, width: w, height: h } = startBg;
  const cx = x + w / 2;
  const bcy = y + h / 2;

  // Rotation uses the raw world angle from the image center to the cursor.
  if (handle === "rotate") {
    const angle = Math.atan2(worldY - bcy, worldX - cx) * (180 / Math.PI) + 90;
    return { ...startBg, rotation: angle };
  }

  // For resize, convert the world cursor into the image's own (un-rotated)
  // axes so the math below works regardless of bg.rotation. At rotation 0
  // this is a no-op (lx=worldX, ly=worldY).
  const rot = ((startBg.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const ddx = worldX - cx;
  const ddy = worldY - bcy;
  const lx = cx + ddx * cos + ddy * sin;
  const ly = bcy - ddx * sin + ddy * cos;

  switch (handle) {
    case "TL": {
      const ax = x + w, ay = y + h;
      const newW = Math.max(MIN, ax - lx);
      const newH = freeResize ? Math.max(MIN, ay - ly) : newW / aspectRatio;
      return { ...startBg, x: ax - newW, y: ay - newH, width: newW, height: newH };
    }
    case "TC": {
      const ay = y + h;
      const newH = Math.max(MIN, ay - ly);
      const newW = freeResize ? w : newH * aspectRatio;
      return { ...startBg, x: cx - newW / 2, y: ay - newH, width: newW, height: newH };
    }
    case "TR": {
      const ay = y + h;
      const newW = Math.max(MIN, lx - x);
      const newH = freeResize ? Math.max(MIN, ay - ly) : newW / aspectRatio;
      return { ...startBg, x, y: ay - newH, width: newW, height: newH };
    }
    case "ML": {
      const ax = x + w;
      const newW = Math.max(MIN, ax - lx);
      const newH = freeResize ? h : newW / aspectRatio;
      return { ...startBg, x: ax - newW, y: y + (h - newH) / 2, width: newW, height: newH };
    }
    case "MR": {
      const newW = Math.max(MIN, lx - x);
      const newH = freeResize ? h : newW / aspectRatio;
      return { ...startBg, x, y: y + (h - newH) / 2, width: newW, height: newH };
    }
    case "BL": {
      const ax = x + w;
      const newW = Math.max(MIN, ax - lx);
      const newH = freeResize ? Math.max(MIN, ly - y) : newW / aspectRatio;
      return { ...startBg, x: ax - newW, y, width: newW, height: newH };
    }
    case "BC": {
      const newH = Math.max(MIN, ly - y);
      const newW = freeResize ? w : newH * aspectRatio;
      return { ...startBg, x: cx - newW / 2, y, width: newW, height: newH };
    }
    case "BR": {
      const newW = Math.max(MIN, lx - x);
      const newH = freeResize ? Math.max(MIN, ly - y) : newW / aspectRatio;
      return { ...startBg, x, y, width: newW, height: newH };
    }
    default:
      return null;
  }
}
