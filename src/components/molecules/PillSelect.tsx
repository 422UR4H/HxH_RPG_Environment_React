import {
  Fragment,
  type CSSProperties,
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { camelCaseSegments } from "../../utils/camelCaseSegments";
import AttachedList from "./AttachedList";
import { useAttachedList } from "./useAttachedList";
import { Check, Label, Option, Sizer, Trigger, Value } from "./PillSelect.styles";

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
  /** Texto da pílula fechada enquanto o valor não casa com nenhuma opção. */
  placeholder?: string;
  /** O nome acessível vem de `aria-label` ou `aria-labelledby`: `<label htmlFor>` não funciona num `div` combobox. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
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
  placeholder,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: PillSelectProps) {
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const list = useAttachedList<HTMLDivElement>({
    rowSelector: '[role="option"]',
    remeasureKey: options,
    onClose: () => setActiveIndex(-1),
  });
  const { open, mounted, placement, side, state, listId, anchorName, triggerRef } = list;
  const typed = useRef({ text: "", timer: 0 });

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex];
  const optionId = (i: number) => `${listId}-option-${i}`;

  // A barra de rolagem da lista come a coluna do ✓, não o texto: mede e compensa.
  useLayoutEffect(() => {
    const el = list.listRef.current;
    if (!el || !placement) return;
    const border = parseFloat(placement.vars["--pill-border-width"]) || 0;
    const bar = Math.max(0, el.offsetWidth - el.clientWidth - 2 * border);
    setScrollbarWidth((prev) => (prev === bar ? prev : bar));
  }, [placement, list.listRef]);

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
    list.openList();
    setActiveIndex(index);
  }

  const closeList = list.closeList;

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
        <Value>{selected?.label ?? placeholder ?? ""}</Value>
        {options.map((o) => (
          <Sizer key={o.value} data-label={o.label} aria-hidden="true" />
        ))}
        {placeholder && <Sizer data-label={placeholder} aria-hidden="true" />}
      </Trigger>
      <AttachedList
        list={list}
        role="listbox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        style={{ "--list-scrollbar": `${scrollbarWidth}px` } as CSSProperties}
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
      </AttachedList>
    </>
  );
}
