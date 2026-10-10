import { useState } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { EditActionPayload } from "./combatMessages";
import { clearPayload, conditionPayload, type EditableRoll } from "./rollEdits";

const BIAS_OPTIONS = [
  { value: -1, label: "Desvantagem" },
  { value: 0, label: "Normal" },
  { value: 1, label: "Vantagem" },
] as const;

/**
 * O editor de uma rolagem do turno aberto (Fase 8): viés, ajuste e motivo. Inline, embaixo da
 * linha, um por vez no painel. Não guarda nada: "Aplicar" manda o `edit_action` e fecha — o
 * número e o resumo em vigor voltam pelo `resolution_updated`. "Desfazer edição" manda a
 * entrada zerada (o servidor volta a "sem condição"). O viés some onde a leitura é passiva ou
 * é o dano: lá não há dado para escolher.
 */
export default function RollConditionEditor({
  roll,
  onSend,
  onClose,
}: {
  roll: EditableRoll;
  onSend: (payload: EditActionPayload) => void;
  onClose: () => void;
}) {
  const [bias, setBias] = useState(roll.current?.bias ?? 0);
  const [modifier, setModifier] = useState(String(roll.current?.modifier ?? 0));
  const [description, setDescription] = useState(roll.current?.description ?? "");
  const send = (payload: EditActionPayload) => {
    onSend(payload);
    onClose();
  };
  // Vazio ou "-" dá NaN: conta como zero, nunca vai NaN para o servidor.
  const parsed = Number.parseInt(modifier, 10);
  const apply = () =>
    send(conditionPayload(roll, { bias, modifier: Number.isNaN(parsed) ? 0 : parsed, description }));

  return (
    <Editor role="group" aria-label={`Editar ${roll.label}`}>
      {roll.allowsBias && (
        <BiasRow role="group" aria-label="Viés">
          {BIAS_OPTIONS.map((o) => (
            <Toggle
              key={o.value}
              type="button"
              aria-pressed={bias === o.value}
              onClick={() => setBias(o.value)}
            >
              {o.label}
            </Toggle>
          ))}
        </BiasRow>
      )}
      <Field>
        <span>Ajuste</span>
        <Input
          type="number"
          step={1}
          value={modifier}
          onChange={(e) => setModifier(e.target.value)}
        />
      </Field>
      <Field>
        <span>Motivo</span>
        <Input
          type="text"
          maxLength={80}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <Buttons>
        <Primary type="button" onClick={apply}>Aplicar</Primary>
        {roll.current && (
          <Secondary type="button" onClick={() => send(clearPayload(roll))}>
            Desfazer edição
          </Secondary>
        )}
        <Secondary type="button" onClick={onClose}>Cancelar</Secondary>
      </Buttons>
    </Editor>
  );
}

const Editor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid ${colors.brandAccent};
  border-radius: 6px;
  font-family: ${fonts.sans};
  color: ${colors.textPrimary};
`;

const BiasRow = styled.div`
  display: flex;
  gap: 4px;
`;

const Toggle = styled.button`
  font-family: ${fonts.sans};
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid ${colors.borderInput};
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  color: ${colors.textPrimary};

  &[aria-pressed="true"] {
    background: ${colors.brandAccent};
    border-color: ${colors.brandAccent};
  }
`;

const Field = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: ${colors.textPlaceholderStrong};
`;

const Input = styled.input`
  width: 140px;
  padding: 4px 6px;
  border: 1px solid ${colors.borderInput};
  border-radius: 4px;
  background: ${colors.surfaceInput};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 13px;
`;

const Buttons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
`;

const ButtonBase = styled.button`
  font-family: ${fonts.sans};
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  color: ${colors.textPrimary};
`;

const Primary = styled(ButtonBase)`
  border: 1px solid ${colors.brandAccent};
  background: ${colors.brandAccent};
`;

const Secondary = styled(ButtonBase)`
  border: 1px solid ${colors.brandAccent};
  background: transparent;
`;
