import type { CharacterClass } from "../../types/characterClass";
import type { CharacterSheet } from "../../types/characterSheet";
import type { SheetMode } from "./types/sheetMode";
import styled from "styled-components";
import space from "../../assets/images/space.png";
import BackButton from "../../components/ions/BackButton";
import CharacterSheetHeader from "../../components/molecules/CharacterSheetHeader";
import CharacterProfile from "./CharacterProfile";
import PhysicalsDiagram from "./PhysicalsDiagram";
import MentalsDiagram from "./MentalsDiagram";
import NenPrinciplesDiagram from "./NenPrinciplesDiagram";
import PhysicalSkillsGroup from "./PhysicalSkillsGroup";
import SpiritualSkillsGroup from "./SpiritualSkillsGroup";
import ProficienciesList from "./ProficienciesList";

interface Data {
  error: string | null;
  isLoading: boolean;

  charSheet?: CharacterSheet;
  setCharSheet?: (charSheet: CharacterSheet) => void;
  charClasses?: CharacterClass[];
  selectedClass?: CharacterClass;
  applyClassDistribution?: (className: string) => void;
}

interface CharacterSheetTemplateProps {
  sheetMode: SheetMode;
  data: Data;
}

function CharacterSheetTemplate({
  data: { charSheet, setCharSheet, charClasses, isLoading, error },
  sheetMode,
}: CharacterSheetTemplateProps) {
  if (!charSheet) return <ErrorContainer>Ficha não encontrada</ErrorContainer>;
  const {
    // categoryName,
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
    jointProficiencies,
  } = charSheet;
  const spiritualAbility = abilities?.spirituals;
  const physicalAbility = abilities?.physicals;
  const mentalAbility = abilities?.mentals;

  if (isLoading)
    return (
      <LoadingContainer>Carregando ficha do personagem...</LoadingContainer>
    );
  if (error) return <ErrorContainer>{error}</ErrorContainer>;

  const mode = sheetMode.headerMode;
  if ((mode === "create" || mode === "edit") && !charClasses) {
    return <ErrorContainer>Falha ao carregar classes</ErrorContainer>;
  }

  return (
    <SheetContainer>
      <BackButton to={"/charactersheets"} />

      <CharacterSheetHeader
        mode={sheetMode.headerMode}
        data={{ charSheet, setCharSheet, charClasses }}
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

      <CharacterProfile
        mode={sheetMode.profileMode}
        charSheet={charSheet}
        setCharSheet={setCharSheet}
      />

      <MainContent>
        <GridSection>
          <AttributesSection>
            <SectionTitle>ATRIBUTOS</SectionTitle>
            <PhysicalsDiagram
              mode={sheetMode.diagramsMode}
              attributes={physicalAttributes}
              physicalAbility={physicalAbility}
            />
            <MentalsDiagram
              mode={sheetMode.diagramsMode}
              attributes={mentalAttributes}
              mentalAbility={mentalAbility}
            />

            {spiritualAbility?.level! > 0 && (
              <>
                <SectionTitle>PRINCÍPIOS</SectionTitle>
                <NenPrinciplesDiagram
                  mode={sheetMode.diagramsMode}
                  principles={principles}
                  spiritualAbility={spiritualAbility}
                />
              </>
            )}
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

            {spiritualAbility?.level! > 0 && (
              <SkillsGroup>
                <GroupTitle>Espirituais</GroupTitle>
                <SpiritualSkillsGroup
                  mode={sheetMode.skillsMode}
                  attributes={spiritualAttributes}
                  skills={spiritualSkills}
                />
              </SkillsGroup>
            )}
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
            jointProfs={jointProficiencies}
          />
        </ProficienciesSection>
      </MainContent>
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
//   background-color: #333333;
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

const MainContent = styled.main`
  padding-bottom: 30px;
  background-image: url(${space});
  background-size: cover;
  background-position: center;
  /* background-position: top; */
  background-repeat: no-repeat;

  @media (max-width: 609px) {
    padding-bottom: 20px;
  }
`;

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
    padding: 20px;
    padding-top: 30px;
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
  padding-bottom: 8cqi;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  /* justify-content: space-around; */

  @media (max-width: 589px) {
    padding-bottom: 0;
  }
`;

const SkillsSection = styled.section`
  container-type: inline-size;
  background-color: #333333;
  border-radius: 8px;
  padding: 4% 3% 1% 3%;
`;

const SkillsGroup = styled.div`
  /* margin-bottom: 20px; */
`;

// const AbilitiesSection = styled.section`
//   container-type: inline-size;
//   background-color: #333333;
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
  background-color: #333333;
  border-radius: 8px;
  margin: 0 30px;
  padding: 20px;

  @media (max-width: 609px) {
    margin: 0 20px;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  font-size: 24px;
  color: white;
`;

const ErrorContainer = styled.div`
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  margin: 30px;
  font-size: 18px;
`;
