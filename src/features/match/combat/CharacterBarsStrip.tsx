import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { Bar, BarsPayload, RoundMode } from "./combatMessages";
import { BAR_ICONS, BAR_LABELS } from "./combatText";

/** U+2212 MINUS SIGN — não é hífen. */
const MINUS = "−";

/** "A velocidade do round é a média de todas as ações que ele fez" (barra-de-acao.md). */
export function mean(xs: number[]): number | undefined {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined;
}

/**
 * O sinal vem do valor JÁ arredondado, não do original: -0.04 arredonda para 0, e "−0"
 * pareceria débito quando não é nem crédito nem débito de verdade.
 */
export const fmt = (n: number) => {
  const r = Math.round(Math.abs(n) * 10) / 10;
  return r === 0 ? "0" : `${n < 0 ? MINUS : ""}${r}`;
};

/**
 * Uma linha por personagem, só com o que `bars_updated` traz (I8): o jogador não vê a
 * velocidade de ação nenhuma antes de ela abrir porque o servidor não a manda antes disso.
 * No regime Livre não há preço, média nem carry-over — só as velocidades que agiram.
 */
export default function CharacterBarsStrip({
  bars,
  roundMode,
  nameOf,
}: {
  bars: BarsPayload;
  roundMode: RoundMode | "";
  nameOf: (id: string) => string;
}) {
  const race = roundMode === "Race";
  return (
    <Strip aria-label="Barras de cada personagem">
      {bars.characters.map((c) => {
        const speeds = [...c.actionSpeeds, ...c.moveSpeeds];
        const avg = mean(speeds);
        return (
          <Row key={c.characterId}>
            <Name>{nameOf(c.characterId)}</Name>
            {race &&
              (["action", "move"] as Bar[]).map((b) => {
                const price = bars.prices[b];
                if (price === undefined) return null;
                const balance = b === "action" ? c.actionBalance : c.moveBalance;
                return <BalanceBar key={b} bar={b} balance={balance} price={price} />;
              })}
            {speeds.length > 0 && <Speeds>{speeds.join(" · ")}</Speeds>}
            {race && avg !== undefined && <Speeds>{`x̄ ${Math.round(avg * 10) / 10}`}</Speeds>}
          </Row>
        );
      })}
    </Strip>
  );
}

/** Centrada no zero: crédito enche para a direita, débito para a esquerda, até ±preço. */
function BalanceBar({ bar, balance, price }: { bar: Bar; balance: number; price: number }) {
  const frac = Math.max(-1, Math.min(1, balance / price));
  return (
    <BarBox title={`${BAR_LABELS[bar]}: saldo ${fmt(balance)} de ${price}`}>
      <span aria-hidden>{BAR_ICONS[bar]}</span>
      <Track
        role="meter"
        aria-label={`Saldo de ${BAR_LABELS[bar]}`}
        aria-valuemin={-price}
        aria-valuemax={price}
        aria-valuenow={balance}
      >
        <Fill $frac={frac} />
      </Track>
      <Num>{fmt(balance)}</Num>
    </BarBox>
  );
}

const Strip = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
  min-width: 0;
  overflow-x: auto;
  /* BF2: só overflow-x setado faz o par overflow-x/overflow-y resolver overflow-y para
     "auto" também (CSS Overflow Module) — daí o ▲▼ vertical indesejado. A tira só rola
     na horizontal; na vertical ela cresce com as linhas (sem limite de altura aqui). */
  overflow-y: hidden;
  font-family: ${fonts.sans};
  font-size: 11px;
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
`;
const Name = styled.span`
  min-width: 64px;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const BarBox = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;
const Track = styled.span`
  position: relative;
  width: 72px;
  height: 6px;
  border-radius: 3px;
  background: ${colors.surfaceInput};
  overflow: hidden;
`;
const Fill = styled.span<{ $frac: number }>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: ${({ $frac }) => ($frac >= 0 ? "50%" : `${50 + $frac * 50}%`)};
  width: ${({ $frac }) => `${Math.abs($frac) * 50}%`};
  background: ${({ $frac }) => ($frac >= 0 ? colors.statusOngoing : colors.danger)};
`;
const Num = styled.span`
  min-width: 32px;
  text-align: right;
`;
const Speeds = styled.span`
  color: ${colors.textPlaceholderStrong};
`;
