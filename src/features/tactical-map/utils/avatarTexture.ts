import { ImageSource, Texture } from "pixi.js";

// Module-level CORS-safe avatar cache: R2 URL → Promise<same-origin blob URL>.
// Blob URLs are same-origin so they're safe for WebGL textures.
// Kept alive for the page lifetime (~20 NPCs × ~100 KB ≈ negligible).
const avatarBlobUrlCache = new Map<string, Promise<string | null>>();

export function getAvatarBlobUrl(url: string): Promise<string | null> {
  let p = avatarBlobUrlCache.get(url);
  if (!p) {
    // CharacterSheetHeader renders avatars via CSS background-image (no Origin header),
    // so Cloudflare CDN may cache the response without CORS headers. Appending ?pixi
    // creates a separate CDN cache entry whose first request always comes from this
    // CORS fetch — guaranteeing the cached response includes Access-Control-Allow-Origin.
    const corsUrl = url.includes("?") ? `${url}&pixi=1` : `${url}?pixi=1`;
    p = fetch(corsUrl, { mode: "cors" })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => (blob ? URL.createObjectURL(blob) : null))
      .catch(() => null);
    avatarBlobUrlCache.set(url, p);
  }
  return p;
}

// Replicates CSS `inset box-shadow` from AvatarRelief (CharacterSheetHeader) as a
// PixiJS-renderable texture. Using a canvas-drawn texture keeps everything inside the
// WebGL display list — no DOM overlay div, no canvas/DOM z-layer conflict.
const insetShadowCache = new Map<number, Texture>();
export function getAvatarInsetShadowTexture(radius: number): Texture {
  const key = Math.round(radius * 10);
  const cached = insetShadowCache.get(key);
  if (cached) return cached;

  const d = Math.ceil(radius * 2);
  const canvas = document.createElement("canvas");
  canvas.width = d;
  canvas.height = d;
  const ctx = canvas.getContext("2d")!;

  // Replicate CSS `inset box-shadow` on a circle using radial gradients.
  // Each layer: radial gradient centered at (cx, cy + offsetY*r).
  // Shifting the gradient center DOWN (positive offset) makes the ring thicker at
  // the top — exactly how CSS inset shadow with positive Y offset looks on a circle.
  // Shifting UP (negative) thickens the ring at the bottom for the highlight layers.
  // layers: [color, offsetY (fraction of r), blur (fraction of r)]
  // CSS origin: inset 0 4cqi 5cqi → offsetY=0.08r blur=0.10r; cqi = 2r/100
  const cx = radius, cy = radius, r = radius + 1;
  const layers: [string, number, number][] = [
    ["rgba(0,0,0,0.85)",        0.1, 0.1],
    ["rgba(0,0,0,0.42)",        0.1, 0.14],
    ["rgba(255,255,255,0.14)", -0.1, 0.1],
    ["rgba(255,255,255,0.05)", -0.1, 0.2],
  ];
  for (const [color, offsetFrac, blurFrac] of layers) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    const shadowCy = cy + offsetFrac * r;
    const innerR = Math.max(0, r - blurFrac * r);
    const outerR = r + blurFrac * r;
    const g = ctx.createRadialGradient(cx, shadowCy, innerR, cx, shadowCy, outerR);
    g.addColorStop(0, "transparent");
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, d, d);
    ctx.restore();
  }

  const t = new Texture({ source: new ImageSource({ resource: canvas }) });
  insetShadowCache.set(key, t);
  return t;
}
