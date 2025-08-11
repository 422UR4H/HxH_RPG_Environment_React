import type { CharacterSheet } from "../../types/characterSheet";
import styled from "styled-components";
import BackButton from "../../components/ions/BackButton";
import CharacterSheetHeader from "../../components/molecules/CharacterSheetHeader";
import CharacterProfile from "./CharacterProfile";
import PhysicalsDiagram from "./PhysicalsDiagram";
import MentalsDiagram from "./MentalsDiagram";
import NenPrinciplesDiagram from "./NenPrinciplesDiagram";
import PhysicalSkillsGroup from "./PhysicalSkillsGroup";
import SpiritualSkillsGroup from "./SpiritualSkillsGroup";
import ProficienciesList from "./ProficienciesList";
import type { SheetMode } from "./types/sheetMode";

interface CharacterSheetTemplateProps {
  sheetMode: SheetMode;
  charSheet?: CharacterSheet;
}

function CharacterSheetTemplate({
  sheetMode,
  charSheet,
}: CharacterSheetTemplateProps) {
  const {
    profile,
    characterClass,
    // categoryName,
    status,
    // characterExp,
    // talent,
    abilities,
    physicalAttributes,
    mentalAttributes,
    spiritualAttributes,
    physicalSkills,
    spiritualSkills,
    principles,
    // categories,
    commonProficiencies,
  } = charSheet || {};

  return (
    <SheetContainer>
      <BackButton to={"/charactersheets"} />

      <CharacterSheetHeader
        mode={sheetMode.headerMode}
        cover={undefined} // add field here when it exists in the API response
        avatar={undefined} // add field here when it exists in the API response
        nick={profile?.nickname}
        characterClass={characterClass}
        lvls={[]}
        health={status?.health}
        stamina={status?.stamina}
      />

      {/* <HeaderSection>
        <CharacterMeta>
          {categoryName && (
            <MetaItem>
              <Label>Categoria:</Label> {categoryName}
            </MetaItem>
          )}
        </CharacterMeta>
      </HeaderSection>

      <StatusSection>
        <ExperienceSection>
          <SectionTitle>Experiência</SectionTitle>
          <ExperienceBar>
            <ExpLabel>Nível {characterExp.level}</ExpLabel>
            <ExpBarContainer>
              <ExpBarFill
                style={{
                  width: `${
                    (characterExp.currExp /
                      (characterExp.currExp + characterExp.nextLvlBaseExp)) *
                    100
                  }%`,
                }}
              />
            </ExpBarContainer>
            <ExpValue>
              {characterExp.currExp} /{" "}
              {characterExp.currExp + characterExp.nextLvlBaseExp}
            </ExpValue>
          </ExperienceBar>
          <ExpTotal>EXP Total: {characterExp.exp}</ExpTotal>
        </ExperienceSection>
      </StatusSection> */}

      <CharacterProfile mode={sheetMode.profileMode} profileInfo={profile} />

      <GridSection>
        <AttributesSection>
          <SectionTitle>ATRIBUTOS</SectionTitle>
          <PhysicalsDiagram
            mode={sheetMode.diagramsMode}
            attributes={physicalAttributes}
            physicalAbility={abilities?.physicals}
          />
          <MentalsDiagram
            mode={sheetMode.diagramsMode}
            attributes={mentalAttributes}
            mentalAbility={abilities?.mentals}
          />

          <SectionTitle>PRINCÍPIOS</SectionTitle>
          <NenPrinciplesDiagram
            mode={sheetMode.diagramsMode}
            principles={principles}
            spiritualAbility={abilities?.spirituals}
          />
        </AttributesSection>

        <SkillsSection>
          <SectionTitle>PERÍCIAS</SectionTitle>

          <SkillsGroup>
            <GroupTitle>Físicas</GroupTitle>
            <PhysicalSkillsGroup
              mode={sheetMode.skillsMode}
              attributes={physicalAttributes}
              skills={physicalSkills}
            />
          </SkillsGroup>

          <SkillsGroup>
            <GroupTitle>Espirituais</GroupTitle>
            <SpiritualSkillsGroup
              mode={sheetMode.skillsMode}
              attributes={spiritualAttributes}
              skills={spiritualSkills}
            />
          </SkillsGroup>
        </SkillsSection>
      </GridSection>

      {/* <AbilitiesSection>
        <SectionTitle>Habilidades</SectionTitle>
        <AbilitiesList>
          {Object.entries(abilities).map(([name, ability]) => (
            <AbilityItem key={name}>
              <AbilityName>{name}</AbilityName>
              <AbilityMeta>
                <AbilityLevel>Nível: {ability.level}</AbilityLevel>
                <AbilityBonus>Bônus: +{ability.bonus}</AbilityBonus>
              </AbilityMeta>
            </AbilityItem>
          ))}
        </AbilitiesList>
      </AbilitiesSection> */}

      <ProficienciesSection>
        <SectionTitle>Proficiências</SectionTitle>
        <ProficienciesList
          mode={sheetMode.proficiencyMode}
          commonProfs={commonProficiencies}
        />
      </ProficienciesSection>
    </SheetContainer>
  );
}
export default CharacterSheetTemplate;

