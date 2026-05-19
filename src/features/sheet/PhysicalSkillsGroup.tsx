import styled from "styled-components";
import AttributeSkillGroup from "./AttributeSkillGroup";
import type { Attribute, Skill } from "../../types/characterSheet";
import type { SkillsMode } from "./types/skillsMode";

interface PhysicalSkillsGroupProps {
  mode: SkillsMode;
  attributes?: Record<string, Attribute>;
  skills?: Record<string, Skill>;
}

export default function PhysicalSkillsGroup({ attributes, skills }: PhysicalSkillsGroupProps) {
  return (
    <SkillsGroupContainer>
      <AttributeSkillGroup
        attributeName="Resistance"
        attributePower={attributes?.["resistance"]?.power}
        attributeCurrExp={attributes?.["resistance"]?.currExp}
        attributeNextLvlBaseExp={attributes?.["resistance"]?.nextLvlBaseExp}
        skillsSubList={["defense", "energy", "vitality"]}
        skillsList={skills}
      />
      <AttributeSkillGroup
        attributeName="Strength"
        attributePower={attributes?.["strength"]?.power}
        attributeCurrExp={attributes?.["strength"]?.currExp}
        attributeNextLvlBaseExp={attributes?.["strength"]?.nextLvlBaseExp}
        skillsSubList={["carry", "grab", "push"]}
        skillsList={skills}
      />
      <AttributeSkillGroup
        attributeName="Agility"
        attributePower={attributes?.["agility"]?.power}
        attributeCurrExp={attributes?.["agility"]?.currExp}
        attributeNextLvlBaseExp={attributes?.["agility"]?.nextLvlBaseExp}
        skillsSubList={["accelerate", "brake", "velocity"]}
        skillsList={skills}
      />
      <AttributeSkillGroup
        attributeName="Celerity"
        attributePower={attributes?.["celerity"]?.power}
        attributeCurrExp={attributes?.["celerity"]?.currExp}
        attributeNextLvlBaseExp={attributes?.["celerity"]?.nextLvlBaseExp}
        skillsSubList={["legerity", "feint", "repel"]}
        skillsList={skills}
      />
      <AttributeSkillGroup
        attributeName="Flexibility"
        attributePower={attributes?.["flexibility"]?.power}
        attributeCurrExp={attributes?.["flexibility"]?.currExp}
        attributeNextLvlBaseExp={attributes?.["flexibility"]?.nextLvlBaseExp}
        skillsSubList={["acrobatics", "evasion", "sneak"]}
        skillsList={skills}
      />
      <AttributeSkillGroup
        attributeName="Dexterity"
        attributePower={attributes?.["dexterity"]?.power}
        attributeCurrExp={attributes?.["dexterity"]?.currExp}
        attributeNextLvlBaseExp={attributes?.["dexterity"]?.nextLvlBaseExp}
        skillsSubList={["accuracy", "reflex", "stealth"]}
        skillsList={skills}
      />
      <AttributeSkillGroup
        attributeName="Sense"
        attributePower={attributes?.["sense"]?.power}
        attributeCurrExp={attributes?.["sense"]?.currExp}
        attributeNextLvlBaseExp={attributes?.["sense"]?.nextLvlBaseExp}
        skillsSubList={["hearing", "smell", "tact", "taste", "vision"]}
        skillsList={skills}
      />
      <AttributeSkillGroup
        attributeName="Constitution"
        attributePower={attributes?.["constitution"]?.power}
        attributeCurrExp={attributes?.["constitution"]?.currExp}
        attributeNextLvlBaseExp={attributes?.["constitution"]?.nextLvlBaseExp}
        skillsSubList={["breath", "heal", "tenacity"]}
        skillsList={skills}
      />
    </SkillsGroupContainer>
  );
}

const SkillsGroupContainer = styled.div``;
