import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useToken from "../hooks/useToken";
import { characterSheetsService } from "../services/characterSheetsService";
import type { CharacterSheet } from "../types/characterSheet";
import styled from "styled-components";
import PhysicalsDiagram from "../features/sheet/PhysicalsDiagram";
import MentalsDiagram from "../features/sheet/MentalsDiagram";
import NenPrinciplesDiagram from "../features/sheet/NenPrinciplesDiagram";
import CharacterSheetHeader from "../components/molecules/CharacterSheetHeader";

function CharacterSheetPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();
  const navigate = useNavigate();
  const [charSheet, setCharSheet] = useState<CharacterSheet | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) {
      navigate("/");
      return;
    }
    setIsLoading(true);

    characterSheetsService
      .getCharacterSheetDetails(token, id)
      .then(({ data }: { data: CharacterSheet | null }) => {
        // TODO: remove console
        console.log("Character Sheet Details:", data);

        setCharSheet(data);
        setError(null);
      })
      .catch((error) => {
        console.error("Error fetching character sheet details:", error);
        setError(
          "Falha ao carregar ficha do personagem. Tente novamente mais tarde."
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, id, navigate]);

  if (isLoading) {
    return (
      <LoadingContainer>Carregando ficha do personagem...</LoadingContainer>
    );
  }

  if (error) {
    return <ErrorContainer>{error}</ErrorContainer>;
  }

  if (!charSheet) {
    return <ErrorContainer>Ficha não encontrada</ErrorContainer>;
  }
  const {
    profile,
    characterClass,
    categoryName,
    status,
    characterExp,
    talent,
    abilities,
    physicalAttributes,
    mentalAttributes,
    spiritualAttributes,
    physicalSkills,
    spiritualSkills,
    principles,
    categories,
    commonProficiencies,
  } = charSheet.characterSheet;

  return (
    <SheetContainer>
      <BackButton onClick={() => navigate("/charactersheets")}>
        &larr;
      </BackButton>

      <CharacterSheetHeader
        cover={undefined} // add field here when it exists in the API response
        avatar={undefined} // add field here when it exists in the API response
        nick={profile.nickname}
        lvls={[]}
        health={status.health}
        stamina={status.stamina}
      />

      {/* <HeaderSection>
        <CharacterMeta>
          <MetaItem>
            <Label>Nome:</Label> {profile.fullname}
          </MetaItem>
          <MetaItem>
            <Label>Classe:</Label> {characterClass}
          </MetaItem>
          <MetaItem>
            <Label>Alinhamento:</Label> {profile.alignment}
          </MetaItem>
          {categoryName && (
            <MetaItem>
              <Label>Categoria:</Label> {categoryName}
            </MetaItem>
          )}
        </CharacterMeta>
        <CharacterDescription>{profile.briefDescription}</CharacterDescription>
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

      <GridSection>
        <AttributesSection>
          <SectionTitle>ATRIBUTOS</SectionTitle>

          <PhysicalsDiagram
            attributes={physicalAttributes}
            physicalAbility={abilities.physicals}
          />
          <MentalsDiagram
            attributes={mentalAttributes}
            mentalAbility={abilities.mentals}
          />
          <NenPrinciplesDiagram
            principles={principles}
            spiritualAbility={abilities.spirituals}
          />
        </AttributesSection>

        <SkillsSection>
          <SectionTitle>Perícias</SectionTitle>

          {/* Seção de Perícias Físicas - Agrupadas por atributo */}
          <SkillsGroup>
            <GroupTitle>Perícias Físicas</GroupTitle>

            {/* Resistance */}
            <AttributeSkillGroup>
              <AttributeTitle>Resistance</AttributeTitle>
              <SkillsSubList>
                {["defense", "energy", "vitality"].map(
                  (skillName) =>
                    physicalSkills[skillName] && (
                      <SkillItem key={skillName}>
                        <SkillName>{skillName}</SkillName>
                        <SkillValue>
                          {physicalSkills[skillName].valueForTest}
                        </SkillValue>
                        <SkillMeta>
                          Nível: {physicalSkills[skillName].level}
                        </SkillMeta>
                      </SkillItem>
                    )
                )}
              </SkillsSubList>
            </AttributeSkillGroup>

            {/* Strength */}
            <AttributeSkillGroup>
              <AttributeTitle>Strength</AttributeTitle>
              <SkillsSubList>
                {["carryCapacity", "grab", "push"].map(
                  (skillName) =>
                    physicalSkills[skillName] && (
                      <SkillItem key={skillName}>
                        <SkillName>{skillName}</SkillName>
                        <SkillValue>
                          {physicalSkills[skillName].valueForTest}
                        </SkillValue>
                        <SkillMeta>
                          Nível: {physicalSkills[skillName].level}
                        </SkillMeta>
                      </SkillItem>
                    )
                )}
              </SkillsSubList>
            </AttributeSkillGroup>

            {/* Agility */}
            <AttributeSkillGroup>
              <AttributeTitle>Agility</AttributeTitle>
              <SkillsSubList>
                {["accelerate", "brake", "velocity"].map(
                  (skillName) =>
                    physicalSkills[skillName] && (
                      <SkillItem key={skillName}>
                        <SkillName>{skillName}</SkillName>
                        <SkillValue>
                          {physicalSkills[skillName].valueForTest}
                        </SkillValue>
                        <SkillMeta>
                          Nível: {physicalSkills[skillName].level}
                        </SkillMeta>
                      </SkillItem>
                    )
                )}
              </SkillsSubList>
            </AttributeSkillGroup>

            {/* Action Speed */}
            <AttributeSkillGroup>
              <AttributeTitle>Action Speed</AttributeTitle>
              <SkillsSubList>
                {["attackSpeed", "feint", "repel"].map(
                  (skillName) =>
                    physicalSkills[skillName] && (
                      <SkillItem key={skillName}>
                        <SkillName>{skillName}</SkillName>
                        <SkillValue>
                          {physicalSkills[skillName].valueForTest}
                        </SkillValue>
                        <SkillMeta>
                          Nível: {physicalSkills[skillName].level}
                        </SkillMeta>
                      </SkillItem>
                    )
                )}
              </SkillsSubList>
            </AttributeSkillGroup>

            {/* Flexibility */}
            <AttributeSkillGroup>
              <AttributeTitle>Flexibility</AttributeTitle>
              <SkillsSubList>
                {["acrobatics", "evasion", "sneak"].map(
                  (skillName) =>
                    physicalSkills[skillName] && (
                      <SkillItem key={skillName}>
                        <SkillName>{skillName}</SkillName>
                        <SkillValue>
                          {physicalSkills[skillName].valueForTest}
                        </SkillValue>
                        <SkillMeta>
                          Nível: {physicalSkills[skillName].level}
                        </SkillMeta>
                      </SkillItem>
                    )
                )}
              </SkillsSubList>
            </AttributeSkillGroup>

            {/* Dexterity */}
            <AttributeSkillGroup>
              <AttributeTitle>Dexterity</AttributeTitle>
              <SkillsSubList>
                {["accuracy", "reflex", "stealth"].map(
                  (skillName) =>
                    physicalSkills[skillName] && (
                      <SkillItem key={skillName}>
                        <SkillName>{skillName}</SkillName>
                        <SkillValue>
                          {physicalSkills[skillName].valueForTest}
                        </SkillValue>
                        <SkillMeta>
                          Nível: {physicalSkills[skillName].level}
                        </SkillMeta>
                      </SkillItem>
                    )
                )}
              </SkillsSubList>
            </AttributeSkillGroup>

            {/* Sense */}
            <AttributeSkillGroup>
              <AttributeTitle>Sense</AttributeTitle>
              <SkillsSubList>
                {["hearing", "smell", "tact", "taste", "vision"].map(
                  (skillName) =>
                    physicalSkills[skillName] && (
                      <SkillItem key={skillName}>
                        <SkillName>{skillName}</SkillName>
                        <SkillValue>
                          {physicalSkills[skillName].valueForTest}
                        </SkillValue>
                        <SkillMeta>
                          Nível: {physicalSkills[skillName].level}
                        </SkillMeta>
                      </SkillItem>
                    )
                )}
              </SkillsSubList>
            </AttributeSkillGroup>

            {/* Constitution */}
            <AttributeSkillGroup>
              <AttributeTitle>Constitution</AttributeTitle>
              <SkillsSubList>
                {["breath", "heal", "tenacity"].map(
                  (skillName) =>
                    physicalSkills[skillName] && (
                      <SkillItem key={skillName}>
                        <SkillName>{skillName}</SkillName>
                        <SkillValue>
                          {physicalSkills[skillName].valueForTest}
                        </SkillValue>
                        <SkillMeta>
                          Nível: {physicalSkills[skillName].level}
                        </SkillMeta>
                      </SkillItem>
                    )
                )}
              </SkillsSubList>
            </AttributeSkillGroup>
          </SkillsGroup>

          {/* Perícias Espirituais */}
          <SkillsGroup>
            <GroupTitle>Perícias Espirituais</GroupTitle>
            <AttributeSkillGroup>
              <AttributeTitle>Spirit</AttributeTitle>
              <SkillsSubList>
                {Object.entries(spiritualSkills).map(([name, skill]) => (
                  <SkillItem key={name}>
                    <SkillName>{name}</SkillName>
                    <SkillValue>{skill.valueForTest}</SkillValue>
                    <SkillMeta>Nível: {skill.level}</SkillMeta>
                  </SkillItem>
                ))}
              </SkillsSubList>
            </AttributeSkillGroup>
          </SkillsGroup>
        </SkillsSection>
      </GridSection>

      <AbilitiesSection>
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
      </AbilitiesSection>

      <ProficienciesSection>
        <SectionTitle>Proficiências</SectionTitle>
        <ProficienciesList>
          {Object.entries(commonProficiencies).map(([name, prof]) => (
            <ProficiencyItem key={name}>
              <ProficiencyName>{name}</ProficiencyName>
              <ProficiencyLevel>Nível: {prof.level}</ProficiencyLevel>
            </ProficiencyItem>
          ))}
        </ProficienciesList>
      </ProficienciesSection>
    </SheetContainer>
  );
}
export default CharacterSheetPage;

