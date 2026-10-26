import { useId, useState } from "react";
import styled from "styled-components";
import { colors } from "../../../styles/tokens";
import type { EditActionPayload } from "./combatMessages";
import { clearPayload, conditionPayload, passiveBiasNote, systemBiasNote, type EditableRoll } from "./rollEdits";

const BIAS_OPTIONS = [
  { value: -1, label: "Desvantagem" },
  { value: 0, label: "Normal" },
  { value: 1, label: "Vantagem" },
] as const;

/**
 * O editor de uma rolagem (Fase 8; também a de uma ação na fila): viés, modificador e motivo.
 * Inline, embaixo da linha, um por vez no painel. Não guarda nada: "Aplicar" manda o
 * `edit_action` e fecha — o número e o resumo em vigor voltam do servidor. "Desfazer edição"
 * manda a entrada zerada (o servidor volta a "sem condição").
 *
 * O viés depende da leitura (`roll.bias`): numa rolada, os três botões ficam à vista; no dano,
 * não há viés. Numa **passiva** o viés muda a natureza do teste — ele passa a ser rolado —, então
 * os botões ficam atrás de "Viés", num cartão que diz isso antes de o mestre escolher. O botão
 * mostra a escolha quando ela não é Normal, para que fechar o cartão nunca esconda um viés. Uma
 * passiva com viés do **sistema** já está rolando contra o dado base: o aviso diz isso, e os
 * botões ficam à vista como numa rolada.
 */
export default function RollConditionEditor({
  roll,
  passiveValue,
  onSend,
  onClose,
}: {
  roll: EditableRoll;
  /** O valor base dos dados, que o aviso do viés numa passiva nomeia. */
  passiveValue?: number;
  onSend: (payload: EditActionPayload) => void;
  onClose: () => void;
}) {
  const [bias, setBias] = useState(roll.current?.bias ?? 0);
  // O cartão do viés de uma passiva abre sozinho quando já há viés em vigor.
  const [biasOpen, setBiasOpen] = useState(bias !== 0);
  const biasCardId = useId();
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
      {!!roll.systemBias && <SystemNote role="note">{systemBiasNote(roll, passiveValue)}</SystemNote>}
      {/* Com viés do sistema, a passiva já está rolando: os botões ficam à vista, como numa rolada. */}
      {(roll.bias === "rolled" || (roll.bias === "passive" && !!roll.systemBias)) && (
        <BiasButtons bias={bias} onChange={setBias} />
      )}
      {roll.bias === "passive" && !roll.systemBias && (
        <>
          <BiasDisclosure
            type="button"
            aria-expanded={biasOpen}
            aria-controls={biasCardId}
            onClick={() => setBiasOpen((o) => !o)}
          >
            Viés{bias !== 0 && ` · ${BIAS_OPTIONS.find((o) => o.value === bias)?.label}`}
            <Chevron aria-hidden="true">{biasOpen ? "▴" : "▾"}</Chevron>
          </BiasDisclosure>
          {biasOpen && (
            <BiasCard id={biasCardId}>
              <PassiveNote>{passiveBiasNote(passiveValue)}</PassiveNote>
              <BiasButtons bias={bias} onChange={setBias} />
            </BiasCard>
          )}
        </>
      )}
      <Field>
        <span>Modificador</span>
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

function BiasButtons({ bias, onChange }: { bias: number; onChange: (bias: number) => void }) {
  return (
    <BiasRow role="group" aria-label="Viés">
      {BIAS_OPTIONS.map((o) => (
        <Toggle key={o.value} type="button" aria-pressed={bias === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </Toggle>
      ))}
    </BiasRow>
  );
}

const Editor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid ${colors.brandAccent};
  border-radius: 6px;
  color: ${colors.textPrimary};
`;

const SystemNote = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: ${colors.feedbackWarning};
`;

const BiasDisclosure = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border: 1px solid ${colors.borderInput};
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  color: ${colors.textPrimary};

  &[aria-expanded="true"] {
    border-color: ${colors.brandAccent};
  }
`;

const Chevron = styled.span`
  font-size: 10px;
  color: ${colors.textPlaceholderStrong};
`;

// O cartão do viés numa passiva: o aviso fica acima dos botões, que é onde o olho passa antes do
// clique.
const BiasCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  background: ${colors.surfaceInput};
`;

const PassiveNote = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: ${colors.textPlaceholderStrong};
`;

const BiasRow = styled.div`
  display: flex;
  gap: 4px;
`;

const Toggle = styled.button`
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
  font-size: 13px;
`;

const Buttons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
`;

const ButtonBase = styled.button`
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
