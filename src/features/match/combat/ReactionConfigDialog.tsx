import { useState } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { ReactionKind } from "./combatMessages";
import { BAR_LABELS, humanWeapon } from "./combatText";
import {
  REACTION_BARS, REACTION_BUTTONS, REACTION_BUTTON_LABELS, needsDestination, reactionKindOf, supportsEvasion,
} from "./reactionModel";
import type { ReactionButton } from "./reactionModel";
import {
  AccentConfirmButton, Buttons, CancelButton, Dialog, DialogTitle, Overlay,
} from "./dialogStyles";

/** O custo do tipo em texto, a partir da tabela do contrato. */
function costText(kind: ReactionKind): string {
  const bars = REACTION_BARS[kind];
  if (bars.length === 0) return "Não cobra nada";
  return `Cobra: ${bars.map((b) => BAR_LABELS[b]).join(" + ")} — consome a ação que você tinha na fila, com Desvantagem`;
}

/**
 * A configuração da reação (segurar ou botão direito no botão): o tipo, a Evasão (só em
 * Esquivar e Escapar) e a arma do Repelir. Para a fuga, `onSend` sai sem casa — quem chama
 * arma a escolha da casa no mapa e envia de lá.
 */
export default function ReactionConfigDialog({
  name,
  initial,
  weapons,
  defaultWeapon,
  onSend,
  onCancel,
}: {
  name: string;
  /** O botão segurado: abre já escolhido. */
  initial: ReactionButton;
  /** As armas do catálogo do personagem, nomes crus do enum ("ShortBow"). */
  weapons: string[];
  /** A arma do rascunho da ação, se houver. */
  defaultWeapon?: string;
  onSend: (r: { kind: ReactionKind; weapon?: string }) => void;
  onCancel: () => void;
}) {
  const [button, setButton] = useState<ReactionButton>(initial);
  const [evasion, setEvasion] = useState(false);
  // "" = Desarmado. Uma arma padrão fora do catálogo (o soco do rascunho) cai em Desarmado.
  const [weapon, setWeapon] = useState(() =>
    defaultWeapon && weapons.includes(defaultWeapon) ? defaultWeapon : "",
  );

  const evasionOn = supportsEvasion(button) && evasion;
  const kind = reactionKindOf(button, evasionOn);
  const title = `Reagir — ${name}`;

  const send = () => {
    if (kind === "repel") onSend({ kind, weapon: weapon || undefined });
    else onSend({ kind });
  };

  return (
    <Overlay onClick={onCancel}>
      <Dialog role="dialog" aria-modal aria-label={title} onClick={(e) => e.stopPropagation()}>
        <DialogTitle>{title}</DialogTitle>
        <Kinds role="radiogroup" aria-label="Tipo de reação">
          {REACTION_BUTTONS.map((b) => (
            <Choice key={b}>
              <input
                type="radio"
                name="reaction-kind"
                value={b}
                checked={button === b}
                onChange={() => setButton(b)}
              />
              {REACTION_BUTTON_LABELS[b]}
            </Choice>
          ))}
        </Kinds>
        <Choice $disabled={!supportsEvasion(button)}>
          <input
            type="checkbox"
            checked={evasionOn}
            disabled={!supportsEvasion(button)}
            onChange={(e) => setEvasion(e.target.checked)}
          />
          Evasão (fechada)
        </Choice>
        {button === "repel" && (
          <Field>
            Arma
            <Select aria-label="Arma" value={weapon} onChange={(e) => setWeapon(e.target.value)}>
              <option value="">Desarmado</option>
              {weapons.map((w) => (
                <option key={w} value={w}>{humanWeapon(w)}</option>
              ))}
            </Select>
          </Field>
        )}
        <Cost>{costText(kind)}</Cost>
        <Buttons>
          <CancelButton type="button" onClick={onCancel}>Cancelar</CancelButton>
          <AccentConfirmButton type="button" onClick={send}>
            {needsDestination(kind) ? "Escolher a casa" : "Enviar"}
          </AccentConfirmButton>
        </Buttons>
      </Dialog>
    </Overlay>
  );
}

const Kinds = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

// Fonte e cor declaradas, não herdadas: o `* { font-family }` do ResetStyle vence a herança
// do Dialog e deixava os rótulos na serifa do navegador.
const Choice = styled.label<{ $disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: ${fonts.sans};
  font-size: 15px;
  color: ${colors.textPrimary};
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: ${fonts.sans};
  font-size: 14px;
  color: ${colors.textPrimary};
`;

const Select = styled.select`
  padding: 6px 8px;
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  background: ${colors.surfaceInput};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 14px;

  & option {
    font-family: ${fonts.sans};
    color: ${colors.textPrimary};
  }
`;

const Cost = styled.p`
  margin: 0;
  font-family: ${fonts.sans};
  font-size: 14px;
  line-height: 1.5;
  color: ${colors.textMuted};
`;
