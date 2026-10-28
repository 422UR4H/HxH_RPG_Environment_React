import styled from "styled-components";
import { BAR_BUBBLE_FONT_SIZE } from "../../components/ions/BarBubble";
import ExpBar from "../../components/ions/ExpBar";
import { colors } from "../../styles/tokens";

export interface ProficiencyCardProps {
  name: string;
  level: number;
  currExp?: number;
  nextLvlBaseExp?: number;
}

export default function ProficiencyCard({ name, level, currExp, nextLvlBaseExp }: ProficiencyCardProps) {
  return (
    <ProficiencyItem>
      <ProficiencyCardContent>
        <ProficiencyName>{name.charAt(0).toUpperCase() + name.slice(1)}</ProficiencyName>
        <ProficiencyLevel>Level: {level}</ProficiencyLevel>
      </ProficiencyCardContent>
      <ExpBar currExp={currExp ?? 0} maxExp={nextLvlBaseExp ?? 1} />
    </ProficiencyItem>
  );
}

// O balão da EXP acompanha o texto do card (sem isso, em tela larga ele dobra de tamanho e o card corta o topo).
const textSize = "min(22px, 5cqi)";

const ProficiencyItem = styled.div`
  ${BAR_BUBBLE_FONT_SIZE}: ${textSize};
  font-size: 24px;
  background-color: ${colors.surfaceControl};
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ProficiencyCardContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 15px 10px;
`;

const ProficiencyName = styled.div`
  font-weight: 500;
  font-size: ${textSize};
`;

const ProficiencyLevel = styled.div`
  font-weight: 400;
  font-size: ${textSize};
  color: ${colors.textInputDisabled};
`;
