import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { GridShape, Piece } from "../../../types/tacticalMap";
import { pieceScreenAnchor, pieceScreenRadius } from "../../tactical-map/utils/screenAnchor";
import MapPieceOverlay from "./MapPieceOverlay";
import type { MapPieceAnchor } from "./MapPieceOverlay";
import type { ViewportStore } from "./viewportStore";

export type PieceAnchoredItem = {
  key: string;
  /** A ficha cuja peça ancora o item. Sem peça visível (o fog já recortou), o item não sai. */
  characterId: string;
  placement: "above" | "below";
  node: ReactNode;
};

/**
 * A camada que põe botões e balões ao lado das peças (spec §4.4). É ela — e só ela — que
 * assina o enquadramento do mapa: um pan/zoom re-renderiza esta camada, não a página.
 * Peça empilhada ancora no centro da casa (protótipo; sem o deslocamento da pilha).
 */
export default function PieceAnchoredLayer({
  viewport,
  grid,
  pieces,
  items,
  width,
  height,
}: {
  viewport: ViewportStore;
  grid: GridShape | undefined;
  /** A peça de cada ficha (`pieceByCharacter` de `useGameTable`). */
  pieces: ReadonlyMap<string, Piece>;
  items: PieceAnchoredItem[];
  width: number;
  height: number;
}) {
  const t = useSyncExternalStore(viewport.subscribe, viewport.getSnapshot);
  if (!t || !grid) return null;
  const radius = pieceScreenRadius(grid, t);
  const anchors: MapPieceAnchor[] = items.flatMap((item) => {
    const piece = pieces.get(item.characterId);
    if (!piece) return [];
    return [{
      key: item.key,
      ...pieceScreenAnchor(piece.coord.slot, grid, t),
      radius,
      placement: item.placement,
      node: item.node,
    }];
  });
  return <MapPieceOverlay anchors={anchors} width={width} height={height} />;
}
