import styled from "styled-components";
import type { ProficiencyMode } from "./types/proficiencyMode";
import type { JointProficiency } from "../../types/characterSheet";

interface ProficienciesListProps {
  mode: ProficiencyMode;
  commonProfs?: Record<string, { level: number }>;
  jointProfs?: JointProficiency[];
}

export default function ProficienciesList({
  mode,
  commonProfs,
  jointProfs,
}: ProficienciesListProps) {
  return (
    <ProficienciesListContainer>
      {commonProfs &&
        Object.entries(commonProfs).map(([name, { level }]) => (
          <ProficiencyItem key={name}>
            <ProficiencyName>
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </ProficiencyName>
            <ProficiencyLevel>Level: {level}</ProficiencyLevel>
          </ProficiencyItem>
        ))}
      {/* TODO: diff of the commonProfs */}
      {jointProfs && jointProfs.length > 0 && (
        <>
          {jointProfs.map(({ name, level }) => (
            <ProficiencyItem key={name}>
              <ProficiencyName>
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </ProficiencyName>
              <ProficiencyLevel>Level: {level}</ProficiencyLevel>
            </ProficiencyItem>
          ))}
        </>
      )}
    </ProficienciesListContainer>
  );
}

const ProficienciesListContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 300px));
  gap: 15px;
`;

const ProficiencyItem = styled.div`
  font-size: 24px;
  background-color: #444;
  border-radius: 6px;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  color: #9f9f9f;
`;
