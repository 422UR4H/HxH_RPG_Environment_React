import styled from "styled-components";
import { colors } from "../../../styles/tokens";
import type { Bar, BarsPayload, RoundMode } from "./combatMessages";
import { BAR_ICONS, BAR_LABELS } from "./combatText";
import { fmt, mean, priceOf } from "./barsMath";

/**
 * Uma linha por personagem, só com o que `bars_updated` traz (I8): o jogador não vê a
 * velocidade de ação nenhuma antes de ela abrir porque o servidor não a manda antes disso.
 * Só existe em Disputado (D5): no regime Livre `barsRows` devolve vazio. Por barra: saldo vivo,
 * velocidades que agiram, pendentes (mais fracas), "Próximo round" + adiadas, e a média própria.
 */
export default function CharacterBarsStrip({
  rows,
  bars,
  roundMode,
  nameOf,
}: {
  /** Já filtradas por `barsRows`: a tira não refiltra. */
  rows: BarsPayload["characters"];
  bars: BarsPayload;
  roundMode: RoundMode | "";
  nameOf: (id: string) => string;
}) {
  if (roundMode !== "Race") return null;
  // Ordem estável por nome: quem acompanha uma barra a acha sempre no mesmo lugar.
  const sorted = rows
    .map((c) => ({ c, name: nameOf(c.characterId) }))
    .sort((x, y) => x.name.localeCompare(y.name, "pt-BR"));
  return (
    <Strip aria-label="Barras de cada personagem">
      {sorted.map(({ c, name }) => (
        <Row key={c.characterId}>
          <Name>{name}</Name>
          {(["action", "move"] as Bar[]).map((b) => (
            <BarGroup key={b} bar={b} c={c} bars={bars} />
          ))}
        </Row>
      ))}
    </Strip>
  );
}

function BarGroup({ bar, c, bars }: { bar: Bar; c: BarsPayload["characters"][number]; bars: BarsPayload }) {
  const acted = bar === "action" ? c.actionSpeeds : c.moveSpeeds;
  const pending = bar === "action" ? c.pendingActionSpeeds : c.pendingMoveSpeeds;
  const deferred = bar === "action" ? c.deferredActionSpeeds : c.deferredMoveSpeeds;
  const balance = bar === "action" ? c.actionBalance : c.moveBalance;
  const priced = priceOf(bars, bar);
  const avg = mean([...acted, ...pending]);
  return (
    <>
      {priced && <BalanceBar bar={bar} balance={balance} price={priced.price} />}
      {acted.length > 0 && <Speeds>{acted.join(" · ")}</Speeds>}
      {pending.length > 0 && <PendingSpeeds>{pending.join(" · ")}</PendingSpeeds>}
      {deferred.length > 0 && (
        <>
          <PendingSpeeds>Próximo round</PendingSpeeds>
          <Speeds>{deferred.join(" · ")}</Speeds>
        </>
      )}
      {avg !== undefined && <Speeds>{`x̄ ${Math.round(avg * 10) / 10}`}</Speeds>}
    </>
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
  font-size: 12px;
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
  background: ${({ $frac }) => ($frac >= 0 ? colors.statusOngoing : colors.feedbackDanger)};
`;
const Num = styled.span`
  min-width: 32px;
  text-align: right;
`;
const Speeds = styled.span`
  color: ${colors.textPlaceholderStrong};
`;
const PendingSpeeds = styled.span`
  color: ${colors.textPlaceholder};
`;
