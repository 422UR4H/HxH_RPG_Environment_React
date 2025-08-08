import styled from "styled-components";
import AttributeSkillGroup from "./AttributeSkillGroup";
import type { Attribute, Skill } from "../../types/characterSheet";

interface PhysicalSkillsGroupProps {
  attributes: Record<string, Attribute>;
  skills: Record<string, Skill>;
}
export default function PhysicalSkillsGroup({
  attributes,
  skills,
}: PhysicalSkillsGroupProps) {
  return (
    <SkillsGroupContainer>
      <AttributeSkillGroup
        attributeName={"Resistance"}
        attributePower={attributes["resistance"].power}
        skillsSubList={["defense", "energy", "vitality"]}
        skillsList={skills}
      />

      <AttributeSkillGroup
        attributeName={"Strength"}
        attributePower={attributes["strength"].power}
        skillsSubList={["carry", "grab", "push"]}
        skillsList={skills}
      />

      <AttributeSkillGroup
        attributeName={"Agility"}
        attributePower={attributes["agility"].power}
        skillsSubList={["accelerate", "brake", "velocity"]}
        skillsList={skills}
      />

      <AttributeSkillGroup
        attributeName={"Celerity"}
        attributePower={attributes["celerity"].power}
        skillsSubList={["legerity", "feint", "repel"]}
        skillsList={skills}
      />

      <AttributeSkillGroup
        attributeName={"Flexibility"}
        attributePower={attributes["flexibility"].power}
        skillsSubList={["acrobatics", "evasion", "sneak"]}
        skillsList={skills}
      />

      <AttributeSkillGroup
        attributeName={"Dexterity"}
        attributePower={attributes["dexterity"].power}
        skillsSubList={["accuracy", "reflex", "stealth"]}
        skillsList={skills}
      />

      <AttributeSkillGroup
        attributeName={"Sense"}
        attributePower={attributes["sense"].power}
        skillsSubList={["hearing", "smell", "tact", "taste", "vision"]}
        skillsList={skills}
      />

      <AttributeSkillGroup
        attributeName={"Constitution"}
        attributePower={attributes["constitution"].power}
        skillsSubList={["breath", "heal", "tenacity"]}
        skillsList={skills}
      />
    </SkillsGroupContainer>
  );
}

const SkillsGroupContainer = styled.div``;
