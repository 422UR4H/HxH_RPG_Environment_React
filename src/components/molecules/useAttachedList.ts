import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { computeAttachedListPlacement } from "../../utils/popoverPlacement";
import { useClosingFallback } from "../../hooks/useClosingFallback";
import { prefersReducedMotion } from "../../utils/prefersReducedMotion";
import { ATTACHED_LIST_DURATION_MS, ATTACHED_ROW_MIN_HEIGHT } from "./AttachedList.styles";

export type AttachedSide = "below" | "above";
export type AttachedState = "open" | "closing" | "settling" | "closed";

export interface AttachedPlacement {
  side: AttachedSide;
  /** Embaixo a lista é presa pelo topo; em cima, pela base (`bottom`). */
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  height: number;
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
   * A lista tem sempre a largura da pílula; com isto, a fonte das linhas (`--attached-row-font-size`)
   * encolhe até a linha mais larga caber: a maior entre `min` e `max` px (e sem passar da fonte da
   * pílula). Calculada ao abrir, no resize e quando o conteúdo muda; rolar nunca a muda. O layout da
   * linha precisa ser todo em `em`, para a largura escalar com a fonte. Sem isto (padrão), nada muda.
   */
  fitRowFont?: { min: number; max: number };
  /**
   * Raio máximo (px) dos cantos externos enquanto aberto: a forma inteira (pílula + lista) usa
   * `min(raio fechado, maxOpenRadius)`. Sem isto (padrão), a lista copia o raio da pílula.
   */
  maxOpenRadius?: number;
}

// Folga sobre a animação: se o animationend não vier (aba oculta, estilo cortado), a lista desmonta mesmo assim.
const CLOSE_SAFETY_MS = ATTACHED_LIST_DURATION_MS + 100;
// A fonte ajustada é arredondada para baixo neste passo (px): nunca passa da largura.
const ROW_FONT_STEP = 0.25;
// Defesa contra a largura do texto não escalar exatamente com a fonte (hinting): no máximo estes
// passos a menos depois da conta.
const ROW_FONT_RETRIES = 3;
export const ROW_FONT_VAR = "--attached-row-font-size";

// Os cantos do lado da lista leem 0 enquanto abertos; vale o maior dos dois lados.
function largestRadius(a: string, b: string) {
  const pa = parseFloat(a);
  const pb = parseFloat(b);
  if (!a.endsWith("px") || !b.endsWith("px")) return a;
  return `${Math.max(pa, pb)}px`;
}

/**
 * O raio que a pílula mostra de fato: o navegador reduz um raio maior que metade do lado a essa
 * metade (o `999px` da pílula vira metade da altura). Medido em px de layout (sem transformação);
 * sem layout (testes), fica o declarado.
 */
function renderedRadius(radius: string, el: HTMLElement) {
  const h = el.offsetHeight;
  const w = el.offsetWidth;
  if (!radius.endsWith("px") || !h || !w) return radius;
  return `${Math.min(parseFloat(radius), h / 2, w / 2)}px`;
}

/** O raio aberto: o fechado, sem passar de `max` px. */
export function capRadius(radius: string, max: number) {
  if (radius.endsWith("px")) return `${Math.min(parseFloat(radius), max)}px`;
  return radius ? `min(${radius}, ${max}px)` : `${max}px`;
}

/**
 * O retângulo da pílula sem a transformação dela. Ao abrir, a pílula pode estar no `:active`
 * (`scale(0.98)`) ou no `:hover` (`translateY(-3px)`); no iOS os dois ficam presos depois do toque.
 * Sem anchor positioning (Safari), a lista usaria esse retângulo encolhido/deslocado até a próxima
 * rolagem. Tira a transformação (e a transição, para valer na hora) só durante a leitura e devolve
 * os valores inline de antes: não há pintura no meio.
 */
function untransformedRect(trigger: HTMLElement) {
  // Sem transformação (o caso comum, e sempre o do PillSelect) não mexe em nada: o estilo inline
  // cortaria uma transição em andamento (ex.: os cantos, ao rolar logo depois de abrir).
  const computed = getComputedStyle(trigger).transform;
  if (!computed || computed === "none") return trigger.getBoundingClientRect();
  const { transform, transition } = trigger.style;
  trigger.style.transition = "none";
  trigger.style.transform = "none";
  const rect = trigger.getBoundingClientRect();
  trigger.style.transform = transform;
  trigger.style.transition = transition;
  return rect;
}

/**
 * A maior fonte das linhas (px) com que a mais larga cabe na lista da largura da pílula. Mede a
 * lista em `max-content` com o visual da pílula já aplicado; como o layout da linha é em `em`, a
 * largura natural é proporcional à fonte: f = f_ref × (largura útil / largura natural em f_ref).
 */
