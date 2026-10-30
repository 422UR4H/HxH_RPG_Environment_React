import {
  Fragment,
  type CSSProperties,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { computeAttachedListPlacement } from "../../utils/popoverPlacement";
import { camelCaseSegments } from "../../utils/camelCaseSegments";
import { useClosingFallback } from "../../hooks/useClosingFallback";
import { prefersReducedMotion } from "../../utils/prefersReducedMotion";
import {
  Check,
  Label,
  List,
  Option,
  PILL_SELECT_DURATION_MS,
  Sizer,
  Trigger,
  Value,
} from "./PillSelect.styles";

export interface PillSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface PillSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: PillSelectOption[];
  /** Estilo da pílula fechada: `styled(PillSelect)`. */
  className?: string;
  id?: string;
  disabled?: boolean;
  /** O nome acessível vem de `aria-label` ou `aria-labelledby`: `<label htmlFor>` não funciona num `div` combobox. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

interface Placement {
  side: "below" | "above";
  /** Embaixo a lista é presa pelo topo; em cima, pela base (`bottom`). */
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  height: number;
  vars: Record<string, string>;
}

const PAGE_STEP = 10;
const TYPEAHEAD_RESET_MS = 500;
// Folga sobre a animação: se o animationend não vier (aba oculta, estilo cortado), a lista desmonta mesmo assim.
const CLOSE_SAFETY_MS = PILL_SELECT_DURATION_MS + 100;

// Os cantos do lado da lista leem 0 enquanto abertos; vale o maior dos dois lados.
function largestRadius(a: string, b: string) {
  const pa = parseFloat(a);
  const pb = parseFloat(b);
  if (!a.endsWith("px") || !b.endsWith("px")) return a;
  return `${Math.max(pa, pb)}px`;
}

/**
 * Select-only combobox (padrão WAI-ARIA APG): o foco fica no gatilho e a lista, num portal,
 * continua a pílula — mesma largura, bordas e cantos —, abrindo para baixo ou para cima
 * conforme o espaço. Fechado, ocupa a largura da opção mais longa, como o `<select>` nativo.
 */
