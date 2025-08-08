import styled from "styled-components";
import AttributeSkillGroup from "./AttributeSkillGroup";
import type { Attribute, Skill } from "../../types/characterSheet";

interface SpiritualSkillsGroupProps {
  attributes: Record<string, Attribute>;
  skills: Record<string, Skill>;
}
export default function SpiritualSkillsGroup({
  attributes,
  skills,
}: SpiritualSkillsGroupProps) {
  return (
    <SkillsGroupContainer>
      <AttributeSkillGroup
        attributeName={"Spirit"}
        attributePower={attributes.spirit.power}
        skillsSubList={["focus", "nen", "willPower"]}
        skillsList={skills}
      />
    </SkillsGroupContainer>
  );
}

const SkillsGroupContainer = styled.div``;