function fitRowFontSize(
  list: HTMLElement,
  pillWidth: number,
  cs: CSSStyleDeclaration,
  { min, max }: { min: number; max: number },
) {
  const ref = Math.min(parseFloat(cs.fontSize) || max, max);
  const border = parseFloat(cs.borderTopWidth) || 0;
  // Fora do conteúdo: as bordas laterais da lista e o recuo da pílula (o mesmo dos itens) dos dois lados.
  const chrome = 2 * border + (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  const room = pillWidth - chrome;
  // Largura natural do conteúdo com a fonte `size` (inline vence a folha só durante a medida).
  const contentAt = (size: number) => {
    list.style.setProperty(ROW_FONT_VAR, `${size}px`);
    list.style.width = "max-content";
    const width = list.getBoundingClientRect().width - chrome;
    list.style.width = "";
    return width;
  };
  const natural = contentAt(ref);
  // Sem layout (jsdom) ou já cabe: a fonte de referência.
  if (pillWidth <= 0 || natural <= room) return ref;
  let size = Math.max(min, Math.floor((ref * room) / natural / ROW_FONT_STEP) * ROW_FONT_STEP);
  for (let i = 0; i < ROW_FONT_RETRIES && size > min && contentAt(size) > room; i++) {
    size = Math.max(min, size - ROW_FONT_STEP);
  }
  return size;
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
  fitRowFont,
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
  // O raio de onde os cantos externos partem ao abrir (o que a pílula fechada mostrava).
  const [closedRadius, setClosedRadius] = useState<string | undefined>(undefined);
  const triggerRef = useRef<T>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<() => void>(() => {});
  const onCloseRef = useRef(onClose);
  // Lado escolhido ao abrir: rolar/redimensionar com a lista aberta não o troca (piscava perto da borda).
  const sideRef = useRef<AttachedSide | undefined>(undefined);
  // Com `fitRowFont`: a fonte calculada fica guardada para a rolagem não recalculá-la.
  const rowFontRef = useRef<number | undefined>(undefined);
  const fitMin = fitRowFont?.min;
  const fitMax = fitRowFont?.max;
  const listId = useId();
  // <dashed-ident> único por instância: o useId do React traz ":" (inválido em ident CSS).
  const anchorName = `--pill-${listId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const mounted = open || closing;

  // Medida e posição: lado/altura vêm de `computeAttachedListPlacement`; o visual da pílula é
  // copiado do gatilho (a lista fica fora do container query onde a pílula calcula `cqi`).
  useLayoutEffect(() => {
    if (!mounted) return;
    function place(e?: Event) {
      const trigger = triggerRef.current;
      const list = listRef.current;
      if (!trigger || !list) return;
      const rect = untransformedRect(trigger);
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
      if (fitMin !== undefined && fitMax !== undefined) {
        // Ao abrir, no resize e quando o conteúdo muda; na rolagem, a fonte que já estava.
        if (rowFontRef.current === undefined || e?.type !== "scroll") {
          rowFontRef.current = fitRowFontSize(list, rect.width, cs, { min: fitMin, max: fitMax });
          watchPendingImages(list);
        }
        vars[ROW_FONT_VAR] = `${rowFontRef.current}px`;
        list.style.setProperty(ROW_FONT_VAR, vars[ROW_FONT_VAR]);
      }
      // A lista tem uma só borda vertical (a do lado da pílula não existe); é a do gatilho, que ela copia.
      const natural = list.scrollHeight + border;
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
        Object.keys(vars).every((k) => prev.vars[k] === vars[k])
          ? prev
          : { side, top, bottom, left: rect.left, width: rect.width, height, vars },
      );
    }
    // Imagem ainda sem carregar (ex.: o "?" na 1ª abertura) mede sem largura: a fonte sairia
    // grande demais e o rótulo quebraria quando ela chegasse. Ao carregar, só a fonte é refeita.
    const pendingImages = new Set<HTMLImageElement>();
    function watchPendingImages(list: HTMLElement) {
      for (const img of list.querySelectorAll("img")) {
        if (img.complete || pendingImages.has(img)) continue;
        pendingImages.add(img);
        img.addEventListener("load", refitRowFont, { once: true });
      }
    }
    function refitRowFont(e: Event) {
      pendingImages.delete(e.currentTarget as HTMLImageElement);
      const trigger = triggerRef.current;
      const list = listRef.current;
      if (!trigger || !list || fitMin === undefined || fitMax === undefined) return;
      const size = fitRowFontSize(list, untransformedRect(trigger).width, getComputedStyle(trigger), {
        min: fitMin,
        max: fitMax,
      });
      rowFontRef.current = size;
      const value = `${size}px`;
      list.style.setProperty(ROW_FONT_VAR, value);
      setPlacement((prev) =>
        prev && prev.vars[ROW_FONT_VAR] !== value ? { ...prev, vars: { ...prev.vars, [ROW_FONT_VAR]: value } } : prev,
      );
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, { capture: true });
      for (const img of pendingImages) img.removeEventListener("load", refitRowFont);
    };
  }, [mounted, open, remeasureKey, rowSelector, fitMin, fitMax, openRadius]);

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
      const closed = renderedRadius(largestRadius(cs.borderTopLeftRadius, cs.borderBottomLeftRadius), trigger);
      setClosedRadius(closed);
      setOpenRadius(capRadius(closed, maxOpenRadius));
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
    openRadius,
    closedRadius,
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
