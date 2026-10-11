import { useState } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { ReactionKind } from "./combatMessages";
import { costLabel, weaponLabel } from "./combatText";
import { defaultWeaponOf } from "./actionDraft";
import {
  REACTION_BARS, REACTION_BUTTONS, REACTION_BUTTON_LABELS, needsDestination, reactionKindOf, supportsEvasion,
} from "./reactionModel";
import type { ReactionButton } from "./reactionModel";
import {
  ChoiceLabel, Toggle, Toggles, Weapon, WeaponList, WeaponName,
} from "./choiceStyles";
import {
  AccentConfirmButton, Buttons, CancelButton, Dialog, DialogTitle, Overlay,
} from "./dialogStyles";

/**
 * O custo do tipo em texto, a partir da tabela do contrato. O consumo é condicional: só existe
 * se havia uma ação na fila naquela barra — sem ela a reação não consome nada nem rola pior.
 */
function costText(kind: ReactionKind): string {
  const bars = REACTION_BARS[kind];
  if (bars.length === 0) return "Não cobra nada";
  const base = `Custo: ${costLabel(bars)}. Se você tinha uma ação na fila nessa barra, ela é consumida e a reação rola com Desvantagem`;
  // A fuga para a mesma casa do movimento que estava na fila não é troca (regra do servidor).
  return needsDestination(kind) ? `${base} — menos se fugir para a mesma casa do movimento da fila.` : `${base}.`;
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
  // Fist é o Desarmado (o catálogo sempre o traz, então não há opção vazia à parte). Vale a arma
  // do rascunho, se está no catálogo; senão a primeira arma real (`defaultWeaponOf`); sem
  // nenhuma — ou catálogo ainda vazio — Desarmado.
  const options = weapons.length > 0 ? weapons : ["Fist"];
  const [weapon, setWeapon] = useState(() =>
    defaultWeapon && weapons.includes(defaultWeapon) ? defaultWeapon : (defaultWeaponOf(weapons) ?? "Fist"),
  );

  const evasionOn = supportsEvasion(button) && evasion;
  const kind = reactionKindOf(button, evasionOn);
  const title = `Reagir — ${name}`;

  const send = () => {
    if (kind === "repel") onSend({ kind, weapon });
    else onSend({ kind });
  };

  return (
    <Overlay onClick={onCancel}>
      <Dialog role="dialog" aria-modal aria-label={title} onClick={(e) => e.stopPropagation()}>
        <DialogTitle>{title}</DialogTitle>
        <Toggles role="radiogroup" aria-label="Tipo de reação">
          {REACTION_BUTTONS.map((b) => (
            <Toggle
              key={b}
              type="button"
              role="radio"
              $tone="move"
              aria-checked={button === b}
              onClick={() => setButton(b)}
            >
              {REACTION_BUTTON_LABELS[b]}
            </Toggle>
          ))}
        </Toggles>
        {/* Fora do grupo: é um interruptor que refina Esquivar/Escapar, não um sexto tipo. */}
        <Toggle
          type="button"
          $tone="move"
          aria-pressed={evasionOn}
          disabled={!supportsEvasion(button)}
          title={supportsEvasion(button) ? undefined : "Só em Esquivar e Escapar"}
          onClick={() => setEvasion(!evasion)}
        >
          Evasão (fechada)
        </Toggle>
        {button === "repel" && (
          <Field>
            <ChoiceLabel id="repel-weapon">Arma</ChoiceLabel>
            <WeaponList role="radiogroup" aria-labelledby="repel-weapon">
              {options.map((w) => (
                <Weapon key={w} type="button" role="radio" aria-checked={weapon === w} onClick={() => setWeapon(w)}>
                  <WeaponName>{weaponLabel(w)}</WeaponName>
                </Weapon>
              ))}
            </WeaponList>
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

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Cost = styled.p`
  margin: 0;
  font-family: ${fonts.sans};
  font-size: 14px;
  line-height: 1.5;
  color: ${colors.textMuted};
`;
