import { useEffect, useRef } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { GridKind } from "../../../types/tacticalMap";
import type { TableEvent } from "./combatReducer";
import type { ScenePayload } from "./combatMessages";
import { describeDeclared, ROUND_MODE_LABELS } from "./combatText";

/** U+2212 MINUS SIGN — não é hífen. */
const MINUS = "−";

const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

const sceneLabel = (s: ScenePayload) =>
  s.briefInitialDescription || (s.category === "battle" ? "batalha" : "interpretação");

type Line = { icon: string; text: string; tone?: "turn" | "hp" | "muted" };

function eventLine(event: TableEvent, nameOf: (id: string) => string, gridKind: GridKind): Line {
  switch (event.kind) {
    case "turn_opened":
      return {
        icon: "▶",
        tone: "turn",
        text: event.mine
          ? `Turno de ${nameOf(event.actorId)} — ${lowerFirst(describeDeclared(event.mine, nameOf, gridKind))}`
          : `Turno de ${nameOf(event.actorId)}`,
      };
    case "turn_closed": {
      const who = event.actorId ? ` de ${nameOf(event.actorId)}` : "";
      const outcomes = (event.resolution?.targets ?? []).map((t) =>
        t.avoided
          ? `${nameOf(t.targetId)} esquivou`
          : t.projectedDamage > 0
            ? `${nameOf(t.targetId)} ${MINUS}${t.projectedDamage}`
            : `${nameOf(t.targetId)} sem dano`,
      );
      return { icon: "■", text: `Fim do turno${who}${outcomes.length ? ` — ${outcomes.join(", ")}` : ""}` };
    }
    case "hp_changed":
      return {
        icon: "♥",
        tone: "hp",
        text: `${nameOf(event.characterId)}: ${event.hp}/${event.maxHp} (${MINUS}${event.damage})`,
      };
    case "round_closed":
      return { icon: "↻", tone: "muted", text: "Fim do round" };
    case "round_mode_changed":
      return { icon: "⇄", tone: "muted", text: `Regime: ${ROUND_MODE_LABELS[event.mode]}` };
    case "scene_changed":
      return { icon: "✦", tone: "muted", text: `Cena: ${sceneLabel(event.scene)}` };
  }
}

/**
 * A aba Histórico da Fase 6: os eventos que o servidor emite, o mais recente embaixo (a
 * rolagem fica presa ao fim). O que ESTE navegador declarou aparece com detalhe; o dos
 * outros, não — a declaração de um jogador nunca é projetada para a mesa.
 */
export default function EventStream({
  events,
  nameOf,
  gridKind,
}: {
  events: TableEvent[];
  nameOf: (characterId: string) => string;
  gridKind: GridKind;
}) {
  const containerRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    // jsdom não tem layout (scrollTo pode nem existir) — o pin-ao-fim só se verifica no browser.
    containerRef.current?.scrollTo?.({ top: containerRef.current?.scrollHeight ?? 0 });
  }, [events]);

  if (events.length === 0) {
    return <Empty>Nada aconteceu ainda. Turnos, dano e trocas de regime aparecem aqui.</Empty>;
  }

  return (
    <Container ref={containerRef}>
      {events.map((event, i) => {
        const line = eventLine(event, nameOf, gridKind);
        return (
          <Row key={`${event.kind}-${event.at}-${i}`} data-testid="event-row" $tone={line.tone}>
            <Icon aria-hidden>{line.icon}</Icon>
            <span>{line.text}</span>
          </Row>
        );
      })}
    </Container>
  );
}

const Container = styled.ol`
  list-style: none;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  height: 100%;
  overflow-y: auto;
  padding: 8px;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 12px;
`;

const Row = styled.li<{ $tone?: Line["tone"] }>`
  display: flex;
  gap: 8px;
  padding: 5px 6px;
  border-radius: 4px;
  line-height: 1.35;
  color: ${({ $tone }) => ($tone === "muted" ? colors.textPlaceholderStrong : colors.textPrimary)};
  background: ${({ $tone }) => ($tone === "turn" ? colors.surfaceInputHover : "transparent")};
`;

const Icon = styled.span`
  width: 12px;
  flex-shrink: 0;
  text-align: center;
  color: ${colors.textPlaceholderStrong};
`;

const Empty = styled.p`
  margin: 0;
  padding: 16px 12px;
  color: ${colors.textPlaceholderStrong};
  font-family: ${fonts.sans};
  font-size: 12px;
  font-style: italic;
`;
