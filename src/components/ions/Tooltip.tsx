import { cloneElement, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactElement } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { colors } from "../../styles/tokens";

/** Quanto a dica fica de pé depois de um toque (no toque não há "sair" para esconder). */
const TOUCH_MS = 6250;
/** Segurar o dedo por isto mostra a dica sem acionar o filho. */
const LONG_PRESS_MS = 500;

/**
 * Dica não clicável: hover (mouse) e foco mostram; toque mostra por `TOUCH_MS`. Segurar o
 * dedo (`LONG_PRESS_MS`) também mostra, e o clique que vem ao soltar é engolido — é assim
 * que um botão que age no toque (ex.: sair) se explica no touch sem ser acionado.
 * A bolha é `position: fixed`, medida a partir do filho ao abrir, e vai num portal no `body`:
 * um ancestral com `overflow` (a Regência da topbar rola na horizontal) cortaria uma bolha
 * absoluta, e um com `filter`/`transform` (o hover do card do lobby) prenderia a `fixed` nele.
 */
export default function Tooltip({
  label,
  children,
  enabled = true,
  stretch = false,
}: {
  label: string;
  children: ReactElement<{ "aria-describedby"?: string }>;
  /** false = não mostra nunca */
  enabled?: boolean;
  /** true = ocupa a largura do contêiner (item de menu, botão de linha inteira) em vez de abraçar o filho. */
  stretch?: boolean;
}) {
  const id = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const lastPointer = useRef("mouse");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const longPressed = useRef(false);
  const [pos, setPos] = useState<CSSProperties | null>(null);

  const bubbleRef = useRef<HTMLSpanElement>(null);
  const anchor = useRef({ top: 0, bottom: 0 });

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(pressTimer.current);
    },
    [],
  );

  // Se a dica for desligada com a bolha aberta, ela não pode reaparecer velha depois.
  useEffect(() => {
    if (!enabled) {
      clearTimeout(timer.current);
      setPos(null);
    }
  }, [enabled]);

  // Esc dispensa a dica sem tirar o foco/hover (WCAG 1.4.13).
  const isOpen = pos !== null;
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearTimeout(timer.current);
        setPos(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Tocar/clicar em outro lugar dispensa a dica (o gatilho cuida do próprio toque).
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      clearTimeout(timer.current);
      setPos(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [isOpen]);

  // Mede a bolha e a mantém a 8px das bordas da tela (num celular de 390px ela cortaria).
  // Se abaixo do filho ela passaria do rodapé, vira para cima dele.
  useLayoutEffect(() => {
    const el = bubbleRef.current;
    if (!el || !pos) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (anchor.current.bottom + 6 + h > window.innerHeight - 8) {
      el.style.top = `${anchor.current.top - h - 6}px`;
    }
    const center = Number(pos.left);
    el.style.transform = "none";
    el.style.left = `${Math.max(8, Math.min(center - w / 2, window.innerWidth - w - 8))}px`;
  }, [pos]);

  const show = () => {
    if (!enabled) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    anchor.current = { top: rect?.top ?? 0, bottom: rect?.bottom ?? 0 };
    setPos({ top: (rect?.bottom ?? 0) + 6, left: (rect?.left ?? 0) + (rect?.width ?? 0) / 2 });
  };
  const hide = () => {
    clearTimeout(timer.current);
    setPos(null);
  };

  const showForTouch = () => {
    show();
    clearTimeout(timer.current);
    timer.current = setTimeout(hide, TOUCH_MS);
  };
  const cancelPress = () => clearTimeout(pressTimer.current);

  const open = enabled && pos !== null;
  return (
    <Wrap
      ref={wrapRef}
      $stretch={stretch}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") show(); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") hide(); }}
      onFocus={show}
      onBlur={hide}
      onPointerDown={(e) => {
        lastPointer.current = e.pointerType;
        if (e.pointerType === "mouse" || !enabled) return;
        longPressed.current = false;
        cancelPress();
        pressTimer.current = setTimeout(() => {
          longPressed.current = true;
          showForTouch();
        }, LONG_PRESS_MS);
      }}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      // Android abre o menu de contexto no mesmo segurar.
      onContextMenu={(e) => { if (lastPointer.current !== "mouse" && enabled) e.preventDefault(); }}
      onClickCapture={(e) => {
        cancelPress();
        if (!longPressed.current) return;
        longPressed.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={() => {
        if (lastPointer.current === "mouse") return;
        showForTouch();
      }}
    >
      {/* A descrição existe desde o foco (o botão aria-disabled só se explica por ela);
          a bolha visual é aria-hidden para o texto não ser lido duas vezes. */}
      {enabled && <SrOnly id={id}>{label}</SrOnly>}
      {cloneElement(children, enabled ? { "aria-describedby": id } : {})}
      {open &&
        createPortal(
          <Bubble ref={bubbleRef} role="tooltip" aria-hidden="true" style={pos ?? undefined}>
            {label}
          </Bubble>,
          document.body,
        )}
    </Wrap>
  );
}

const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`;

const Wrap = styled.span<{ $stretch: boolean }>`
  display: ${({ $stretch }) => ($stretch ? "flex" : "inline-flex")};
  ${({ $stretch }) => ($stretch ? "flex: 1 1 auto;" : "")}
  -webkit-touch-callout: none;
`;

// z-index acima da topbar e do painel; sem eventos de ponteiro para nunca roubar o hover.
const Bubble = styled.span`
  position: fixed;
  transform: translateX(-50%);
  z-index: 1000;
  pointer-events: none;
  user-select: none;
  /* Curta fica numa linha; frase longa (o motivo de uma ação indisponível) quebra sem passar da tela. */
  width: max-content;
  max-width: min(300px, calc(100vw - 16px));
  white-space: normal;
  line-height: 1.35;
  padding: 6px 10px;
  border-radius: 4px;
  background: ${colors.surfaceBar};
  color: ${colors.textPrimary};
  font-size: 15px;
`;
