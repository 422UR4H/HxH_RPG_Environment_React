import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { BarsPayload } from "./combatMessages";

/** Os dois saldos do próprio personagem são fracionários — sempre uma casa decimal, nunca arredondados. */
export default function OwnBars({
  bars,
  characterId,
  hp,
}: {
  bars: BarsPayload | null;
  characterId: string;
  hp?: { hp: number; maxHp: number };
}) {
  const character = bars?.characters.find((c) => c.characterId === characterId) ?? null;

  return (
    <Panel>
      <Balance data-testid="balance-action">
        Ação: {character ? character.actionBalance.toFixed(1) : "—"}
      </Balance>
      <Balance data-testid="balance-move">
        Movimento: {character ? character.moveBalance.toFixed(1) : "—"}
      </Balance>
      {hp && (
        <HpTrack>
          <HpFill $pct={hp.maxHp > 0 ? Math.max(0, Math.min(100, (hp.hp / hp.maxHp) * 100)) : 0} />
          <HpText>
            {hp.hp}/{hp.maxHp}
          </HpText>
        </HpTrack>
      )}
    </Panel>
  );
}

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  background: ${colors.surfaceSidebar};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 13px;
  border-radius: 6px;
`;

const Balance = styled.div``;

const HpTrack = styled.div`
  position: relative;
  height: 16px;
  border-radius: 4px;
  background: ${colors.surfaceControl};
  overflow: hidden;
`;

const HpFill = styled.div<{ $pct: number }>`
  position: absolute;
  inset: 0;
  width: ${({ $pct }) => $pct}%;
  background: ${colors.redHp};
`;

const HpText = styled.span`
  position: relative;
  z-index: 1;
  display: block;
  text-align: center;
  font-size: 11px;
  line-height: 16px;
  color: ${colors.textPrimary};
`;
