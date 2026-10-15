import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import { Assets, ImageSource, Texture } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import type { TacticalMap } from "../../../types/tacticalMap";

export default function BgLayer({
  bg,
  bgInteractive,
  vpRef,
  onBgPointerDown,
  onLoadingChange,
  onError,
  retryKey = 0,
}: {
  bg: TacticalMap["bg"];
  bgInteractive?: boolean;
  vpRef?: MutableRefObject<Viewport | null>;
  onBgPointerDown?: (startWorldX: number, startWorldY: number, startBgX: number, startBgY: number) => void;
  onLoadingChange?: (loading: boolean) => void;
  // Chamado quando a imagem não carrega. O fundo é só experiência: quem chama decide o aviso.
  onError?: () => void;
  // Mudar o valor força uma nova tentativa de carga da mesma URL.
  retryKey?: number;
}) {
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    if (!bg?.url) {
      setTexture(null);
      onLoadingChange?.(false);
      return;
    }
    onLoadingChange?.(true);
    let cancelled = false;
    if (bg.url.startsWith("blob:")) {
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        setTexture(new Texture({ source: new ImageSource({ resource: img }) }));
        onLoadingChange?.(false);
      };
      img.onerror = () => {
        if (!cancelled) { setTexture(null); onLoadingChange?.(false); onError?.(); }
      };
      img.src = bg.url;
    } else {
      Assets.load(bg.url)
        .then((t: Texture) => {
          if (!cancelled) { setTexture(t); onLoadingChange?.(false); }
        })
        // O Loader do Pixi 8 apaga a promessa rejeitada do promiseCache (e o Cache só
        // guarda sucesso), então um novo Assets.load da mesma URL busca de novo.
        .catch(() => {
          if (!cancelled) { setTexture(null); onLoadingChange?.(false); onError?.(); }
        });
    }
    return () => { cancelled = true; };
  }, [bg?.url, onLoadingChange, onError, retryKey]);

  if (!bg || !texture) return null;

  const handlePointerDown = (e: FederatedPointerEvent) => {
    if (!bgInteractive || !vpRef?.current) return;
    e.stopPropagation();
    const world = vpRef.current.toWorld(e.global.x, e.global.y);
    onBgPointerDown?.(world.x, world.y, bg.x, bg.y);
  };

  return (
    <pixiSprite
      texture={texture}
      anchor={0.5}
      x={bg.x + bg.width / 2}
      y={bg.y + bg.height / 2}
      width={bg.width}
      height={bg.height}
      rotation={(bg.rotation * Math.PI) / 180}
      alpha={bg.opacity}
      eventMode={bgInteractive ? "static" : "none"}
      cursor={bgInteractive ? "grab" : "default"}
      onPointerDown={handlePointerDown}
    />
  );
}
