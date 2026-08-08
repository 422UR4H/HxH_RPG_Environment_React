import type { Viewport } from "pixi-viewport";
import type { EventSystem, FederatedPointerEvent } from "pixi.js";

declare module "react" {
  // Augmentação de JSX.IntrinsicElements para o elemento customizado <pixiViewport>;
  // não há forma de declarar isso sem namespace.
  // eslint-disable-next-line @typescript-eslint/no-namespace -- ver comentário acima
  namespace JSX {
    interface IntrinsicElements {
      pixiViewport: {
        ref?: React.Ref<Viewport>;
        screenWidth?: number;
        screenHeight?: number;
        worldWidth?: number;
        worldHeight?: number;
        events?: EventSystem;
        eventMode?: string;
        onPointerDown?: (e: FederatedPointerEvent) => void;
        children?: React.ReactNode;
      };
    }
  }
}
