import styled from "styled-components";
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

const ProficiencyItem = styled.div`
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
  font-family: "Roboto", sans-serif;
  font-weight: 500;
  font-size: min(22px, 5cqi);
`;

const ProficiencyLevel = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: min(22px, 5cqi);
  color: ${colors.textInputDisabled};
`;
