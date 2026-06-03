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
    const el = ref.current;

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(el);

    // Fallback for cases where ResizeObserver misses the notification
    // (e.g. DevTools open/close changes viewport but not element contentRect).
    const onWindowResize = () => {
      const { width, height } = el.getBoundingClientRect();
      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
    };
    window.addEventListener("resize", onWindowResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWindowResize);
    };
  }, [ref]);
  return size;
}
