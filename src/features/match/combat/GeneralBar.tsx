import { useState } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import { breakpoints } from "../../../styles/breakpoints";
import type { Bar, BarsPayload, RoundMode } from "./combatMessages";
import { BAR_ICONS, BAR_LABELS } from "./combatText";
import CharacterBarsStrip from "./CharacterBarsStrip";

/**
 * A barra geral, flutuando sobre o mapa: de quem é a vez, quem age em seguida (maior `key`
 * primeiro) e o preço da rodada. Pública — é ela que diz a cada um quanto tempo tem para
 * montar a próxima ação. Uma barra ausente de `prices` ainda não foi precificada (no
 * regime livre, nunca é). Abaixo da linha de hoje, `CharacterBarsStrip` (F6) — recolhida
 * por padrão abaixo de `tabletUp`, aberta a partir dali (estado de UI local, sem
 * persistência).
 */
export default function GeneralBar({
  bars,
  roundMode,
  openTurnActorId,
  nameOf,
  highlightActorIds,
}: {
  bars: BarsPayload | null;
  roundMode: RoundMode | "";
  openTurnActorId?: string;
  nameOf: (characterId: string) => string;
  /** Os atores de quem está olhando (o próprio personagem; os NPCs do mestre). */
  highlightActorIds?: Set<string>;
}) {
  const [stripOpen, setStripOpen] = useState(
    () =>
      typeof window === "undefined" ||
      window.matchMedia?.(`(min-width: ${breakpoints.tabletUp}px)`).matches !== false,
  );
  const order = bars ? [...bars.order].sort((a, b) => b.key - a.key) : [];
  const priced = bars ? (Object.keys(bars.prices) as Bar[]).filter((b) => bars.prices[b] !== undefined) : [];
  const hasCharacters = !!bars && bars.characters.length > 0;

  return (
    <Wrapper aria-label="Barra geral">
      <TopRow>
        {openTurnActorId ? (
          <Turn data-testid="open-turn">
            <Dot aria-hidden /> Vez de <strong>{nameOf(openTurnActorId)}</strong>
          </Turn>
        ) : (
          <Idle>Nenhum turno aberto</Idle>
        )}
        <Order aria-label="Ordem">
          {order.length === 0 ? (
            <Idle>ordem vazia</Idle>
          ) : (
            order.map((entry, i) => (
              <OrderChip
                key={`${entry.actorId}-${i}`}
                data-testid="order-row"
                $mine={!!highlightActorIds?.has(entry.actorId)}
                title={entry.bars.map((b) => BAR_LABELS[b]).join(" + ")}
              >
                {nameOf(entry.actorId)} <Icons aria-hidden>{entry.bars.map((b) => BAR_ICONS[b]).join("")}</Icons>{" "}
                <Key>{entry.key}</Key>
              </OrderChip>
            ))
          )}
        </Order>
        {priced.length > 0 && (
          <Prices data-testid="prices">
            preço {priced.map((b) => `${BAR_ICONS[b]} ${bars!.prices[b]}`).join(" · ")}
          </Prices>
        )}
        {hasCharacters && (
          <StripToggle type="button" aria-expanded={stripOpen} onClick={() => setStripOpen((o) => !o)}>
            Barras {stripOpen ? "▴" : "▾"}
          </StripToggle>
        )}
      </TopRow>
      {hasCharacters && stripOpen && <CharacterBarsStrip bars={bars!} roundMode={roundMode} nameOf={nameOf} />}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  padding: 6px 10px;
  border-radius: 8px;
  background: ${colors.overlayMedium};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 12px;
  pointer-events: auto;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: none;
`;

const Turn = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`;

const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${colors.pieceActiveTurn};
  box-shadow: 0 0 0 3px ${colors.rowHighlight};
`;

const Idle = styled.span`
  flex-shrink: 0;
  color: ${colors.textPlaceholderStrong};
  font-style: italic;
`;

const Order = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`;

const OrderChip = styled.span<{ $mine: boolean }>`
  padding: 2px 8px;
  border-radius: 999px;
  background: ${({ $mine }) => ($mine ? colors.rowHighlight : colors.surfaceInput)};
  border: 1px solid ${({ $mine }) => ($mine ? colors.brandAccentBright : "transparent")};
`;

const Icons = styled.span`
  color: ${colors.textPlaceholderStrong};
`;

const Key = styled.span`
  color: ${colors.textPlaceholderStrong};
  font-variant-numeric: tabular-nums;
`;

const Prices = styled.span`
  margin-left: auto;
  flex-shrink: 0;
  color: ${colors.textPlaceholderStrong};
`;

const StripToggle = styled.button`
  margin-left: auto;
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: ${colors.textPlaceholderStrong};
  font-family: ${fonts.sans};
  font-size: 12px;
  cursor: pointer;
  padding: 0;
`;
