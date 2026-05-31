//
// Matemática pura de hex pointy-top em coordenadas axiais (q, r).
// Referência: https://www.redblobgames.com/grids/hexagons/

export type Axial = { q: number; r: number };
export type Cube  = { x: number; y: number; z: number };

const SQRT3 = Math.sqrt(3);

export function hexToPixel({ q, r }: Axial, size: number): { x: number; y: number } {
  return {
    x: size * SQRT3 * (q + r / 2),
    y: size * 1.5 * r,
  };
}

export function pixelToHex(pixel: { x: number; y: number }, size: number): Axial {
  const qFrac = (SQRT3 / 3 * pixel.x - pixel.y / 3) / size;
  const rFrac = (2 / 3 * pixel.y) / size;
  return hexRound({ q: qFrac, r: rFrac });
}

export function axialToCube({ q, r }: Axial): Cube {
  return { x: q, z: r, y: -q - r };
}

export function cubeToAxial({ x, z }: Cube): Axial {
  return { q: x, r: z };
}

export function hexRound(frac: Axial): Axial {
  const c = axialToCube(frac);
  let rx = Math.round(c.x);
  let ry = Math.round(c.y);
  let rz = Math.round(c.z);

  const dx = Math.abs(rx - c.x);
  const dy = Math.abs(ry - c.y);
  const dz = Math.abs(rz - c.z);

  if (dx > dy && dx > dz)      rx = -ry - rz;
  else if (dy > dz)             ry = -rx - rz;
  else                          rz = -rx - ry;

  // Normalize -0 to +0 to avoid toEqual mismatches
  return cubeToAxial({ x: rx || 0, y: ry || 0, z: rz || 0 });
}

export function hexDistance(a: Axial, b: Axial): number {
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  return (Math.abs(ac.x - bc.x) + Math.abs(ac.y - bc.y) + Math.abs(ac.z - bc.z)) / 2;
}
