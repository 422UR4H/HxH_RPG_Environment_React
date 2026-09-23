import { useEffect, useRef } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { TableEvent } from "./combatReducer";

/** U+2212 MINUS SIGN — não é hífen; usado nas linhas de dano ("{nome} −{dano}"). */
const MINUS = "−";

function eventText(event: TableEvent, nameOf: (characterId: string) => string): string {
  switch (event.kind) {
    case "turn_opened":
      return `Turno de ${nameOf(event.actorId)}`;
    case "turn_closed": {
      if (!event.resolution) return "Turno encerrado";
      const perTarget = event.resolution.targets
        .map((t) => `${nameOf(t.targetId)} ${MINUS}${t.projectedDamage}`)
        .join(", ");
      return perTarget ? `Turno encerrado — ${perTarget}` : "Turno encerrado";
    }
    case "round_closed":
      return `Round encerrado (${event.roundMode})`;
    case "round_mode_changed":
      return `Regime: ${event.mode}`;
    case "scene_changed":
      return `Cena: ${event.scene.briefInitialDescription}`;
    case "hp_changed":
      return `${nameOf(event.characterId)} ${MINUS}${event.damage}`;
  }
}

/** Histórico da mesa: mais recente por último, rolagem presa ao fim. */
export default function EventStream({
  events,
  nameOf,
}: {
  events: TableEvent[];
  nameOf: (characterId: string) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // jsdom não tem layout real (scrollHeight fica 0) — a guarda opcional evita quebrar o teste,
    // e o pin-ao-fim em si só é verificável no browser.
    containerRef.current?.scrollTo?.({ top: containerRef.current?.scrollHeight ?? 0 });
  }, [events]);

  return (
    <Container ref={containerRef}>
      {events.map((event, i) => (
        <Row key={`${event.kind}-${event.at}-${i}`} data-testid="event-row">
          {eventText(event, nameOf)}
        </Row>
      ))}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: 100%;
  overflow-y: auto;
  padding: 8px;
  background: ${colors.surfaceSidebar};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 12px;
`;

const Row = styled.div`
  border-bottom: 1px solid ${colors.borderDivider};
  padding-bottom: 2px;
`;
