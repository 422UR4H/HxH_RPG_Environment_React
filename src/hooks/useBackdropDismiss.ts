import { useRef } from "react";
import type { MouseEvent } from "react";

interface BackdropDismissHandlers {
  onMouseDown: (e: MouseEvent<HTMLElement>) => void;
  onMouseUp: (e: MouseEvent<HTMLElement>) => void;
}

export function useBackdropDismiss(onDismiss: () => void): BackdropDismissHandlers {
  const armed = useRef(false);

  const onMouseDown = (e: MouseEvent<HTMLElement>) => {
    armed.current = e.button === 0 && e.target === e.currentTarget;
  };

  const onMouseUp = (e: MouseEvent<HTMLElement>) => {
    if (e.button === 0 && armed.current && e.target === e.currentTarget) {
      onDismiss();
    }
    armed.current = false;
  };

  return { onMouseDown, onMouseUp };
}
