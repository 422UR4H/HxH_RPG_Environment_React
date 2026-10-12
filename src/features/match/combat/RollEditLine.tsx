import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { EditActionPayload } from "./combatMessages";
import RollConditionEditor from "./RollConditionEditor";
import { SYSTEM_BIAS_REASON, describeCondition, systemBiasText, type EditableRoll } from "./rollEdits";

/** As perícias que medem o dano de um ataque (o motor só conhece estas duas). */
const DAMAGE_SKILLS = ["Push", "Grab"];
/** "Nenhuma perícia mede o dano" (`edit_action damageSkill: "None"`): só os dados e o bônus da arma. */
export const NO_DAMAGE_SKILL = "None";

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
  onOpen,
  onClose,
  onSend,
}: {
  roll: EditableRoll;
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
      {open && <RollConditionEditor roll={roll} onSend={onSend} onClose={onClose} />}
    </>
  );
}

/**
 * "Medido por" Push / Grab: a perícia que mede o dano. Clicar no outro troca na hora (sem
 * Aplicar); clicar no marcado desmarca — nenhuma perícia mede o dano. Uma perícia fora das duas
 * aparece como terceiro botão marcado e desabilitado (só leitura).
 */
export function DamageSkillPicker({ current, onPick }: { current: string; onPick: (skill: string) => void }) {
  return (
    <RollRow>
      <span>medido por</span>
      {DAMAGE_SKILLS.map((name) => (
        <SkillToggle
          key={name}
          type="button"
          aria-pressed={current === name}
          onClick={() => onPick(current === name ? NO_DAMAGE_SKILL : name)}
        >
          {name}
        </SkillToggle>
      ))}
      {current === NO_DAMAGE_SKILL && <Muted>nenhuma — só a arma</Muted>}
      {!DAMAGE_SKILLS.includes(current) && current !== NO_DAMAGE_SKILL && (
        <SkillToggle type="button" disabled aria-pressed="true">
          {current}
        </SkillToggle>
      )}
    </RollRow>
  );
}

const RollRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

const EditButton = styled.button`
  font-family: ${fonts.sans};
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

// Mesmo visual do Toggle de viés em RollConditionEditor: o ativo vira preenchido.
const SkillToggle = styled(EditButton)`
  &[aria-pressed="true"] {
    background: ${colors.brandAccent};
    border-color: ${colors.brandAccent};
  }
`;

const Applied = styled.span`
  color: ${colors.warningText};
`;

// O que o sistema aplicou sozinho: contornado, para não se confundir com a condição do mestre.
const SystemApplied = styled.span`
  align-self: flex-start;
  padding: 1px 6px;
  border: 1px solid ${colors.warningText};
  border-radius: 999px;
  color: ${colors.warningText};
  font-size: 11px;
`;

const Muted = styled.span`
  color: ${colors.textPlaceholderStrong};
  font-size: 12px;
`;
