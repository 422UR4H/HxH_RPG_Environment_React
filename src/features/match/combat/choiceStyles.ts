import styled, { css } from "styled-components";
import { colors, fonts } from "../../../styles/tokens";

// Os seletores da mesa: escolher entre poucas opções é tocar num botão, nunca a bolinha de
// rádio ou a caixinha nativa do navegador (destoam do resto e são pequenas para o dedo).
// Ligado/escolhido é aria-pressed (interruptor) ou aria-checked (opção de um `radiogroup`).

type Tone = "move" | "attack";

const toneColor = (tone: Tone) => (tone === "move" ? colors.moveIntent : colors.pieceAttackIntent);
const toneBg = (tone: Tone) => (tone === "move" ? colors.moveIntentBg : colors.attackIntentBg);

/** Botões grandes lado a lado (2 por linha): Mover/Atacar, o tipo de reação, a categoria da cena. */
export const Toggles = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

export const Toggle = styled.button<{ $tone: Tone }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid ${colors.borderInput};
  background: ${colors.surfaceInput};
  color: ${colors.textMuted};
  font-family: ${fonts.sans};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &[aria-pressed="true"],
  &[aria-checked="true"] {
    ${({ $tone }) => css`
      border-color: ${toneColor($tone)};
      background: ${toneBg($tone)};
      color: ${colors.textPrimary};
      box-shadow: inset 0 0 0 1px ${toneColor($tone)};
    `}
  }
`;

export const ToggleIcon = styled.span`
  font-size: 15px;
`;

export const Segmented = styled.div`
  display: inline-flex;
  align-self: flex-start;
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  overflow: hidden;
`;

export const Segment = styled.button`
  border: none;
  background: transparent;
  color: ${colors.textPlaceholderStrong};
  font-family: ${fonts.sans};
  font-size: 13px;
  padding: 6px 14px;
  cursor: pointer;

  & + & {
    border-left: 1px solid ${colors.borderInput};
  }

  &[aria-checked="true"] {
    background: ${colors.moveIntentBg};
    color: ${colors.textPrimary};
    font-weight: 600;
  }
`;

export const WeaponList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const Weapon = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid ${colors.borderInput};
  background: ${colors.surfaceInput};
  color: ${colors.textMuted};
  font-family: ${fonts.sans};
  cursor: pointer;
  text-align: left;

  &[aria-checked="true"] {
    border-color: ${colors.pieceAttackIntent};
    background: ${colors.attackIntentBg};
    color: ${colors.textPrimary};
  }
`;

export const WeaponName = styled.span`
  font-size: 13px;
  font-weight: 600;
`;

export const WeaponStats = styled.span`
  font-size: 11px;
  color: ${colors.textPlaceholderStrong};
`;

/** O rótulo de um grupo de escolha num diálogo ("Categoria", "Arma"). */
export const ChoiceLabel = styled.span`
  font-family: ${fonts.sans};
  font-size: 13px;
  font-weight: 600;
  color: ${colors.textMuted};
`;