const SheetContainer = styled.div`
  max-width: 940px;
  margin: 0 auto;
  color: white;
  background-color: black;
  position: relative;
`;

const BackButton = styled.button`
  position: fixed;
  z-index: 10;
  left: 16px;
  top: 16px;

  background-color: #444;
  border: none;
  /* border: 3px black solid; */
  border-radius: 12px;
  padding: 0 10px 12px 10px;

  color: white;
  font-size: 40px;
  cursor: pointer;

  /* &:hover {
    text-decoration: underline;
  } */
`;

const HeaderSection = styled.div`
  margin-bottom: 30px;
  border-bottom: 1px solid #444;
  padding-bottom: 20px;
`;

const CharacterMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 15px;
`;

const MetaItem = styled.div`
  font-size: 26px;
`;

const Label = styled.span`
  color: #9f9f9f;
  margin-right: 5px;
`;

const CharacterDescription = styled.p`
  font-size: 22px;
  line-height: 1.5;
  color: #e0e0e0;
`;

const StatusSection = styled.section`
  margin-bottom: 30px;
  background-color: #3a3a3a;
  border-radius: 8px;
  padding: 20px;
`;

const BarContainer = styled.div`
  flex-grow: 1;
  height: 20px;
  background-color: #444;
  border-radius: 7px;
  overflow: hidden;
