import { useEffect, useRef, type ReactNode } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { GridKind } from "../../../types/tacticalMap";
import type { TableEvent } from "./combatReducer";
import type { ResolutionTarget, SceneCategory, WallTurnResult } from "./combatMessages";
import type { HistoryMasterAction, HistoryMove, HistoryTurn } from "../../../types/matchHistory";
import type { HistoryRow } from "./historyRows";
import { avoidedVerb, describeDeclared, describeHistoryAction, formatSlot, interactLabel, withWeapon, ROUND_MODE_LABELS } from "./combatText";

/** U+2212 MINUS SIGN — não é hífen. */
const MINUS = "−";

const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

const sceneLabel = (brief: string, category: SceneCategory) =>
  brief || (category === "battle" ? "batalha" : "roleplay");

/** `details`: o que vai junto da linha — as master actions feitas dentro de um turno. */
type Line = { icon: string; text: string; tone?: "turn" | "hp" | "muted"; details?: string[] };

/** O desfecho de um alvo — o mesmo texto no ao vivo e no REST (W1: verbo por `reaction.kind`,
 * igual a ResolutionDetails via `avoidedVerb`). Uma fuga que falhou diz onde caiu (F14) só
 * quando `landing` veio: a projeção o corta para quem não viu a peça pousar. */
function outcomeText(
  t: Pick<ResolutionTarget, "targetId" | "avoided" | "attackStopped" | "projectedDamage" | "reaction" | "escape">,
  nameOf: (id: string) => string,
): string {
  if (t.avoided) return `${nameOf(t.targetId)} ${avoidedVerb(t)}`;
  const hit = t.projectedDamage > 0 ? `${nameOf(t.targetId)} ${MINUS}${t.projectedDamage}` : `${nameOf(t.targetId)} sem dano`;
  // Onde caiu já está no mapa; a casa em coluna/linha só polui a linha.
  const landed = t.escape && !t.escape.escaped && t.escape.landing;
  return landed ? `${hit} (a fuga falhou — caiu onde o mestre escolheu)` : hit;
}

/** O que o turno fez a uma parede, curto, para a linha do turno. */
function wallText(w: WallTurnResult, nameOf: (id: string) => string): string {
  const name = nameOf(w.wallId);
  if (w.kind === "interact") {
    if (w.failure === "locked") return `${name} trancada`;
    if (w.failure === "noRoll") return `${name}: tentativa sem teste (o mestre decide)`;
    return w.failure ? `${name} sem mudança` : `${name} ${w.open ? "aberta" : "fechada"}`;
  }
  if (w.destroyed) return `${name} ${MINUS}${w.effectiveDamage}, destruída`;
  return w.effectiveDamage > 0 ? `${name} ${MINUS}${w.effectiveDamage}` : `${name} sem dano`;
}

/** Os desfechos de um turno: personagens, depois paredes. */
function outcomesOf(
  resolution: { targets?: ResolutionTarget[]; walls?: WallTurnResult[] } | undefined,
  nameOf: (id: string) => string,
): string[] {
  return [
    ...(resolution?.targets ?? []).map((t) => outcomeText(t, nameOf)),
    ...(resolution?.walls ?? []).map((w) => wallText(w, nameOf)),
  ];
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
      const outcomes = outcomesOf(event.resolution, nameOf);
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
    case "revealWall": {
      const walls = ma.content.wallIds.map(nameOf).join(", ");
      return `Mestre: ${interactLabel(ma.content.interact)} ${walls || "a passagem"}`;
    }
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
    parts.push(`atacou ${who}${a.attack.weapon ? withWeapon(a.attack.weapon) : ""}`);
  }
  if (a.interact) {
    const what = (a.targetId ?? []).map(nameOf).join(", ");
    parts.push(`interagiu${what ? ` com ${what}` : ""} (${interactLabel(a.interact.kind)})`);
  }
  const outcomes = outcomesOf(turn.resolution, nameOf);
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
    case "action_cancelled": {
      // Sem `action` (quem não é mestre nem dono) o contrato só entrega quem cancelou; uma
      // ação sem nada descritível (ex.: só uma perícia) cai no mesmo texto genérico.
      const what = row.action ? describeHistoryAction(row.action, nameOf, gridKind) : "";
      return { icon: "✕", text: what ? `${nameOf(row.actorId)} cancelou: ${lowerFirst(what)}` : `${nameOf(row.actorId)} cancelou uma ação` };
    }
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
  loadFailed = false,
  footer,
  pinKey,
}: {
  rows: HistoryRow[];
  nameOf: (characterId: string) => string;
  gridKind: GridKind;
  /** O GET /history falhou (já depois da nova tentativa): as linhas são só as ao vivo. */
  loadFailed?: boolean;
  /** Vai depois da última linha, dentro do que rola — o histórico e o rodapé sobem juntos. */
  footer?: ReactNode;
  /** O que muda quando só o rodapé muda (ex.: as ações declaradas) — refaz o pin-ao-fim. */
  pinKey?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // jsdom não tem layout (scrollTo pode nem existir) — o pin-ao-fim só se verifica no browser.
    containerRef.current?.scrollTo?.({ top: containerRef.current?.scrollHeight ?? 0 });
  }, [rows, pinKey]);

  const loadError = loadFailed && <LoadError role="alert">Não foi possível carregar o histórico.</LoadError>;

  if (rows.length === 0) {
    return (
      <Wrapper>
        {loadError}
        <Container ref={containerRef}>
          {!loadError && <Empty>Nada aconteceu ainda. Turnos, dano e trocas de regime aparecem aqui.</Empty>}
          {footer}
        </Container>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      {loadError}
      <Container ref={containerRef}>
        <Lines>
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
        </Lines>
        {footer}
      </Container>
    </Wrapper>
  );
}

/** O aviso de falha fica fora do que rola — continua à vista com o histórico no fim. */
const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Container = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 12px;
`;

const Lines = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
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

const LoadError = styled.p`
  margin: 0;
  padding: 8px 12px;
  color: ${colors.danger};
  font-family: ${fonts.sans};
  font-size: 12px;
`;

const Empty = styled.p`
  margin: 0;
  padding: 16px 12px;
  color: ${colors.textPlaceholderStrong};
  font-family: ${fonts.sans};
  font-size: 12px;
  font-style: italic;
`;
