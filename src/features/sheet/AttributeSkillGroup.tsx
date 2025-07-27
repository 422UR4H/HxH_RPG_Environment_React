import styled from "styled-components";
import { type Skill } from "../../types/characterSheet.ts";

interface AttributeSkillGroupProps {
  attributeName: string;
  attributePower: number;
  skillsSubList: string[];
  skillsList: Record<string, Skill>;
}

export default function AttributeSkillGroup({
  attributeName,
  attributePower,
  skillsSubList,
  skillsList,
}: AttributeSkillGroupProps) {
  return (
    <AttributeSkillContainer>
      <AttributeSectionTitle>
        <AttributeTitle>{attributeName}</AttributeTitle>
        <AttributePower>{attributePower}</AttributePower>
      </AttributeSectionTitle>
      <SkillsSubList>
        {skillsSubList.map(
          (skName) =>
            skillsList[skName] && (
              <SkillItem key={skName}>
                <SkillName>
                  {skName.charAt(0).toUpperCase() + skName.slice(1)}
                </SkillName>
                <SkillNumbers>
                  <SkillValue>{skillsList[skName].valueForTest}</SkillValue>
                  <SkillLevel>Lv {skillsList[skName].level}</SkillLevel>
                </SkillNumbers>
              </SkillItem>
            )
        )}
      </SkillsSubList>
    </AttributeSkillContainer>
  );
}

const AttributeSkillContainer = styled.div`
  margin-bottom: 10px;
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
  color: #b1b1b1;
`;

const AttributePower = styled.h3`
  font-family: "Roboto", sans-serif;
  color: #b1b1b1;
`;

const SkillsSubList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 10px;
  padding: 10px;
  background-color: #3a3a3a;
`;

const SkillItem = styled.div`
  background-color: #444;
  border-radius: 6px;
  padding: 10px 10px 8px 10px;
  display: flex;
  flex-direction: column;
`;

const SkillName = styled.div`
  font-family: "Roboto", sans-serif;
  font-size: 19px;
  font-weight: 500;
  margin-bottom: 5px;
`;

const SkillNumbers = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 0 2px;
`;

const SkillValue = styled.div`
  font-family: "Roboto", sans-serif;
  font-size: 28px;
  font-weight: bold;
  color: white;
`;

const SkillLevel = styled.div`
  font-family: "Roboto", sans-serif;
  font-size: 20px;
  color: #9f9f9f;
  padding-bottom: 2px;
`;