`;

const BarFill = styled.div`
  height: 100%;
  transition: width 0.3s ease;
`;

const ExperienceSection = styled.div`
  margin-top: 20px;
`;

const ExperienceBar = styled.div`
  font-size: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
`;

const ExpLabel = styled.span`
  width: 90px;
  font-weight: bold;
`;

const ExpBarContainer = styled.div`
  flex-grow: 1;
  height: 20px;
  background-color: #444;
  border-radius: 7px;
  overflow: hidden;
`;

const ExpBarFill = styled.div`
  height: 100%;
  background-color: #f39c12;
  transition: width 0.3s ease;
`;

const ExpValue = styled.span`
  width: 120px;
  text-align: right;
`;

const ExpTotal = styled.div`
  margin-top: 10px;
  text-align: right;
  color: #9f9f9f;
`;

const SectionTitle = styled.h2`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  font-size: 7cqi;
  color: white;
  margin-top: 3cqi;
  margin-bottom: 5cqi;
`;

const AttributeSkillGroup = styled.div`
  margin-bottom: 15px;
  border: 1px solid #555;
  border-radius: 8px;
  overflow: hidden;
`;

const AttributeTitle = styled.div`
  background-color: #444;
  padding: 8px 12px;
  font-weight: bold;
  color: #b1b1b1;
  font-family: "Oswald", sans-serif;
  font-size: 24px;
  border-bottom: 1px solid #555;
`;

const SkillsSubList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(125px, 1fr));
  gap: 10px;
  padding: 10px;
  background-color: #3a3a3a;
`;

const GridSection = styled.div`
  padding: 30px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 30px;
  margin-bottom: 30px;
`;

const GroupTitle = styled.h3`
  font-size: 26px;
  font-family: "Oswald", sans-serif;
  font-size: 26px;
  color: #e0e0e0;
  margin-bottom: 10px;
`;

const AttributesSection = styled.section`
  container-type: inline-size;
  background-color: black;
  border-radius: 8px;
  margin-bottom: 30px;

  display: flex;
  flex-direction: column;
  align-items: center;
`;

const SkillsSection = styled.section`
  container-type: inline-size;
  background-color: #3a3a3a;
  border-radius: 8px;
  padding: 20px;
`;

const SkillsGroup = styled.div`
  margin-bottom: 20px;
`;

const SkillItem = styled.div`
  background-color: #444;
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
`;

const SkillName = styled.div`
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 5px;
`;

const SkillValue = styled.div`
  font-size: 38px;
  font-weight: bold;
  color: #ffa216;
  margin-bottom: 5px;
`;

const SkillMeta = styled.div`
  font-size: 22px;
  color: #9f9f9f;
`;

const AbilitiesSection = styled.section`
  container-type: inline-size;
  background-color: #3a3a3a;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
`;

const AbilitiesList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
`;

const AbilityItem = styled.div`
  background-color: #444;
  border-radius: 6px;
  padding: 15px;
`;

const AbilityName = styled.div`
  font-weight: bold;
  font-size: 26px;
  margin-bottom: 10px;
`;

const AbilityMeta = styled.div`
  display: flex;
  justify-content: space-between;
`;

const AbilityLevel = styled.div`
  font-size: 22px;
  color: #e0e0e0;
`;

const AbilityBonus = styled.div`
  font-size: 22px;
  color: #2ecc71;
`;

const ProficienciesSection = styled.section`
  container-type: inline-size;
  background-color: #3a3a3a;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
`;

const ProficienciesList = styled.div`
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
  font-weight: bold;
`;

const ProficiencyLevel = styled.div`
  font-size: 20px;
  color: #ffa216;
  font-weight: bold;
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
