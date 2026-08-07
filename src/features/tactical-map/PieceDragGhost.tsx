import type { CSSProperties, RefObject } from "react";
import { createPortal } from "react-dom";
import avatarPlaceholderUrl from "../../assets/placeholder/avatar.png";
import gungiFrameUrl from "../../assets/icons/gungi.svg";

// size = on-screen token diameter (px). The ghost is lifted to 1.2× so it
// reads as "picked up" — slightly larger than the token resting on the board —
// with a large, diffuse shadow offset below for depth (mirrors the old Pixi
// lift). Shadow blur/offset scale with size so it stays proportional at any zoom.
export function ghostStyle(size: number): CSSProperties {
  return {
    position: "fixed",
    pointerEvents: "none",
    zIndex: 9999,
    transform: "translate(-50%, -50%) scale(1.2)",
    width: size,
    height: size,
    filter: `drop-shadow(0 ${Math.round(size * 0.22)}px ${Math.round(size * 0.36)}px rgba(0,0,0,0.55))`,
  };
}

// Floating cursor-follower shown during any piece drag (roster→canvas and
// canvas→roster). Mirrors the Pixi token layering: gungi frame as the base,
// avatar as a 70%-size circle centered on top (matching avatarRadius/tokenRadius
// in PieceSprite). Single visual for the whole drag — no second icon.
export default function PieceDragGhost({ avatarUrl }: { avatarUrl: string | null | undefined }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <img
        src={gungiFrameUrl}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        alt=""
      />
      <img
        src={avatarUrl ?? avatarPlaceholderUrl}
        style={{
          position: "absolute",
          top: "15%",
          left: "15%",
          width: "70%",
          height: "70%",
          objectFit: "cover",
          borderRadius: "50%",
        }}
        alt=""
      />
    </div>
  );
}

// Portal do ghost que segue o cursor. O posicionamento é imperativo (style.left/top
// via ref, ver useRosterDrag) e não por state: um setState por pointermove derrubaria
// o framerate do arraste.
export function PieceDragGhostPortal({
  ghostRef, size, avatarUrl,
}: {
  ghostRef: RefObject<HTMLDivElement | null>;
  size: number;
  avatarUrl: string | null | undefined;
}) {
  return createPortal(
    <div ref={ghostRef} style={ghostStyle(size)}>
      <PieceDragGhost avatarUrl={avatarUrl} />
    </div>,
    document.body,
  );
}
