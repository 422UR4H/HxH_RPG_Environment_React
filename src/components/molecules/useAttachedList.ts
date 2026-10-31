import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { computeAttachedListPlacement } from "../../utils/popoverPlacement";
import { useClosingFallback } from "../../hooks/useClosingFallback";
import { prefersReducedMotion } from "../../utils/prefersReducedMotion";
import { ATTACHED_LIST_DURATION_MS, ATTACHED_ROW_MIN_HEIGHT } from "./AttachedList.styles";

export type AttachedSide = "below" | "above";
export type AttachedState = "open" | "closing" | "settling" | "closed";
/** De que borda da pílula a lista mais larga que ela parte: "start" cresce para a direita. */
export type AttachedAlign = "start" | "end";

export interface AttachedPlacement {
  side: AttachedSide;
  /** Embaixo a lista é presa pelo topo; em cima, pela base (`bottom`). */
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  height: number;
  /** Só com `growToContent`: o lado para onde a lista mais larga que a pílula cresce. */
  align: AttachedAlign;
  vars: Record<string, string>;
}

interface UseAttachedListOptions {
  /** Seletor de uma linha da lista: se nem uma cabe do lado escolhido, a lista fecha. */
  rowSelector: string;
  /** Muda quando o conteúdo da lista muda (ex.: as opções): a lista é medida de novo. */
  remeasureKey?: unknown;
  /** Chamado a cada fechamento, venha de onde vier (clique fora, pílula fora da janela...). */
  onClose?: () => void;
  /**
   * A lista nunca fica mais estreita que o conteúdo: largura = max(pílula, conteúdo), presa à
   * borda esquerda da pílula (ou à direita, se crescer para a direita sair da janela). Sem isto
   * (padrão), a largura é sempre a da pílula.
   */
  growToContent?: boolean;
  /**
   * Raio máximo (px) dos cantos externos enquanto aberto: a forma inteira (pílula + lista) usa
   * `min(raio fechado, maxOpenRadius)`. Sem isto (padrão), a lista copia o raio da pílula.
   */
  maxOpenRadius?: number;
}

// Folga sobre a animação: se o animationend não vier (aba oculta, estilo cortado), a lista desmonta mesmo assim.
const CLOSE_SAFETY_MS = ATTACHED_LIST_DURATION_MS + 100;
// Respiro da lista larga até a borda da janela.
const VIEWPORT_MARGIN = 8;

// Os cantos do lado da lista leem 0 enquanto abertos; vale o maior dos dois lados.
function largestRadius(a: string, b: string) {
  const pa = parseFloat(a);
  const pb = parseFloat(b);
  if (!a.endsWith("px") || !b.endsWith("px")) return a;
  return `${Math.max(pa, pb)}px`;
}

/** O raio aberto: o fechado, sem passar de `max` px. */
export function capRadius(radius: string, max: number) {
  if (radius.endsWith("px")) return `${Math.min(parseFloat(radius), max)}px`;
  return radius ? `min(${radius}, ${max}px)` : `${max}px`;
}

/**
 * A mecânica da lista presa à pílula, comum ao `PillSelect` (escolher um valor) e ao `PillMenu`
 * (menu de ações): estados aberto/fechando/assentando, lado e altura por
 * `computeAttachedListPlacement`, cópia do visual da pílula em variáveis CSS, fechar quando a
 * pílula sai da janela ou nem uma linha cabe, e clique fora. A lista em si é o `AttachedList`.
 */
