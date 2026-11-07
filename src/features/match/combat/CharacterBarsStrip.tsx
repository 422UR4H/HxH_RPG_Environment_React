import { useState } from "react";
import styled from "styled-components";
import Tooltip from "../../../components/ions/Tooltip";
import { colors } from "../../../styles/tokens";
import type { Bar, BarsPayload, RoundMode } from "./combatMessages";
import { BAR_ICONS, BAR_LABELS } from "./combatText";
import { barFields, barScale, barTicks, barTotal, fmt, priceOf } from "./barsMath";

const BARS: Bar[] = ["action", "move"];
/** Por linha: o nome, as duas caixas (ícone, trilho, número) e, depois delas, as duas listas. */
const COLUMNS = 1 + BARS.length * 2;
/** O saldo mais largo de 3 dígitos: a coluna do número o reserva sempre (ver `Num`). */
const NUM_RESERVE = "saldo −999";

/**
 * Uma linha por personagem, só com o que `bars_updated` traz (I8): o jogador não vê a
 * velocidade de ação nenhuma antes de ela abrir porque o servidor não a manda antes disso.
 * Só existe em Disputado (D5): no regime Livre `barsRows` devolve vazio.
 *
 * D7: a faixa é UMA grade e cada linha desenha todas as células (vazias quando não há o que
 * mostrar). As duas barras vêm logo depois do nome e as listas de velocidades só depois delas:
 * uma lista que cresce (segunda velocidade, a primeira adiada) nunca empurra barra nenhuma. A
 * barra mostra o total da próxima ação contra uma escala comum a todas as linhas.
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
  const scale = { action: barScale(rows, bars, "action"), move: barScale(rows, bars, "move") };
  return (
    <Strip aria-label="Barras de cada personagem">
      {sorted.map(({ c, name }) => (
        <Row key={c.characterId} data-testid="bars-row">
          <Name>{name}</Name>
          {BARS.map((b) => {
            const { balance } = barFields(c, b);
            return (
              <Cell key={b}>
                <BarBox bar={b} total={barTotal(c, b)} balance={balance} price={priceOf(bars, b)?.price} scale={scale[b]} />
              </Cell>
            );
          })}
          {BARS.map((b) => (
            <Cell key={`${b}-speeds`}>
              <SpeedCells bar={b} c={c} />
            </Cell>
          ))}
        </Row>
      ))}
    </Strip>
  );
}

/**
 * As velocidades de uma barra, depois das duas caixas: o ícone diz de qual barra é a lista. As que
 * agiram, as pendentes (mais fracas) e, por último, "Próximo round" + adiadas — elas não entram no total.
 */
function SpeedCells({ bar, c }: { bar: Bar; c: BarsPayload["characters"][number] }) {
  const { acted, pending, deferred } = barFields(c, bar);
  if (acted.length + pending.length + deferred.length === 0) return null;
  return (
    <SpeedsLine>
      <ListIcon aria-label={BAR_LABELS[bar]} role="img">{BAR_ICONS[bar]}</ListIcon>
      {acted.length > 0 && <Speeds data-testid={`${bar}-acted`}><SpeedList speeds={acted} /></Speeds>}
      {pending.length > 0 && (
        <PendingSpeeds data-testid={`${bar}-pending`}><SpeedList speeds={pending} /></PendingSpeeds>
      )}
      {deferred.length > 0 && (
        <span data-testid={`${bar}-deferred`}>
          <PendingSpeeds>Próximo round</PendingSpeeds> <Speeds><SpeedList speeds={deferred} /></Speeds>
        </span>
      )}
    </SpeedsLine>
  );
}

function SpeedList({ speeds }: { speeds: number[] }) {
  return (
    <>
      {speeds.map((s, i) => (
        <span key={i}>
          {i > 0 && " · "}
          <Figure>{s}</Figure>
        </span>
      ))}
    </>
  );
}

const pct = (x: number) => `${Math.max(0, Math.min(1, x)) * 100}%`;
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * O ícone da barra, sempre: é ele que diz a quem pertencem os números que seguem. Com preço, o
 * trilho enche até o total e marca cada múltiplo do preço; hover ou foco escurecem o que a próxima
 * ação gasta (`total − saldo`) e trocam o número pelo saldo. Sem preço, trilho vazio e só o total.
 */
