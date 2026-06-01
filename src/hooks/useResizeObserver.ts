import { type RefObject, useEffect, useState } from "react";

/**
 * Observes the size of a DOM element via ResizeObserver.
 * The ref must point to an element present in the DOM on first render —
 * if the target is conditionally rendered, the observer will not start.
 */
export function useResizeObserver(ref: RefObject<Element | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
