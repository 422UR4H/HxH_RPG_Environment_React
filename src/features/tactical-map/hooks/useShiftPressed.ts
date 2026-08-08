import { useEffect, useState } from "react";

// Is Shift held right now? Both BgHandles and GridHandles need it: Shift
// switches what a handle drag means (free resize on the bg, perspective/skew
// on the grid) and drives the affordance — border color, marker size — before
// any drag starts. Extracted from the two identical copies per Fase 4 task 3.
export function useShiftPressed(): boolean {
  const [shiftPressed, setShiftPressed] = useState(false);
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { if (e.key === "Shift") setShiftPressed(true); };
    const onUp = (e: KeyboardEvent) => { if (e.key === "Shift") setShiftPressed(false); };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);
  return shiftPressed;
}
