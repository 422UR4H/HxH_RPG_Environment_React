// O que as duas telas põem ao lado das peças — um lugar só, para não divergirem: os botões de
// reação (abaixo da peça) e os balões (acima).
import useMediaQuery from "../../../hooks/useMediaQuery";
import { breakpoints } from "../../../styles/breakpoints";
import type { PieceAnchoredItem } from "./PieceAnchoredLayer";
import ReactionButtons from "./ReactionButtons";
import ActionBalloon from "./ActionBalloon";
import type { BalloonLine } from "./ActionBalloon";
import type { TableBalloon } from "./useGameTable";
import type { useReactionControls } from "./useReactionControls";

type Controls = Pick<ReturnType<typeof useReactionControls>, "targets" | "quick" | "configure">;

/**
 * Os botões de reação ao lado da peça de cada alvo meu (abaixo dela: acima fica o balão).
 * Alvo sem peça visível fica só no painel. O nome aparece quando há mais de um alvo.
 * Só enquanto dá para reagir: o andamento depois do envio ("Enviando…", "aguardando o
 * mestre") é texto de painel — no mapa ele só cobriria as peças vizinhas.
 */
export function reactionAnchoredItems(controls: Controls, nameOf: (id: string) => string): PieceAnchoredItem[] {
  return controls.targets.filter((t) => t.status === "available").map((t) => ({
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

/**
 * Os balões de mecânica e de resultado, acima da peça — um por personagem. O ator que ataca a
 * si mesmo tem o resultado de alvo e o de ator: as duas frases vão no mesmo balão, na ordem de
 * chegada, em vez de dois balões um em cima do outro na mesma âncora.
 */
export function balloonAnchoredItems(balloons: TableBalloon[]): PieceAnchoredItem[] {
  const linesByCharacter = new Map<string, BalloonLine[]>();
  for (const b of balloons) {
    const lines = linesByCharacter.get(b.characterId) ?? [];
    lines.push({ text: b.text, tone: b.tone });
    linesByCharacter.set(b.characterId, lines);
  }
  return [...linesByCharacter].map(([characterId, lines]) => ({
    key: `balloon-${characterId}`,
    characterId,
    placement: "above",
    node: <ActionBalloon lines={lines} />,
  }));
}

/**
 * Tudo que as duas telas põem ao lado das peças, num lugar só. No celular (abaixo do
 * `tabletUp`) os botões de reação não vão para o mapa: o painel ("Você é alvo" / "Reagir pelo
 * NPC") já os mostra logo abaixo do mapa, e na tela estreita eles quebram em várias linhas e
 * cobrem o mapa. Os balões ficam — são só leitura e curtos.
 */
export function useCombatAnchoredItems(
  controls: Controls,
  nameOf: (id: string) => string,
  balloons: TableBalloon[],
): PieceAnchoredItem[] {
  const isPhone = useMediaQuery(`(max-width: ${breakpoints.tabletUp - 1}px)`);
  return [
    ...(isPhone ? [] : reactionAnchoredItems(controls, nameOf)),
    ...balloonAnchoredItems(balloons),
  ];
}