const SheetContainer = styled.div`
  container-type: inline-size;
  max-width: 940px;
  margin: 0 auto;
  color: white;
  background-color: black;
  position: relative;
  padding-bottom: 30px;
`;

// const HeaderSection = styled.div`
//   margin-bottom: 30px;
//   border-bottom: 1px solid #444;
//   padding-bottom: 20px;
// `;

// const CharacterMeta = styled.div`
//   display: flex;
//   flex-wrap: wrap;
//   gap: 15px;
//   margin-bottom: 15px;
// `;

// const MetaItem = styled.div`
//   font-size: 26px;
// `;

// const Label = styled.span`
//   color: #9f9f9f;
//   margin-right: 5px;
// `;

// const StatusSection = styled.section`
//   margin-bottom: 30px;
//   background-color: #3a3a3a;
//   border-radius: 8px;
//   padding: 20px;
// `;

// const BarContainer = styled.div`
//   flex-grow: 1;
//   height: 20px;
//   background-color: #444;
//   border-radius: 7px;
//   overflow: hidden;
// `;

// const BarFill = styled.div`
//   height: 100%;
//   transition: width 0.3s ease;
// `;

// const ExperienceSection = styled.div`
//   margin-top: 20px;
// `;

// const ExperienceBar = styled.div`
//   font-size: 24px;
//   display: flex;
//   align-items: center;
//   gap: 10px;
//   margin-top: 10px;
// `;

// const ExpLabel = styled.span`
//   width: 90px;
//   font-weight: bold;
// `;

// const ExpBarContainer = styled.div`
//   flex-grow: 1;
//   height: 20px;
//   background-color: #444;
//   border-radius: 7px;
//   overflow: hidden;
// `;

// const ExpBarFill = styled.div`
//   height: 100%;
//   background-color: #f39c12;
//   transition: width 0.3s ease;
// `;

// const ExpValue = styled.span`
//   width: 120px;
//   text-align: right;
// `;

// const ExpTotal = styled.div`
//   margin-top: 10px;
//   text-align: right;
//   color: #9f9f9f;
// `;

const SectionTitle = styled.h2`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  font-size: 8cqi;
  color: white;
  margin-bottom: 5cqi;
  padding-left: 1cqi;
`;

const GridSection = styled.div`
  padding: 30px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 30px;

  @media (max-width: 609px) {
    padding: 30px;
    padding-top: 0px;
  }
`;

const GroupTitle = styled.h3`
  font-family: "Roboto", sans-serif;
  font-size: 8cqi;
  color: #e0e0e0;
  margin-top: 5cqi;
  margin-bottom: 10px;
  padding-left: 1cqi;
`;

const AttributesSection = styled.section`
  container-type: inline-size;
  margin-top: 12px;

  display: flex;
  flex-direction: column;
  align-items: center;
`;

const SkillsSection = styled.section`
  container-type: inline-size;
  background-color: #3a3a3a;
  border-radius: 8px;
  padding: 4% 3% 1% 3%;
`;

const SkillsGroup = styled.div`
  /* margin-bottom: 20px; */
`;

// const AbilitiesSection = styled.section`
//   container-type: inline-size;
//   background-color: #3a3a3a;
//   border-radius: 8px;
//   padding: 20px;
//   margin-bottom: 30px;
// `;

// const AbilitiesList = styled.div`
//   display: grid;
//   grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
//   gap: 15px;
// `;

// const AbilityItem = styled.div`
//   background-color: #444;
//   border-radius: 6px;
//   padding: 15px;
// `;

// const AbilityName = styled.div`
//   font-weight: bold;
//   font-size: 26px;
//   margin-bottom: 10px;
// `;

// const AbilityMeta = styled.div`
//   display: flex;
//   justify-content: space-between;
// `;

// const AbilityLevel = styled.div`
//   font-size: 22px;
//   color: #e0e0e0;
// `;

// const AbilityBonus = styled.div`
//   font-size: 22px;
//   color: #2ecc71;
// `;

const ProficienciesSection = styled.section`
  container-type: inline-size;
  background-color: #3a3a3a;
  border-radius: 8px;
  margin: 0 30px;
  padding: 20px;
`;
