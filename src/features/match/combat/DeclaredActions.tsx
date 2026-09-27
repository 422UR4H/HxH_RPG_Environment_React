import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { GridKind } from "../../../types/tacticalMap";
import type { DeclaredAction } from "./combatReducer";
import { describeDeclared } from "./combatText";

const STATUS_LABELS: Record<DeclaredAction["status"], string> = {
  sending: "enviando…",
  queued: "na fila",
  open: "em curso",
};

/**
 * O que ESTE navegador declarou e ainda não terminou — a fila é secreta, então só o dono
 * sabe o que mandou. Ocultar tira da lista (e o fantasma do mapa); não cancela a ação — o
 * contrato ainda não tem verbo de cancelar.
 */
export default function DeclaredActions({
  declared,
  nameOf,
  gridKind,
  showActor,
  onHide,
}: {
  declared: DeclaredAction[];
  nameOf: (id: string) => string;
  gridKind: GridKind;
  /** O mestre declara por vários NPCs: cada linha diz de quem é. */
  showActor?: boolean;
  onHide: (id: string) => void;
}) {
  if (declared.length === 0) return null;
  return (
    <Wrapper aria-label="Ações declaradas">
      <Title>Suas ações declaradas</Title>
      <List>
        {declared.map((d) => (
          <Row key={d.id} data-testid="declared-row" data-status={d.status}>
            <Text>
              {showActor && <Actor>{nameOf(d.actorId)}: </Actor>}
              {describeDeclared(d, nameOf, gridKind)}
            </Text>
            <Status $status={d.status}>{STATUS_LABELS[d.status]}</Status>
            {d.status === "queued" && (
              <Hide
                type="button"
                title="Ocultar da lista (não cancela a ação)"
                aria-label="Ocultar da lista"
                onClick={() => onHide(d.id)}
              >
                ×
              </Hide>
            )}
          </Row>
        ))}
      </List>
    </Wrapper>
  );
}

const Wrapper = styled.section`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 12px 12px;
  font-family: ${fonts.sans};
  color: ${colors.textPrimary};
`;

const Title = styled.h3`
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: ${colors.textPlaceholderStrong};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Row = styled.li`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: ${colors.surfaceInputHover};
  font-size: 12px;
`;

const Text = styled.span`
  flex: 1;
  min-width: 0;
`;

const Actor = styled.strong`
  font-weight: 600;
`;

const Status = styled.span<{ $status: DeclaredAction["status"] }>`
  flex-shrink: 0;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  background: ${({ $status }) => ($status === "open" ? colors.rowHighlight : colors.surfaceInput)};
  color: ${({ $status }) => ($status === "open" ? colors.textPrimary : colors.textPlaceholderStrong)};
`;

const Hide = styled.button`
  border: none;
  background: transparent;
  color: ${colors.textPlaceholderStrong};
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
`;
