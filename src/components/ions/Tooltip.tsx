import { cloneElement, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, ReactElement } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";

/** Quanto a dica fica de pé depois de um toque (no toque não há "sair" para esconder). */
const TOUCH_MS = 2500;

/**
 * Dica não clicável: hover (mouse) e foco mostram; toque mostra por `TOUCH_MS`.
 * A bolha é `position: fixed`, medida a partir do filho ao abrir: um ancestral com
 * `overflow` (a Regência da topbar rola na horizontal) cortaria uma bolha absoluta.
 */
export default function Tooltip({
  label,
  children,
  enabled = true,
}: {
  label: string;
  children: ReactElement<{ "aria-describedby"?: string }>;
  /** false = não mostra nunca */
  enabled?: boolean;
}) {
  const id = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const lastPointer = useRef("mouse");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [pos, setPos] = useState<CSSProperties | null>(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const show = () => {
    if (!enabled) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    setPos({ top: (rect?.bottom ?? 0) + 6, left: (rect?.left ?? 0) + (rect?.width ?? 0) / 2 });
  };
  const hide = () => {
    clearTimeout(timer.current);
    setPos(null);
  };

  const open = enabled && pos !== null;
  return (
    <Wrap
      ref={wrapRef}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") show(); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") hide(); }}
      onFocus={show}
      onBlur={hide}
      onPointerDown={(e) => { lastPointer.current = e.pointerType; }}
      onClick={() => {
        if (lastPointer.current === "mouse") return;
        show();
        clearTimeout(timer.current);
        timer.current = setTimeout(hide, TOUCH_MS);
      }}
    >
      {cloneElement(children, open ? { "aria-describedby": id } : {})}
      {open && (
        <Bubble role="tooltip" id={id} style={pos ?? undefined}>
          {label}
        </Bubble>
      )}
    </Wrap>
  );
}

const Wrap = styled.span`
  display: inline-flex;
`;

// z-index acima da topbar e do painel; sem eventos de ponteiro para nunca roubar o hover.
const Bubble = styled.span`
  position: fixed;
  transform: translateX(-50%);
  z-index: 1000;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
  padding: 4px 8px;
  border-radius: 4px;
  background: ${colors.grayBgDark};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 12px;
`;
