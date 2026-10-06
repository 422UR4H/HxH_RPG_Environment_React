import type { ReactNode } from "react";
import styled from "styled-components";

export type MapPieceAnchor = {
  key: string;
  /** Centro da peça em px do palco (`pieceScreenAnchor`). */
  x: number;
  y: number;
  /** Raio da peça na tela: o item encosta na borda dela, acima ou abaixo. */
  radius: number;
  placement: "above" | "below";
  node: ReactNode;
};

/**
 * A camada HTML sobre o mapa que ancora coisas nas peças (botões de reação, balões).
 * O contêiner não recebe ponteiro — o mapa continua com o pan e os toques — e só os
 * itens recebem. Âncora fora da caixa visível não é desenhada.
 *
 * O pan do mapa escuta `pointerdown` no `window` e trata qualquer toque dentro da caixa do
 * canvas como toque no mapa — inclusive num botão daqui. Cada item corta a propagação: o
 * handler do botão já rodou (vem antes no borbulhar) e o `window` não chega a ver o toque.
 */
export default function MapPieceOverlay({
  anchors,
  width,
  height,
}: {
  anchors: MapPieceAnchor[];
  width: number;
  height: number;
}) {
  return (
    <Layer>
      {anchors
        .filter((a) => a.x >= 0 && a.x <= width && a.y >= 0 && a.y <= height)
        .map((a) => (
          <Item
            key={a.key}
            $placement={a.placement}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ left: a.x, top: a.placement === "above" ? a.y - a.radius : a.y + a.radius }}
          >
            {a.node}
          </Item>
        ))}
    </Layer>
  );
}

const Layer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
`;

const Item = styled.div<{ $placement: "above" | "below" }>`
  position: absolute;
  transform: ${({ $placement }) => ($placement === "above" ? "translate(-50%, -100%)" : "translate(-50%, 0)")};
  pointer-events: auto;
`;
