import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { BarsPayload } from "./combatMessages";

const signed = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}`;

/**
 * Vida e as duas barras do próprio personagem. O saldo é fracionário — uma casa, nunca
 * arredondado — e atravessa rounds como crédito ou dívida (`barra-de-acao.md`).
 */
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
  const pct = hp && hp.maxHp > 0 ? Math.max(0, Math.min(100, (hp.hp / hp.maxHp) * 100)) : 0;

  return (
    <Panel>
      {hp && (
        <HpRow>
          <Label>Vida</Label>
          <HpTrack aria-label={`Vida ${hp.hp} de ${hp.maxHp}`}>
            <HpFill style={{ width: `${pct}%` }} />
            <HpText>
              {hp.hp}/{hp.maxHp}
            </HpText>
          </HpTrack>
        </HpRow>
      )}
      <Balances>
        <Label>Saldo</Label>
        <Balance data-testid="balance-action" title="Barra de ação">
          ⚔ {character ? signed(character.actionBalance) : "—"}
        </Balance>
        <Balance data-testid="balance-move" title="Barra de movimento">
          ➜ {character ? signed(character.moveBalance) : "—"}
        </Balance>
      </Balances>
    </Panel>
  );
}

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 12px 0;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 12px;
`;

const Label = styled.span`
  width: 40px;
  flex-shrink: 0;
  color: ${colors.textPlaceholderStrong};
`;

const HpRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HpTrack = styled.div`
  position: relative;
  flex: 1;
  height: 16px;
  border-radius: 4px;
  background: ${colors.surfaceControl};
  overflow: hidden;
`;

const HpFill = styled.div`
  position: absolute;
  inset: 0 auto 0 0;
  background: ${colors.redHp};
  transition: width 300ms ease;
`;

const HpText = styled.span`
  position: relative;
  z-index: 1;
  display: block;
  text-align: center;
  font-size: 11px;
  line-height: 16px;
`;

const Balances = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Balance = styled.span`
  font-variant-numeric: tabular-nums;
`;
