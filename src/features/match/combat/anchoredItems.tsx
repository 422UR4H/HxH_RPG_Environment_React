// O que as duas telas põem ao lado das peças — um lugar só, para não divergirem: os botões de
// reação (abaixo da peça) e os balões (acima).
import type { PieceAnchoredItem } from "./PieceAnchoredLayer";
import ReactionButtons from "./ReactionButtons";
import ActionBalloon from "./ActionBalloon";
import type { TableBalloon } from "./useGameTable";
import type { useReactionControls } from "./useReactionControls";

type Controls = Pick<ReturnType<typeof useReactionControls>, "targets" | "quick" | "configure">;

/**
 * Os botões de reação ao lado da peça de cada alvo meu (abaixo dela: acima fica o balão).
 * Alvo sem peça visível fica só no painel. O nome aparece quando há mais de um alvo.
 */
export function reactionAnchoredItems(controls: Controls, nameOf: (id: string) => string): PieceAnchoredItem[] {
  return controls.targets.map((t) => ({
    key: `reaction-${t.actorId}`,
    characterId: t.actorId,
    placement: "below",
    node: (
      <ReactionButtons
        compact
        status={t.status}
        name={nameOf(t.actorId)}
        showName={controls.targets.length > 1}
        onQuick={(b) => controls.quick(t.actorId, b)}
        onConfigure={(b) => controls.configure(t.actorId, b)}
      />
    ),
  }));
}

/** Os balões de mecânica e de resultado, acima da peça. */
export function balloonAnchoredItems(balloons: TableBalloon[]): PieceAnchoredItem[] {
  return balloons.map((b, i) => ({
    key: `balloon-${b.characterId}-${i}`,
    characterId: b.characterId,
    placement: "above",
    node: <ActionBalloon text={b.text} tone={b.tone} />,
  }));
}
