import type { ChangeEvent, CompositionEvent } from "react";

/**
 * Limite de caracteres que se comporta como o `maxLength` nativo, mas contando code points
 * (um emoji vale 1). Quando a edição passaria de `max`, o texto anterior fica intacto e entra
 * só o trecho novo que cabe, na posição do cursor.
 * `caret` é a posição (em unidades UTF-16, como `selectionStart`) logo depois do trecho inserido.
 */
export function limitInsertion(
  prev: string,
  next: string,
  max: number,
): { value: string; caret: number } {
  const p = [...prev];
  const n = [...next];
  if (n.length <= max) {
    // Cabe: nada a cortar; o cursor fica onde o navegador o pôs (fim do trecho inserido).
    return { value: next, caret: -1 };
  }
  let pre = 0;
  while (pre < p.length && pre < n.length && p[pre] === n[pre]) pre++;
  let suf = 0;
  while (
    suf < p.length - pre &&
    suf < n.length - pre &&
    p[p.length - 1 - suf] === n[n.length - 1 - suf]
  ) {
    suf++;
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

// Valor do campo no início de uma composição de IME: o corte do fim da composição compara com ele.
const compositionStart = new WeakMap<TextEl, string>();

export function markCompositionStart(el: TextEl): void {
  compositionStart.set(el, el.value);
}

type Phase = "change" | "composing" | "end";

/**
 * Valor final de um campo limitado. Durante uma composição de IME não corta (quebraria a
 * composição); o corte é aplicado no `compositionend`. Se cortou, devolve o cursor ao ponto certo
 * depois que o React reescrever o valor controlado.
 */
export function limitedValue(el: TextEl, prev: string, max: number, phase: Phase): string {
  const next = el.value;
  if (phase === "composing") return next;
  const base = phase === "end" ? (compositionStart.get(el) ?? prev) : prev;
  if (phase === "end") compositionStart.delete(el);
  const r = limitInsertion(base, next, max);
  if (r.value !== next) {
    const caret = r.caret;
    queueMicrotask(() => {
      try {
        el.setSelectionRange?.(caret, caret);
      } catch {
        // tipos de input sem seleção (e-mail): sem cursor a restaurar
      }
    });
  }
  return r.value;
}

function phaseOf(e: ChangeEvent<TextEl>): Phase {
  return (e.nativeEvent as InputEvent | undefined)?.isComposing ? "composing" : "change";
}

/** onChange + onCompositionEnd de um campo controlado com limite em code points. */
export function limitedHandlers<E extends TextEl>(
  max: number,
  prev: string,
  commit: (value: string) => void,
) {
  return {
    onChange: (e: ChangeEvent<E>) => commit(limitedValue(e.currentTarget, prev, max, phaseOf(e))),
    onCompositionStart: (e: CompositionEvent<E>) => markCompositionStart(e.currentTarget),
    onCompositionEnd: (e: CompositionEvent<E>) =>
      commit(limitedValue(e.currentTarget, prev, max, "end")),
  };
}
