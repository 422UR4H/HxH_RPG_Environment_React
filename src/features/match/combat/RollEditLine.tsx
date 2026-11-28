import styled from "styled-components";
import { colors } from "../../../styles/tokens";
import type { EditActionPayload } from "./combatMessages";
import RollConditionEditor from "./RollConditionEditor";
import { SYSTEM_BIAS_REASON, describeCondition, systemBiasText, type EditableRoll } from "./rollEdits";

/**
 * Uma rolagem editável: o nome (quando a linha precisa dizer qual é), o viés que o sistema já pôs,
 * o resumo da condição em vigor e o botão "Editar", com o editor inline embaixo quando aberto. Serve
 * ao cálculo do turno aberto e à ação na fila — quem chama guarda qual está aberto (um por vez).
 */
export function RollEditLine({
  roll,
  tail,
  ariaLabel,
  open,
  passiveValue,
  onOpen,
  onClose,
  onSend,
}: {
  roll: EditableRoll;
  /** O valor base dos dados (`match_full_state.passiveValue`), para o aviso do viés numa passiva. */
  passiveValue?: number;
  /** Com `tail`, a linha mostra o rótulo da rolagem seguido dele (o total, por exemplo). */
  tail?: string;
  ariaLabel: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSend: (payload: EditActionPayload) => void;
}) {
  return (
    <>
      <RollRow>
        {tail !== undefined && <span>{roll.label}{tail}</span>}
        {roll.systemBias ? <SystemApplied title={SYSTEM_BIAS_REASON}>{systemBiasText(roll.systemBias)}</SystemApplied> : null}
        {roll.current && <Applied>{describeCondition(roll.current)}</Applied>}
        <EditButton type="button" aria-label={ariaLabel} onClick={onOpen}>
          Editar
        </EditButton>
      </RollRow>
      {open && <RollConditionEditor roll={roll} passiveValue={passiveValue} onSend={onSend} onClose={onClose} />}
    </>
  );
}

const RollRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

const EditButton = styled.button`
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  border: 1px solid ${colors.brandAccent};
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
  color: ${colors.textPrimary};

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Applied = styled.span`
  color: ${colors.feedbackWarning};
`;

// O que o sistema aplicou sozinho: contornado, para não se confundir com a condição do mestre.
const SystemApplied = styled.span`
  align-self: flex-start;
  padding: 1px 6px;
  border: 1px solid ${colors.feedbackWarning};
  border-radius: 999px;
  color: ${colors.feedbackWarning};
  font-size: 11px;
`;
