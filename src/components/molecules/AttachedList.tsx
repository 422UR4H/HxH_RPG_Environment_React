import type { CSSProperties, FocusEvent, KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { AttachedListBox } from "./AttachedList.styles";
import type { AttachedListController } from "./useAttachedList";

interface AttachedListProps {
  list: AttachedListController;
  role: "listbox" | "menu";
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** Variáveis próprias de quem usa (ex.: `--list-scrollbar` do `PillSelect`). */
  style?: CSSProperties;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  onBlur?: (e: FocusEvent<HTMLDivElement>) => void;
  children: ReactNode;
}

/**
 * A lista (num portal no `body`) que continua a pílula do `useAttachedList`. Só existe enquanto
 * aberta ou enrolando; enrolando, fica inerte e fora da árvore de acessibilidade.
 */
export default function AttachedList({
  list,
  role,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  style,
  onKeyDown,
  onBlur,
  children,
}: AttachedListProps) {
  const { mounted, placement, closing, side, anchorName, listId, listRef, finishClosing } = list;
  if (!mounted) return null;
  return createPortal(
    <AttachedListBox
      ref={listRef}
      id={listId}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      $side={side}
      $placed={placement !== null}
      $closing={closing}
      inert={closing}
      aria-hidden={closing || undefined}
      style={
        {
          ...placement?.vars,
          ...style,
          "--pill-anchor": anchorName,
          // Geometria do JS: só vale sem anchor positioning (ver AttachedList.styles). Com
          // âncora, o navegador cola a lista à pílula; o JS decide apenas lado e altura.
          // Em cima só `bottom`: `top` fica sem valor para a lista curta não descolar da pílula.
          "--fallback-top": placement?.top !== undefined ? `${placement.top}px` : placement ? "auto" : "0px",
          "--fallback-bottom": placement?.bottom !== undefined ? `${placement.bottom}px` : "auto",
          "--fallback-left": `${placement?.left ?? 0}px`,
          "--fallback-width": placement?.width !== undefined ? `${placement.width}px` : "auto",
          maxHeight: placement?.height,
        } as CSSProperties
      }
      // Clicar na lista (fora de um item focável) não tira o foco de onde ele está.
      onMouseDown={(e) => e.preventDefault()}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget && closing) finishClosing();
      }}
      // Eventos da lista (portal) não sobem pelos ancestrais React da pílula (ex.: card clicável).
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      {children}
    </AttachedListBox>,
    document.body,
  );
}