export default function PillSelect({
  value,
  onChange,
  options,
  className,
  id,
  disabled,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: PillSelectProps) {
  const [open, setOpen] = useState(false);
  // Fechando: a lista continua montada até a animação de saída terminar.
  const [closing, setClosing] = useState(false);
  // Recolhida: a pílula leva um instante para voltar a arredondar (a lista já se foi).
  const [settling, setSettling] = useState(false);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", timer: 0 });
  const closeRef = useRef<() => void>(() => {});
  // Lado escolhido ao abrir: rolar/redimensionar com a lista aberta não o troca (piscava perto da borda).
  const sideRef = useRef<"below" | "above" | undefined>(undefined);
  const listId = useId();
  // <dashed-ident> único por instância: o useId do React traz ":" (inválido em ident CSS).
  const anchorName = `--pill-${listId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const mounted = open || closing;

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex];
  const optionId = (i: number) => `${listId}-option-${i}`;

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
      const border = parseFloat(cs.borderTopWidth) || 0;
      const natural = list.scrollHeight + (list.offsetHeight - list.clientHeight);
      // A lista sobe sobre a borda da pílula, para as laterais brancas seguirem contínuas.
      const { side, top, bottom, height } = computeAttachedListPlacement({
        field: { top: rect.top + border, bottom: rect.bottom - border },
        listHeight: natural,
        viewportHeight: window.innerHeight,
        side: sideRef.current,
      });
      // Não cabe nem uma opção do lado escolhido: fechar, em vez de ficar aberta com altura 0.
      const rowHeight = list.querySelector<HTMLElement>('[role="option"]')?.offsetHeight || 44;
      if (height < Math.min(rowHeight, natural)) {
        closeRef.current();
        return;
      }
      sideRef.current = side;
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
        "--pill-radius": largestRadius(cs.borderTopLeftRadius, cs.borderBottomLeftRadius),
      };
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
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, { capture: true });
    };
  }, [mounted, open, options]);

  // A barra de rolagem da lista come a coluna do ✓, não o texto: mede e compensa.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !placement) return;
    const border = parseFloat(placement.vars["--pill-border-width"]) || 0;
    const bar = Math.max(0, list.offsetWidth - list.clientWidth - 2 * border);
    setScrollbarWidth((prev) => (prev === bar ? prev : bar));
  }, [placement]);

  // Clique fora fecha sem mudar nada.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !listRef.current?.contains(target)
      ) {
        closeList();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const t = typed.current;
    return () => window.clearTimeout(t.timer);
  }, []);

  // Mantém a opção ativa visível quando a lista rola.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(optionId(activeIndex))?.scrollIntoView?.({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex, placement]);

  const isEnabled = (i: number) => i >= 0 && i < options.length && !options[i].disabled;

  function firstEnabled() {
    return options.findIndex((o) => !o.disabled);
  }
  function lastEnabled() {
    for (let i = options.length - 1; i >= 0; i--) if (isEnabled(i)) return i;
    return -1;
  }
  // Anda `steps` opções habilitadas na direção `dir`, parando na ponta (sem dar a volta).
  function move(from: number, dir: 1 | -1, steps = 1) {
    let current = from;
    for (let i = from + dir, left = steps; i >= 0 && i < options.length && left > 0; i += dir) {
      if (isEnabled(i)) {
        current = i;
        left--;
      }
    }
    return current;
  }

  const finishClosing = useCallback(() => {
    sideRef.current = undefined;
    setClosing(false);
    setPlacement(null);
    if (!prefersReducedMotion()) setSettling(true);
  }, []);

  useClosingFallback(closing, finishClosing, CLOSE_SAFETY_MS);

  useEffect(() => {
    if (!settling) return;
    const t = window.setTimeout(() => setSettling(false), PILL_SELECT_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [settling]);

  function openList(index: number) {
    sideRef.current = undefined;
    setSettling(false);
    setClosing(false);
    setOpen(true);
    setActiveIndex(index);
  }

  function closeList() {
    if (!open) return;
    setOpen(false);
    const animate = !prefersReducedMotion();
    setClosing(animate);
    if (!animate) setPlacement(null);
    setActiveIndex(-1);
  }

  function commit(index: number) {
    if (isEnabled(index) && options[index].value !== value) {
      onChange(options[index].value);
    }
    closeList();
  }

  function findByTyping(char: string, from: number) {
    const t = typed.current;
    window.clearTimeout(t.timer);
    t.text += char.toLowerCase();
    t.timer = window.setTimeout(() => (t.text = ""), TYPEAHEAD_RESET_MS);
    // Letra repetida percorre as opções que começam com ela; senão, procura o prefixo todo.
    const repeated = [...t.text].every((c) => c === t.text[0]);
    const needle = repeated ? t.text[0] : t.text;
    const start = repeated ? from + 1 : Math.max(from, 0);
    for (let n = 0; n < options.length; n++) {
      const i = (start + n) % options.length;
      if (isEnabled(i) && options[i].label.toLowerCase().startsWith(needle)) return i;
    }
    return -1;
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const { key } = e;

    if (key === "Tab") {
      // Escolhe a ativa e deixa o foco seguir.
      if (open) commit(activeIndex);
      return;
    }

    if (e.ctrlKey || e.metaKey) return;

    const isChar = key.length === 1 && !e.altKey && (key !== " " || typed.current.text !== "");
    if (isChar) {
      e.preventDefault();
      const found = findByTyping(key, open ? activeIndex : selectedIndex);
      if (found < 0) return;
      if (open) setActiveIndex(found);
      else openList(found);
      return;
    }

    if (!open) {
      const opens =
        key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === " ";
      if (opens) {
        e.preventDefault();
        openList(isEnabled(selectedIndex) ? selectedIndex : firstEnabled());
      } else if (key === "Home") {
        e.preventDefault();
        openList(firstEnabled());
      } else if (key === "End") {
        e.preventDefault();
        openList(lastEnabled());
      }
      return;
    }

    switch (key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex(activeIndex < 0 ? firstEnabled() : move(activeIndex, 1));
        break;
      case "ArrowUp":
        if (e.altKey) {
          e.preventDefault();
          commit(activeIndex);
        } else {
          e.preventDefault();
          setActiveIndex(activeIndex < 0 ? lastEnabled() : move(activeIndex, -1));
        }
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(firstEnabled());
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(lastEnabled());
        break;
      case "PageDown":
        e.preventDefault();
        setActiveIndex(move(activeIndex < 0 ? -1 : activeIndex, 1, PAGE_STEP));
        break;
      case "PageUp":
        e.preventDefault();
        setActiveIndex(move(activeIndex < 0 ? options.length : activeIndex, -1, PAGE_STEP));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(activeIndex);
        break;
      case "Escape":
        // Não deixa o Esc fechar também o modal/gaveta que contém o campo.
        e.preventDefault();
        e.stopPropagation();
        closeList();
        break;
    }
  }

  closeRef.current = closeList;

  const side = placement?.side ?? "below";
  const state = open ? "open" : closing ? "closing" : settling ? "settling" : "closed";

  return (
    <>
      <Trigger
        ref={triggerRef}
        id={id}
        className={className}
        $side={side}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={mounted ? listId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-disabled={disabled || undefined}
        data-state={state}
        style={{ "--pill-anchor": anchorName } as CSSProperties}
        onClick={() => {
          if (disabled) return;
          if (open) closeList();
          else openList(isEnabled(selectedIndex) ? selectedIndex : firstEnabled());
        }}
        onKeyDown={handleKeyDown}
        onBlur={closeList}
      >
        <Value>{selected?.label ?? ""}</Value>
        {options.map((o) => (
          <Sizer key={o.value} data-label={o.label} aria-hidden="true" />
        ))}
      </Trigger>
      {mounted &&
        createPortal(
          <List
            ref={listRef}
            id={listId}
            role="listbox"
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
                "--pill-anchor": anchorName,
                "--list-scrollbar": `${scrollbarWidth}px`,
                // Geometria do JS: só vale sem anchor positioning (ver PillSelect.styles). Com
                // âncora, o navegador cola a lista à pílula; o JS decide apenas lado e altura.
                // Em cima só `bottom`: `top` fica sem valor para a lista curta não descolar da pílula.
                "--fallback-top": placement?.top !== undefined ? `${placement.top}px` : placement ? "auto" : "0px",
                "--fallback-bottom": placement?.bottom !== undefined ? `${placement.bottom}px` : "auto",
                "--fallback-left": `${placement?.left ?? 0}px`,
                "--fallback-width": placement?.width !== undefined ? `${placement.width}px` : "auto",
                maxHeight: placement?.height,
              } as CSSProperties
            }
            // Mantém o foco no gatilho ao clicar na lista.
            onMouseDown={(e) => e.preventDefault()}
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget && closing) finishClosing();
            }}
            // Eventos da lista (portal) não sobem pelos ancestrais React do campo (ex.: card clicável).
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            {options.map((o, i) => (
              <Option
                key={o.value}
                id={optionId(i)}
                role="option"
                aria-selected={i === selectedIndex}
                aria-disabled={o.disabled || undefined}
                data-active={open && i === activeIndex}
                onMouseMove={() => {
                  if (!o.disabled && i !== activeIndex) setActiveIndex(i);
                }}
                onClick={() => {
                  if (!o.disabled) commit(i);
                }}
              >
                <Label>
                  {camelCaseSegments(o.label).map((part, n) => (
                    <Fragment key={n}>
                      {n > 0 && <wbr />}
                      {part}
                    </Fragment>
                  ))}
                </Label>
                {i === selectedIndex && <Check aria-hidden="true">✓</Check>}
              </Option>
            ))}
          </List>,
          document.body,
        )}
    </>
  );
}
