import {
  type CSSProperties,
  type KeyboardEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { computeAttachedListPlacement } from "../../utils/popoverPlacement";
import { prefersReducedMotion } from "../../utils/prefersReducedMotion";
import { Check, List, Option, Sizer, Trigger, Value } from "./PillSelect.styles";

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
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

interface Placement {
  side: "below" | "above";
  top: number;
  left: number;
  width: number;
  height: number;
  vars: Record<string, string>;
}

const PAGE_STEP = 10;
const TYPEAHEAD_RESET_MS = 500;

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
  const [activeIndex, setActiveIndex] = useState(-1);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", timer: 0 });
  const listId = useId();
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
      const natural = list.scrollHeight + (list.offsetHeight - list.clientHeight);
      const { side, top, height } = computeAttachedListPlacement({
        field: rect,
        listHeight: natural,
        viewportHeight: window.innerHeight,
      });
      const vars: Record<string, string> = {
        "--pill-bg": cs.backgroundColor,
        "--pill-fg": cs.color,
        "--pill-font-family": cs.fontFamily,
        "--pill-font-size": cs.fontSize,
        "--pill-font-weight": cs.fontWeight,
        "--pill-border-width": cs.borderTopWidth,
        "--pill-padding-left": cs.paddingLeft,
        "--pill-padding-right": cs.paddingRight,
        // Os cantos do lado da lista ficam retos enquanto aberto; lê-se o do lado oposto.
        "--pill-radius":
          side === "below" ? cs.borderTopLeftRadius : cs.borderBottomLeftRadius,
      };
      setPlacement((prev) =>
        prev &&
        prev.side === side &&
        prev.top === top &&
        prev.left === rect.left &&
        prev.width === rect.width &&
        prev.height === height &&
        Object.keys(vars).every((k) => prev.vars[k] === vars[k])
          ? prev
          : { side, top, left: rect.left, width: rect.width, height, vars },
      );
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, { capture: true });
    };
  }, [mounted, options]);

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

  function openList(index: number) {
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

  const side = placement?.side ?? "below";
  const state = open ? "open" : closing ? "closing" : "closed";

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
                top: placement?.top ?? 0,
                left: placement?.left ?? 0,
                width: placement?.width,
                maxHeight: placement?.height,
              } as CSSProperties
            }
            // Mantém o foco no gatilho ao clicar na lista.
            onMouseDown={(e) => e.preventDefault()}
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget && closing) {
                setClosing(false);
                setPlacement(null);
              }
            }}
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
                {o.label}
                {i === selectedIndex && <Check aria-hidden="true">✓</Check>}
              </Option>
            ))}
          </List>,
          document.body,
        )}
    </>
  );
}
