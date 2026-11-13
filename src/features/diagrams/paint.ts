import type { DiagramGeometry } from "./geometry";

export type PaintSpec = "all" | { nodes: string[]; segments: [string, string][] };

export interface Bleed {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export interface ResolvedPaint {
  all: boolean;
  isNodePainted(id: string): boolean;
  isSegmentPainted(a: string, b: string): boolean; // não depende da ordem
  bleeds: Bleed[];
}

// Quanto da linha vizinha não pintada a luz colorida invade.
export const BLEED_FRACTION = 0.32;

const sameSegment = (s: [string, string], a: string, b: string) =>
  (s[0] === a && s[1] === b) || (s[0] === b && s[1] === a);

// "all" (ou ausente) pinta tudo; senão lista de nós e trechos "A-B".
// Devolve null se um nó não existe ou o trecho não está na geometria.
export function parsePaintSpec(
  raw: string | undefined,
  g: DiagramGeometry,
): PaintSpec | null {
  if (raw === undefined || raw.trim() === "all") return "all";
  const nodes: string[] = [];
  const segments: [string, string][] = [];
  for (const part of raw.split(",").map((p) => p.trim())) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((p) => p.trim());
      const found = g.segments.some((s) => sameSegment(s, a, b));
      if (!found) return null;
      segments.push([a, b]);
    } else {
      if (!g.nodes.some((n) => n.id === part)) return null;
      nodes.push(part);
    }
  }
  return { nodes, segments };
}

export function resolvePaint(g: DiagramGeometry, spec: PaintSpec): ResolvedPaint {
  if (spec === "all") {
    return {
      all: true,
      isNodePainted: () => true,
      isSegmentPainted: () => true,
      bleeds: [],
    };
  }
  const nodeIds = new Set(spec.nodes);
  const isSegmentPainted = (a: string, b: string) =>
    spec.segments.some((s) => sameSegment(s, a, b));
  const byId = new Map(g.nodes.map((n) => [n.id, n]));

  // A luz sai de cada nó pintado pelas linhas vizinhas que não estão pintadas.
  const bleeds: Bleed[] = [];
  for (const [a, b] of g.segments) {
    if (isSegmentPainted(a, b)) continue;
    for (const [fromId, toId] of [
      [a, b],
      [b, a],
    ]) {
      if (!nodeIds.has(fromId)) continue;
      const from = byId.get(fromId)!;
      const to = byId.get(toId)!;
      bleeds.push({
        from: { x: from.x, y: from.y },
        to: {
          x: from.x + (to.x - from.x) * BLEED_FRACTION,
          y: from.y + (to.y - from.y) * BLEED_FRACTION,
        },
      });
    }
  }
  return {
    all: false,
    isNodePainted: (id) => nodeIds.has(id),
    isSegmentPainted,
    bleeds,
  };
}
