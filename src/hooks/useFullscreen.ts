import { useCallback, useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

const getActive = () => document.fullscreenElement != null;

/** Sai da tela cheia só se houver uma; recusa do navegador não vira erro. */
export function exitFullscreen() {
  if (document.fullscreenElement == null) return;
  document.exitFullscreen().catch(() => {});
}

/**
 * Tela cheia pela Fullscreen API. `available` some onde ela não existe (iPhone Safari) e no
 * PWA instalado, que já abre em tela cheia — mas se foi a própria API que entrou, o botão
 * continua para o usuário poder sair.
 */
export function useFullscreen() {
  const active = useSyncExternalStore(subscribe, getActive, () => false);

  const alreadyFullscreen =
    typeof window.matchMedia === "function" && window.matchMedia("(display-mode: fullscreen)").matches;
  const available = document.fullscreenEnabled === true && (active || !alreadyFullscreen);

  const toggle = useCallback(() => {
    if (document.fullscreenElement != null) {
      exitFullscreen();
    } else {
      document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
    }
  }, []);

  return { available, active, toggle };
}
