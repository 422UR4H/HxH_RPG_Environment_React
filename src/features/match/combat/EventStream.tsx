import { useEffect, useRef } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { GridKind } from "../../../types/tacticalMap";
import type { TableEvent } from "./combatReducer";
import type { ResolutionTarget, SceneCategory } from "./combatMessages";
import type { HistoryMasterAction, HistoryMove, HistoryTurn } from "../../../types/matchHistory";
import type { HistoryRow } from "./historyRows";
import { avoidedVerb, describeDeclared, formatSlot, humanWeapon, interactLabel, ROUND_MODE_LABELS } from "./combatText";

/** U+2212 MINUS SIGN — não é hífen. */
const MINUS = "−";

const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

const sceneLabel = (brief: string, category: SceneCategory) =>
  brief || (category === "battle" ? "batalha" : "interpretação");

/** `details`: o que vai junto da linha — as master actions feitas dentro de um turno. */
type Line = { icon: string; text: string; tone?: "turn" | "hp" | "muted"; details?: string[] };

/** O desfecho de um alvo — o mesmo texto no ao vivo e no REST (W1: verbo por `reaction.kind`,
 * igual a ResolutionDetails via `avoidedVerb`). Uma fuga que falhou diz onde caiu (F14) só
 * quando `landing` veio: a projeção o corta para quem não viu a peça pousar. */
function outcomeText(
  t: Pick<ResolutionTarget, "targetId" | "avoided" | "projectedDamage" | "reaction" | "escape">,
  nameOf: (id: string) => string,
  gridKind: GridKind,
): string {
  if (t.avoided) return `${nameOf(t.targetId)} ${avoidedVerb(t.reaction)}`;
  const hit = t.projectedDamage > 0 ? `${nameOf(t.targetId)} ${MINUS}${t.projectedDamage}` : `${nameOf(t.targetId)} sem dano`;
  const landing = t.escape && !t.escape.escaped ? t.escape.landing : undefined;
  return landing ? `${hit} (caiu em ${formatSlot(landing, gridKind)})` : hit;
}

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
      const outcomes = (event.resolution?.targets ?? []).map((t) => outcomeText(t, nameOf, gridKind));
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
      return { icon: "✦", tone: "muted", text: `Cena: ${sceneLabel(event.scene.briefInitialDescription, event.scene.category)}` };
  }
}

/** Já projetada para quem lê: sem `to`, este leitor só viu a peça sair (ou não viu o destino). */
function masterActionText(ma: HistoryMasterAction, nameOf: (id: string) => string, gridKind: GridKind): string {
  switch (ma.kind) {
    case "movePiece": {
      const { characterId, to } = ma.content;
      return to ? `Mestre moveu ${nameOf(characterId)} para ${formatSlot(to, gridKind)}` : `Mestre moveu ${nameOf(characterId)}`;
    }
    case "placePiece": {
      const { characterId, to } = ma.content;
      return to ? `Mestre pôs ${nameOf(characterId)} em ${formatSlot(to, gridKind)}` : `Mestre pôs ${nameOf(characterId)} no mapa`;
    }
    case "removePiece":
      return `Mestre tirou ${nameOf(ma.content.characterId)} do mapa`;
    case "wallInteract":
    case "revealWall":
      return `Mestre: ${interactLabel(ma.content.interact)} na passagem`;
    default:
      // `turnNote` e qualquer tipo que o servidor venha a acrescentar.
      return "Ação do mestre";
  }
}

function moveText(move: HistoryMove, gridKind: GridKind): string {
  return move.position ? `moveu para ${formatSlot(move.position, gridKind)} (${move.category})` : `moveu (${move.category})`;
}

/** Um turno fechado como o REST o guarda (já projetado para quem pede). */
function turnLine(turn: HistoryTurn, nameOf: (id: string) => string, gridKind: GridKind): Line {
  const a = turn.action;
  const parts: string[] = [];
  if (a.move) parts.push(moveText(a.move, gridKind));
  if (a.attack) {
    const who = (a.targetId ?? []).map(nameOf).join(", ");
    parts.push(`atacou ${who}${a.attack.weapon ? ` com ${humanWeapon(a.attack.weapon)}` : ""}`);
  }
  if (a.interact) parts.push(`interagiu (${a.interact.kind})`);
  const outcomes = (turn.resolution?.targets ?? []).map((t) => outcomeText(t, nameOf, gridKind));
  const what = parts.length ? ` — ${parts.join(" e ")}` : "";
  return {
    icon: "■",
    text: `Turno de ${nameOf(a.actorId)}${what}${outcomes.length ? ` · ${outcomes.join(", ")}` : ""}`,
    details: turn.masterActions.map((ma) => masterActionText(ma, nameOf, gridKind)),
  };
}

function rowLine(row: HistoryRow, nameOf: (id: string) => string, gridKind: GridKind): Line {
  if (row.source === "live") return eventLine(row.event, nameOf, gridKind);
  switch (row.kind) {
    case "turn":
      return turnLine(row.turn, nameOf, gridKind);
    case "scene":
      return { icon: "✦", tone: "muted", text: `Cena: ${sceneLabel(row.scene.briefDesc, row.scene.category)}` };
    case "round_closed":
      return { icon: "↻", tone: "muted", text: "Fim do round" };
    case "round_mode_changed":
      return { icon: "⇄", tone: "muted", text: `Regime: ${ROUND_MODE_LABELS[row.mode]}` };
    case "master_action":
      return { icon: "⚑", text: masterActionText(row.masterAction, nameOf, gridKind) };
  }
}

/**
 * A aba Histórico: o que o servidor guardou (REST: turnos, cenas, regime, rounds, master
 * actions), com os eventos ao vivo por cima
 * — `historyRows` já decidiu o que o REST cobre. O mais recente embaixo (a rolagem fica presa
 * ao fim). O que ESTE navegador declarou aparece com detalhe; o dos outros, não — a
 * declaração de um jogador nunca é projetada para a mesa.
 */
export default function EventStream({
  rows,
  nameOf,
  gridKind,
}: {
  rows: HistoryRow[];
  nameOf: (characterId: string) => string;
  gridKind: GridKind;
}) {
  const containerRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    // jsdom não tem layout (scrollTo pode nem existir) — o pin-ao-fim só se verifica no browser.
    containerRef.current?.scrollTo?.({ top: containerRef.current?.scrollHeight ?? 0 });
  }, [rows]);

  if (rows.length === 0) {
    return <Empty>Nada aconteceu ainda. Turnos, dano e trocas de regime aparecem aqui.</Empty>;
  }

  return (
    <Container ref={containerRef}>
      {rows.map((row) => {
        const line = rowLine(row, nameOf, gridKind);
        return (
          <Row key={row.key} data-testid="event-row" $tone={line.tone}>
            <Icon aria-hidden>{line.icon}</Icon>
            <span>
              {line.text}
              {line.details?.map((d, i) => <Detail key={i}>{d}</Detail>)}
            </span>
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

const Detail = styled.span`
  display: block;
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
