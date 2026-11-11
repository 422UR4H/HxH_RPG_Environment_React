import { useEffect, useRef } from "react";
import type { ChangeEvent, CompositionEvent } from "react";

/**
 * Limite de caracteres que se comporta como o `maxLength` nativo, mas contando code points
 * (um emoji vale 1). Quando a edição passaria de `max`, o texto anterior fica intacto e entra
 * só o trecho novo que cabe, na posição do cursor.
 *
 * O ponto da inserção vem da seleção do campo (`hint`, em code points), não de um palpite por
 * prefixo/sufixo comum, que erra com letras repetidas. Sem `hint`, cai no palpite.
 * `caret` é a posição (UTF-16, como `selectionStart`) logo depois do trecho inserido.
 */
export interface SelectionHint {
  /** Início da seleção antes da edição (onde a inserção começou). */
  selStart?: number;
  /** Fim do trecho inserido em `next` (a seleção depois da edição). */
  caretEnd?: number;
}

export function limitInsertion(
  prev: string,
  next: string,
  max: number,
  hint: SelectionHint = {},
): { value: string; caret: number } {
  const p = [...prev];
  const n = [...next];
  if (n.length <= max) {
    // Cabe: nada a cortar; o cursor fica onde o navegador o pôs (fim do trecho inserido).
    return { value: next, caret: -1 };
  }
  let suf: number;
  if (hint.caretEnd !== undefined) {
    suf = Math.min(n.length - hint.caretEnd, p.length);
  } else {
    suf = 0;
    let pre0 = 0;
    while (pre0 < p.length && pre0 < n.length && p[pre0] === n[pre0]) pre0++;
    while (
      suf < p.length - pre0 &&
      suf < n.length - pre0 &&
      p[p.length - 1 - suf] === n[n.length - 1 - suf]
    ) {
      suf++;
    }
  }
  let pre: number;
  if (hint.selStart !== undefined) {
    pre = Math.min(hint.selStart, p.length - suf, n.length - suf);
  } else {
    pre = 0;
    while (pre < p.length - suf && pre < n.length - suf && p[pre] === n[pre]) pre++;
  }
  const inserted = n.slice(pre, n.length - suf);
  const removedLen = p.length - pre - suf;
  const room = Math.max(0, max - (p.length - removedLen));
  const kept = inserted.slice(0, room);
  const prefix = n.slice(0, pre).join("");
  const value = prefix + kept.join("") + n.slice(n.length - suf).join("");
  return { value, caret: (prefix + kept.join("")).length };
}

type TextEl = HTMLInputElement | HTMLTextAreaElement;

interface Snapshot {
  value: string;
  selStart: number; // em code points
}

const cpIndex = (s: string, utf16: number) => [...s.slice(0, utf16)].length;

function snapshotOf(el: TextEl): Snapshot | null {
  try {
    if (el.selectionStart === null) return null;
    return { value: el.value, selStart: cpIndex(el.value, el.selectionStart) };
  } catch {
    return null; // tipos de input sem seleção (e-mail)
  }
}

// Seleção antes de cada edição, tirada do `beforeinput` nativo (digitar, colar, apagar).
const beforeEdit = new WeakMap<TextEl, Snapshot>();
if (typeof document !== "undefined") {
  document.addEventListener(
    "beforeinput",
    (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return;
      const snap = snapshotOf(t);
      if (snap) beforeEdit.set(t, snap);
    },
    true,
  );
}

// Valor e seleção no início de uma composição de IME: o corte do fim compara com eles.
const compositionStart = new WeakMap<TextEl, Snapshot>();

export function markCompositionStart(el: TextEl): void {
  const snap = snapshotOf(el);
  if (snap) compositionStart.set(el, snap);
}

type Phase = "change" | "composing" | "end";

/** Agenda quadros de animação e cancela os pendentes quando o componente desmonta. */
export interface FrameBag {
  schedule(fn: () => void): void;
}

export function useFrameBag(): FrameBag {
  const ids = useRef(new Set<number>());
  useEffect(() => {
    const pending = ids.current;
    return () => {
      pending.forEach((id) => cancelAnimationFrame(id));
      pending.clear();
    };
  }, []);
  const bag = useRef<FrameBag>({
    schedule(fn) {
      const id = requestAnimationFrame(() => {
        ids.current.delete(id);
        fn();
      });
      ids.current.add(id);
    },
  });
  return bag.current;
}

function setCaret(el: TextEl, caret: number): void {
  try {
    el.setSelectionRange(caret, caret);
  } catch {
    // tipos de input sem seleção (e-mail): sem cursor a restaurar
  }
}

/**
 * Valor final de um campo limitado. Durante uma composição de IME não corta (quebraria a
 * composição); o corte é aplicado no `compositionend`. Se cortou, escreve o valor e o cursor no
 * DOM na hora (o React, ao receber o mesmo valor no estado, não reescreve o campo). Só o fim da
 * composição reaplica o cursor num quadro depois, porque o Chrome o move após o `compositionend`.
 */
export function limitedValue(
  el: TextEl,
  prev: string,
  max: number,
  phase: Phase,
  frames?: FrameBag,
): string {
  const next = el.value;
  if (phase === "composing") return next;
  let snap: Snapshot | undefined;
  if (phase === "end") {
    snap = compositionStart.get(el);
    compositionStart.delete(el);
  } else {
    snap = beforeEdit.get(el);
    beforeEdit.delete(el);
    if (snap && snap.value !== prev) snap = undefined;
  }
  const base = snap?.value ?? prev;
  let caretEnd: number | undefined;
  try {
    if (el.selectionEnd !== null) caretEnd = cpIndex(next, el.selectionEnd);
  } catch {
    caretEnd = undefined;
  }
  const r = limitInsertion(base, next, max, { selStart: snap?.selStart, caretEnd });
  if (r.value !== next) {
    el.value = r.value;
    setCaret(el, r.caret);
    if (phase === "end") {
      frames?.schedule(() => {
        if (document.activeElement !== el || el.value !== r.value) return;
        setCaret(el, r.caret);
      });
    }
  }
  return r.value;
}

function phaseOf(e: ChangeEvent<TextEl>): Phase {
  return (e.nativeEvent as InputEvent | undefined)?.isComposing ? "composing" : "change";
}

/**
 * Props de um campo controlado com limite em code points: onChange + onCompositionStart/End.
 * `commit` recebe o valor já limitado (e o evento, para quem precisa dele).
 */
export function useLimitedInput<E extends TextEl>(
  max: number,
  value: string,
  commit: (value: string, e: ChangeEvent<E> | CompositionEvent<E>) => void,
) {
  const frames = useFrameBag();
  return {
    onChange: (e: ChangeEvent<E>) =>
      commit(limitedValue(e.currentTarget, value, max, phaseOf(e), frames), e),
    onCompositionStart: (e: CompositionEvent<E>) => markCompositionStart(e.currentTarget),
    onCompositionEnd: (e: CompositionEvent<E>) =>
      commit(limitedValue(e.currentTarget, value, max, "end", frames), e),
  };
}