function BarBox({
  bar,
  total,
  balance,
  price,
  scale,
}: {
  bar: Bar;
  total: number | undefined;
  balance: number;
  price: number | undefined;
  scale: number;
}) {
  const [active, setActive] = useState(false);
  const priced = price !== undefined;
  const showBalance = priced && active;
  const label = BAR_LABELS[bar];
  const totalText = total !== undefined ? fmt(total) : "";
  const balanceText = `saldo ${fmt(balance)}`;
  const fill = priced && total !== undefined && scale > 0 ? total / scale : undefined;
  // Saldo negativo: o gasto passa do total e o preenchimento inteiro escurece.
  const spent = total !== undefined && total > 0 ? (total - balance) / total : 1;
  return (
    <Tooltip label={`${capitalize(label)}: saldo ${fmt(balance)} de ${price}`} enabled={priced} stretch>
      <Box
        role="group"
        aria-label={`Barra de ${label}`}
        tabIndex={priced ? 0 : undefined}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
      >
        <span role="img" aria-label={label}>{BAR_ICONS[bar]}</span>
        <Track
          $bar={bar}
          role="meter"
          aria-label={`Total de ${label}`}
          aria-valuemin={0}
          aria-valuemax={scale}
          aria-valuenow={total ?? 0}
        >
          {fill !== undefined && (
            <Fill $bar={bar} data-testid="bar-fill" style={{ width: pct(fill) }}>
              {showBalance && <Spent data-testid="bar-spent" style={{ width: pct(spent) }} />}
            </Fill>
          )}
          {priced && barTicks(price, scale).map((at) => (
            <Tick key={at} data-testid="bar-tick" style={{ left: pct(at / scale) }} />
          ))}
        </Track>
        {/* O texto que não está à vista ocupa o mesmo lugar, invisível: trocar total ↔ saldo não
            mexe na largura da coluna (senão a faixa inteira pularia a cada hover). E a coluna
            sempre reserva o saldo mais largo de 3 dígitos (`NUM_RESERVE`, em negrito): a barra
            ganhar preço ou o primeiro número não empurra a de movimento. */}
        <Num>
          <NumText data-testid="bar-number" $strong={showBalance}>{showBalance ? balanceText : totalText}</NumText>
          {priced && <NumGhost aria-hidden $strong={!showBalance}>{showBalance ? totalText : balanceText}</NumGhost>}
          <NumGhost aria-hidden $strong>{NUM_RESERVE}</NumGhost>
        </Num>
      </Box>
    </Tooltip>
  );
}

const Strip = styled.div`
  display: grid;
  grid-template-columns: repeat(${COLUMNS}, auto);
  justify-content: start;
  align-items: center;
  row-gap: 4px;
  margin-top: 6px;
  min-width: 0;
  overflow-x: auto;
  /* BF2: só overflow-x setado faz o par overflow-x/overflow-y resolver overflow-y para
     "auto" também (CSS Overflow Module) — daí o ▲▼ vertical indesejado. A tira só rola
     na horizontal; na vertical ela cresce com as linhas (sem limite de altura aqui). */
  overflow-y: hidden;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`;
/** A linha não é caixa: as células dela são itens da grade da faixa. */
const Row = styled.div`
  display: contents;
`;
const Name = styled.span`
  min-width: 64px;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
`;
/** Afastamento à esquerda de toda célula com conteúdo. */
const Cell = styled.span`
  display: flex;
  align-items: center;
  &:not(:empty) {
    padding-left: 8px;
  }
`;
const SpeedsLine = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;
const ListIcon = styled.span`
  color: ${colors.textPlaceholder};
`;
const Box = styled.span`
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 4px;
  border-radius: 2px;
  /* Só o afastamento é próprio (2 px; o global tem 3): as células da tira são coladas. O
     contorno e a cor vêm do anel global (--focus-ring). */
  &:focus-visible {
    outline-offset: 2px;
  }
`;
const barColor = (bar: Bar) => (bar === "action" ? colors.vitalActionBar : colors.vitalMoveBar);
const trackColor = (bar: Bar) => (bar === "action" ? colors.vitalActionBarTrack : colors.vitalMoveBarTrack);
const Track = styled.span<{ $bar: Bar }>`
  position: relative;
  flex-shrink: 0;
  width: 72px;
  height: 6px;
  border-radius: 3px;
  background-color: ${({ $bar }) => trackColor($bar)};
  overflow: hidden;
`;
const Fill = styled.span<{ $bar: Bar }>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background-color: ${({ $bar }) => barColor($bar)};
`;
const Spent = styled.span`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background-color: ${colors.overlayMedium};
`;
const Tick = styled.span`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: ${colors.overlayDark};
`;
const Num = styled.span`
  display: inline-grid;
  margin-left: auto;
  min-width: 5ch;
  text-align: right;
  & > * {
    grid-area: 1 / 1;
  }
`;
const NumText = styled.span<{ $strong: boolean }>`
  ${({ $strong }) => ($strong ? `font-weight: 700; color: ${colors.textPrimary};` : "")}
`;
const NumGhost = styled(NumText)`
  visibility: hidden;
`;
const Figure = styled.span`
  display: inline-block;
  min-width: 3ch;
  text-align: right;
`;
const Speeds = styled.span`
  color: ${colors.textPlaceholderStrong};
`;
const PendingSpeeds = styled.span`
  color: ${colors.textPlaceholder};
`;
