import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { Bar, BarsPayload } from "./combatMessages";

const ALL_BARS: Bar[] = ["action", "move"];

const BAR_LABELS: Record<Bar, string> = {
  action: "Ação",
  move: "Movimento",
};

/**
 * Flutua sobre o mapa: ordem projetada (maior key primeiro) + preço da rodada.
 * Uma barra ausente de `bars.prices` ainda não foi precificada — nunca é zero.
 */
export default function GeneralBar({
  bars,
  nameOf,
  highlightActorId,
}: {
  bars: BarsPayload | null;
  nameOf: (characterId: string) => string;
  highlightActorId?: string;
}) {
  if (!bars) return null;

  const order = [...bars.order].sort((a, b) => b.key - a.key);

  return (
    <Wrapper>
      <Prices>
        {ALL_BARS.map((bar) => {
          const price = bars.prices[bar];
          return (
            <PriceItem key={bar} data-testid={`price-${bar}`}>
              {BAR_LABELS[bar]}: {price === undefined ? <Unpriced>ainda não precificou</Unpriced> : price}
            </PriceItem>
          );
        })}
      </Prices>
      <Order>
        {order.map((entry, i) => (
          <OrderRow
            key={`${entry.actorId}-${i}`}
            data-testid="order-row"
            $highlighted={entry.actorId === highlightActorId}
          >
            {nameOf(entry.actorId)} — {entry.bars.map((b) => BAR_LABELS[b]).join(", ")}
          </OrderRow>
        ))}
      </Order>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 6px 12px;
  background: ${colors.surfaceSidebar};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 12px;
  overflow-x: auto;
`;

const Prices = styled.div`
  display: flex;
  gap: 12px;
  flex-shrink: 0;
`;

const PriceItem = styled.span``;

const Unpriced = styled.span`
  color: ${colors.textPlaceholder};
  font-style: italic;
`;

const Order = styled.div`
  display: flex;
  gap: 10px;
  overflow-x: auto;
`;

const OrderRow = styled.span<{ $highlighted: boolean }>`
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
  background: ${({ $highlighted }) => ($highlighted ? colors.rowHighlight : "transparent")};
`;
