// O resumo do combate que fecha (spec 2026-11-08 §3.6/§4): o tempo dos rounds, que já está no
// relógio, e os hiatos — intervalos sem disputa que só o mestre sabe quanto duraram.
import styled from "styled-components";
import { colors } from "../../../styles/tokens";
import { actionKindLabel } from "../combat/combatText";
import type { CombatSummary, HiatusEnd } from "./clockMessages";

/** Mensagem do dono (spec §4), literal. */
export const HIATUS_MESSAGE =
  "Nesses intervalos ninguém disputou ações — os personagens podem ter conversado, se reposicionado ou procurado uma brecha. Some ao relógio o tempo que eles duraram.";

export default function CombatSummaryBlock({
  summary,
  nameOf,
}: {
  summary: CombatSummary;
  nameOf: (characterId: string) => string;
}) {
  const n = summary.countedRounds;
  const end = (t: HiatusEnd) => `round ${t.roundNumber} (${nameOf(t.actorId)} — ${actionKindLabel(t.actionKind)})`;
  return (
    <Block>
      <Line>{`${n} ${n === 1 ? "round disputado" : "rounds disputados"} = ${summary.countedSeconds} s, já no relógio`}</Line>
      {summary.activeRoundCounts && <Muted>+1 s ao encerrar</Muted>}
      {summary.hiatuses.length === 0 ? (
        <Muted>Nenhum hiato: o combate foi contínuo.</Muted>
      ) : (
        <>
          <List>
            {summary.hiatuses.map((h, i) => (
              <li key={h.before.turnId}>{`Hiato ${i + 1}: depois do ${end(h.before)} e antes do ${end(h.after)}`}</li>
            ))}
          </List>
          <Note>{HIATUS_MESSAGE}</Note>
        </>
      )}
    </Block>
  );
}

const Block = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  line-height: 1.45;
`;

const Line = styled.p`
  margin: 0;
  font-weight: 600;
`;

const Muted = styled.p`
  margin: 0;
  color: ${colors.textMuted};
`;

const List = styled.ul`
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Note = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${colors.feedbackWarning};
`;
