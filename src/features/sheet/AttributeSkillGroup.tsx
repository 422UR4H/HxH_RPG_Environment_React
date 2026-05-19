import styled from "styled-components";
import type { Skill } from "../../types/characterSheet.ts";
import ExpBar from "../../components/ions/ExpBar.tsx";

interface SkillCardProps {
  name: string;
  value: number;
  level: number;
  currExp?: number;
  nextLvlBaseExp?: number;
}

function SkillCard({ name, value, level, currExp, nextLvlBaseExp }: SkillCardProps) {
  return (
    <SkillItem>
      <SkillCardBody>
        <SkillName>{name.charAt(0).toUpperCase() + name.slice(1)}</SkillName>
        <SkillNumbers>
          <SkillValue>{value}</SkillValue>
          <SkillLevel>Lv {level}</SkillLevel>
        </SkillNumbers>
      </SkillCardBody>
      <ExpBar currExp={currExp ?? 0} maxExp={nextLvlBaseExp ?? 1} />
    </SkillItem>
  );
}

interface AttributeSkillGroupProps {
  attributeName: string;
  attributePower?: number;
  attributeCurrExp?: number;
  attributeNextLvlBaseExp?: number;
  skillsSubList: string[];
  skillsList?: Record<string, Skill>;
}

export default function AttributeSkillGroup({
  attributeName,
  attributePower = 0,
  attributeCurrExp,
  attributeNextLvlBaseExp,
  skillsSubList,
  skillsList,
}: AttributeSkillGroupProps) {
  return (
    <AttributeSkillContainer>
      <AttributeSectionTitle>
        <AttributeTitle>{attributeName}</AttributeTitle>
        <AttributePower>Lv {attributePower}</AttributePower>
      </AttributeSectionTitle>
      <ExpBar currExp={attributeCurrExp ?? 0} maxExp={attributeNextLvlBaseExp ?? 1} />
      <SkillsSubList>
        {skillsSubList.map((skName) => (
          <SkillCard
            key={skName}
            name={skName}
            value={skillsList?.[skName]?.value ?? 0}
            level={skillsList?.[skName]?.level ?? 0}
            currExp={skillsList?.[skName]?.currExp}
            nextLvlBaseExp={skillsList?.[skName]?.nextLvlBaseExp}
          />
        ))}
      </SkillsSubList>
    </AttributeSkillContainer>
  );
}

const AttributeSkillContainer = styled.div`
  margin-bottom: 3cqi;
  border: 1px solid #555;
  border-radius: 8px;
  overflow: hidden;
`;

const AttributeSectionTitle = styled.div`
  background-color: #444;
  padding: 8px 12px;
  font-weight: bold;
  font-family: "Oswald", sans-serif;
  font-size: 24px;
  border-bottom: 1px solid #555;
  display: flex;
  gap: 16px;
`;

const AttributeTitle = styled.h3`
  font-family: "Roboto", sans-serif;
  font-size: 6cqi;
  color: #b1b1b1;
`;

const AttributePower = styled.h3`
  font-family: "Roboto", sans-serif;
  font-size: 6cqi;
  color: #b1b1b1;
`;

const SkillsSubList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(30cqi, 1fr));
  gap: 2cqi;
  padding: 2cqi;
  background-color: #333333;
`;

const SkillItem = styled.div`
  background-color: #444;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const SkillCardBody = styled.div`
  padding: 2.8cqi 2.6cqi 0 2.6cqi;
`;

const SkillName = styled.div`
  font-family: "Roboto", sans-serif;
  font-size: 5cqi;
  font-weight: 500;
  margin-bottom: 2cqi;
`;

const SkillNumbers = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 0 2px;
  margin-bottom: 2cqi;
`;

const SkillValue = styled.div`
  font-family: "Roboto", sans-serif;
  font-size: 6cqi;
  font-weight: bold;
  color: white;
`;

const SkillLevel = styled.div`
  font-family: "Roboto", sans-serif;
  font-size: 5cqi;
  color: #9f9f9f;
`;
