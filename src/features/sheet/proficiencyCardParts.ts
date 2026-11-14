import styled from "styled-components";
import { BAR_BUBBLE_FONT_SIZE } from "../../components/ions/BarBubble";
import { colors } from "../../styles/tokens";

/* Peças compartilhadas pelo card de proficiência comum e pelo conjunto. */
export const capitalize = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

// O balão da EXP acompanha o texto do card (sem isso, em tela larga ele dobra de tamanho e o card corta o topo).
export const textSize = "min(22px, 5cqi)";

// Texto secundário (dano, rótulo "N armas", lista de armas): 0.77 do texto do card, nunca abaixo de 14px no celular.
export const secondaryTextSize = `max(14px, calc(${textSize} * 0.77))`;

export const ProficiencyItem = styled.div`
  ${BAR_BUBBLE_FONT_SIZE}: ${textSize};
  font-size: 24px;
  background-color: ${colors.surfaceControl};
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  /* O overflow arredonda as pontas da barra de EXP. A seta do card conjunto e o balão da EXP
     ficam sempre dentro da caixa do card, então o corte não os atinge. */
  overflow: hidden;
`;

export const ProficiencyCardContent = styled.div<{ $hasBelow: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: ${({ $hasBelow }) => ($hasBelow ? "12px 15px 0" : "12px 15px 10px")};
`;

export const ProficiencyDamage = styled.div`
  padding: 2px 15px 10px;
  font-size: ${secondaryTextSize};
  color: ${colors.textMuted};
`;

export const ProficiencyName = styled.div`
  font-weight: 500;
  font-size: ${textSize};
`;

export const ProficiencyLevel = styled.div`
  font-weight: 400;
  font-size: ${textSize};
  color: ${colors.textInputDisabled};
`;