export function useAttachedList<T extends HTMLElement>({
  rowSelector,
  remeasureKey,
  onClose,
  growToContent = false,
  maxOpenRadius,
}: UseAttachedListOptions) {
  const [open, setOpen] = useState(false);
  // Fechando: a lista continua montada até a animação de saída terminar.
  const [closing, setClosing] = useState(false);
  // Recolhida: a pílula leva um instante para voltar a arredondar (a lista já se foi).
  const [settling, setSettling] = useState(false);
  const [placement, setPlacement] = useState<AttachedPlacement | null>(null);
  // Com `maxOpenRadius`: o raio da forma aberta, medido na pílula ainda fechada (ao abrir).
  const [openRadius, setOpenRadius] = useState<string | undefined>(undefined);
  const triggerRef = useRef<T>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<() => void>(() => {});
  const onCloseRef = useRef(onClose);
  // Lado escolhido ao abrir: rolar/redimensionar com a lista aberta não o troca (piscava perto da borda).
  const sideRef = useRef<AttachedSide | undefined>(undefined);
  const listId = useId();
  // <dashed-ident> único por instância: o useId do React traz ":" (inválido em ident CSS).
  const anchorName = `--pill-${listId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const mounted = open || closing;

  // Medida e posição: lado/altura vêm de `computeAttachedListPlacement`; o visual da pílula é
  // copiado do gatilho (a lista fica fora do container query onde a pílula calcula `cqi`).
  useLayoutEffect(() => {
    if (!mounted) return;
    function place() {
      const trigger = triggerRef.current;
      const list = listRef.current;
      if (!trigger || !list) return;
      const rect = trigger.getBoundingClientRect();
      const cs = getComputedStyle(trigger);
      // Pílula fora da janela: a lista fixa ficaria flutuando sozinha. (Retângulo vazio = sem
      // layout, como no jsdom; não é "fora da janela".)
      const hasLayout = rect.width > 0 || rect.height > 0;
      if (
        hasLayout &&
        (rect.bottom <= 0 ||
          rect.top >= window.innerHeight ||
          rect.right <= 0 ||
          rect.left >= window.innerWidth)
      ) {
        closeRef.current();
        return;
      }
      const vars: Record<string, string> = {
        "--pill-bg": cs.backgroundColor,
        "--pill-fg": cs.color,
        "--pill-font-family": cs.fontFamily,
        "--pill-font-size": cs.fontSize,
        "--pill-font-weight": cs.fontWeight,
        "--pill-border-width": cs.borderTopWidth,
        "--pill-padding-left": cs.paddingLeft,
        "--pill-padding-right": cs.paddingRight,
        // Os cantos do lado da lista ficam retos enquanto aberto (0); o raio é o do outro lado.
        "--pill-radius": openRadius ?? largestRadius(cs.borderTopLeftRadius, cs.borderBottomLeftRadius),
      };
      // A 1ª medição acontece antes de o React aplicar o estilo: sem copiar o visual da pílula (e a
      // largura) já na lista, ela mediria com a fonte do body e sem padding, e a altura sairia errada.
      for (const [k, v] of Object.entries(vars)) list.style.setProperty(k, v);
      list.style.setProperty("--fallback-width", `${rect.width}px`);
      const border = parseFloat(cs.borderTopWidth) || 0;
      let align: AttachedAlign = "start";
      if (growToContent) {
        // Largura natural do conteúdo (inline vence a folha de estilo só durante a medida). Arredonda
        // para cima: o offsetWidth (inteiro) pode perder a fração e quebrar uma palavra no meio.
        list.style.width = "max-content";
        const content = Math.ceil(list.getBoundingClientRect().width);
        list.style.width = "";
        const width = Math.min(Math.max(rect.width, content), window.innerWidth - 2 * VIEWPORT_MARGIN);
        if (rect.left + width > window.innerWidth - VIEWPORT_MARGIN) align = "end";
        const overhang = Math.max(0, width - rect.width);
        vars["--list-width"] = `${width}px`;
        vars["--joint-width"] = `${rect.width}px`;
        vars["--fallback-right"] = `${window.innerWidth - rect.right}px`;
        // O canto que sobra ao lado da pílula arredonda como ela, sem passar do pedaço que sobra.
        vars["--overhang-radius"] = `${Math.min(parseFloat(vars["--pill-radius"]) || 0, overhang)}px`;
        for (const k of ["--list-width", "--joint-width", "--fallback-right", "--overhang-radius"]) {
          list.style.setProperty(k, vars[k]);
        }
      }
      // A lista tem uma só borda vertical (a do lado da pílula não existe); é a do gatilho, que ela copia.
      // Crescendo ao conteúdo, ela tem as duas (a do lado da pílula fica mascarada na junção).
      const natural = list.scrollHeight + (growToContent ? 2 : 1) * border;
      // A lista sobe sobre a borda da pílula, para as laterais brancas seguirem contínuas.
      const { side, top, bottom, height } = computeAttachedListPlacement({
        field: { top: rect.top + border, bottom: rect.bottom - border },
        listHeight: natural,
        viewportHeight: window.innerHeight,
        side: sideRef.current,
      });
      // Não cabe nem uma linha do lado escolhido: fechar, em vez de ficar aberta com altura 0.
      const rowHeight = list.querySelector<HTMLElement>(rowSelector)?.offsetHeight || ATTACHED_ROW_MIN_HEIGHT;
      if (height < Math.min(rowHeight, natural)) {
        closeRef.current();
        return;
      }
      sideRef.current = side;
      setPlacement((prev) =>
        prev &&
        prev.side === side &&
        prev.top === top &&
        prev.bottom === bottom &&
        prev.left === rect.left &&
        prev.width === rect.width &&
        prev.height === height &&
        prev.align === align &&
        Object.keys(vars).every((k) => prev.vars[k] === vars[k])
          ? prev
          : { side, top, bottom, left: rect.left, width: rect.width, height, align, vars },
      );
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, { capture: true });
    };
  }, [mounted, open, remeasureKey, rowSelector, growToContent, openRadius]);

  // Clique fora fecha.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !listRef.current?.contains(target)) {
        closeRef.current();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const finishClosing = useCallback(() => {
    sideRef.current = undefined;
    setClosing(false);
    setPlacement(null);
    if (!prefersReducedMotion()) setSettling(true);
  }, []);

  useClosingFallback(closing, finishClosing, CLOSE_SAFETY_MS);

  useEffect(() => {
    if (!settling) return;
    const t = window.setTimeout(() => setSettling(false), ATTACHED_LIST_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [settling]);

  function openList() {
    sideRef.current = undefined;
    const trigger = triggerRef.current;
    if (maxOpenRadius !== undefined && trigger) {
      // Fechada, a pílula mostra o raio de verdade nos dois lados. (Ainda voltando a arredondar, o
      // raio está entre o aberto e o fechado: o mínimo dá o mesmo.)
      const cs = getComputedStyle(trigger);
      setOpenRadius(capRadius(largestRadius(cs.borderTopLeftRadius, cs.borderBottomLeftRadius), maxOpenRadius));
    }
    setSettling(false);
    setClosing(false);
    setOpen(true);
  }

  function closeList() {
    if (!open) return;
    setOpen(false);
    const animate = !prefersReducedMotion();
    setClosing(animate);
    if (!animate) setPlacement(null);
    onCloseRef.current?.();
  }

  closeRef.current = closeList;
  onCloseRef.current = onClose;

  const state: AttachedState = open ? "open" : closing ? "closing" : settling ? "settling" : "closed";

  return {
    open,
    closing,
    mounted,
    state,
    side: placement?.side ?? "below",
    growToContent,
    openRadius,
    placement,
    listId,
    anchorName,
    triggerRef,
    listRef,
    openList,
    closeList,
    finishClosing,
  };
}

export type AttachedListController = ReturnType<typeof useAttachedList>;
