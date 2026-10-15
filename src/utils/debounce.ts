// Trailing debounce: agrupa chamadas rápidas em uma só, disparada após `ms` de inatividade.
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number,
): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Args) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  };
}

// Debounce de rajada para histórico: agrupa chamadas como o `debounce`, mas a
// chamada final leva o PRIMEIRO argumento da primeira chamada da rajada (o
// estado de antes de tudo) e os demais argumentos da última. `flush` dispara a
// rajada pendente na hora (no-op se não houver).
export function debounceBurst<First, Rest extends unknown[]>(
  fn: (first: First, ...rest: Rest) => void,
  ms: number,
  onPending?: (pending: boolean) => void,
): ((first: First, ...rest: Rest) => void) & { flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let first: First;
  let rest: Rest;
  const fire = () => {
    timer = null;
    onPending?.(false);
    fn(first, ...rest);
  };
  const wrapped = (f: First, ...r: Rest) => {
    if (timer === null) {
      first = f;
      onPending?.(true);
    } else clearTimeout(timer);
    rest = r;
    timer = setTimeout(fire, ms);
  };
  wrapped.flush = () => {
    if (timer === null) return;
    clearTimeout(timer);
    fire();
  };
  return wrapped;
}
