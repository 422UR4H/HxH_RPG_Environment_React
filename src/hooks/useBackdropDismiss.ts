import { useRef } from "react";
import type { MouseEvent } from "react";

interface BackdropDismissHandlers {
  onMouseDown: (e: MouseEvent<HTMLDivElement>) => void;
  onMouseUp: (e: MouseEvent<HTMLDivElement>) => void;
}

export function useBackdropDismiss(onDismiss: () => void): BackdropDismissHandlers {
  const armed = useRef(false);

  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    armed.current = e.target === e.currentTarget;
  };

  const onMouseUp = (e: MouseEvent<HTMLDivElement>) => {
    if (armed.current && e.target === e.currentTarget) {
      onDismiss();
    }
    armed.current = false;
  };

  return { onMouseDown, onMouseUp };
}
