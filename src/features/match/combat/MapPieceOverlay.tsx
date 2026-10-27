import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styled from "styled-components";
import { clampToLayer, stackAbove } from "./overlayLayout";
import type { OverlayBox } from "./overlayLayout";

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

/** Ajuste do miolo do item: `dy` sobe o balão (pilha), `dx` o devolve para dentro da camada. */
type Shift = { dx: number; dy: number };

function sameShifts(a: Record<string, Shift>, b: Record<string, Shift>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => b[k] && a[k].dx === b[k].dx && a[k].dy === b[k].dy);
}

/**
 * A camada HTML sobre o mapa que ancora coisas nas peças (botões de reação, balões).
 * O contêiner não recebe ponteiro — o mapa continua com o pan e os toques — e só os
 * botões de baixo recebem: o balão (acima) é só leitura, e o toque sobre ele é do mapa.
 * Âncora fora da caixa visível não é desenhada.
 *
 * O pan do mapa escuta `pointerdown` no `window` e trata qualquer toque dentro da caixa do
 * canvas como toque no mapa — inclusive num botão daqui. O item de baixo corta a propagação:
 * o handler do botão já rodou (vem antes no borbulhar) e o `window` não chega a ver o toque.
 *
 * Balões de peças vizinhas se cobririam: depois de cada render, mede os itens "acima" e
 * sobe os que se sobrepõem (`stackAbove`). A medida é da casca do item, que fica no lugar
 * da âncora — a subida vai no miolo, então o deslocamento não volta para a medida seguinte
 * e o cálculo não oscila. Os botões de baixo não empilham.
 *
 * Todo item (botão ou balão) também é mantido dentro da largura da camada (`clampToLayer`):
 * o miolo anda para os lados e a ponta do balão anda ao contrário (`--tip-offset`, lida pelo
 * `ActionBalloon`), para continuar apontando para a peça.
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
  const visible = useMemo(
    () => anchors.filter((a) => a.x >= 0 && a.x <= width && a.y >= 0 && a.y <= height),
    [anchors, width, height],
  );
  const itemEls = useRef(new Map<string, HTMLElement>());
  const [shifts, setShifts] = useState<Record<string, Shift>>({});

  // Mede de novo a cada lista de âncoras nova — todo pan/zoom e toda troca de balão (o texto
  // muda o tamanho). Só troca o estado quando a pilha mudou: o mesmo objeto devolvido não
  // re-renderiza, então não há laço.
  useLayoutEffect(() => {
    const boxes: OverlayBox[] = [];
    const dxs: Record<string, number> = {};
    for (const a of visible) {
      const el = itemEls.current.get(a.key);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      // A casca não anda: sua largura e sua borda esquerda são as da âncora, sem o ajuste.
      const { left } = clampToLayer(a.x, r.width, width);
      dxs[a.key] = left - (a.x - r.width / 2);
      if (a.placement === "above") boxes.push({ key: a.key, x: r.left + dxs[a.key], y: r.top, w: r.width, h: r.height });
    }
    const dys = stackAbove(boxes);
    const next: Record<string, Shift> = {};
    for (const key of Object.keys(dxs)) next[key] = { dx: dxs[key], dy: dys[key] ?? 0 };
    setShifts((prev) => (sameShifts(prev, next) ? prev : next));
  }, [visible, width]);

  return (
    <Layer>
      {visible.map((a) => {
        const { dx, dy } = shifts[a.key] ?? { dx: 0, dy: 0 };
        return (
          <Item
            key={a.key}
            data-anchor={a.key}
            ref={(el) => {
              if (el) itemEls.current.set(a.key, el);
              else itemEls.current.delete(a.key);
            }}
            $placement={a.placement}
            style={{ left: a.x, top: a.placement === "above" ? a.y - a.radius : a.y + a.radius }}
          >
            <Content
              $interactive={a.placement === "below"}
              onPointerDown={a.placement === "below" ? (e) => e.stopPropagation() : undefined}
              style={
                dx || dy
                  ? ({
                      transform: [dx && `translateX(${dx}px)`, dy && `translateY(${dy}px)`].filter(Boolean).join(" "),
                      "--tip-offset": `${-dx}px`,
                    } as CSSProperties)
                  : undefined
              }
            >
              {a.node}
            </Content>
          </Item>
        );
      })}
    </Layer>
  );
}

const Layer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
`;

// A casca fica na âncora e não recebe ponteiro: quando o miolo sobe, o lugar vazio que ele
// deixou não pode engolir o toque no mapa.
const Item = styled.div<{ $placement: "above" | "below" }>`
  position: absolute;
  width: max-content; /* sem isso a largura encolhe perto da borda direita e o texto quebra */
  transform: ${({ $placement }) => ($placement === "above" ? "translate(-50%, -100%)" : "translate(-50%, 0)")};
  pointer-events: none;
`;

// Só o miolo de baixo (os botões) recebe ponteiro; o balão deixa o toque passar ao mapa.
const Content = styled.div<{ $interactive: boolean }>`
  pointer-events: ${({ $interactive }) => ($interactive ? "auto" : "none")};
`;
