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
import BackButton from "../components/ions/BackButton";
import CharacterProfile from "../features/sheet/CharacterProfile";
import PhysicalSkillsGroup from "../features/sheet/PhysicalSkillsGroup";
import SpiritualSkillsGroup from "../features/sheet/SpiritualSkillsGroup";
import ProficienciesList from "../features/sheet/ProficienciesList";

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
      <BackButton to={"/charactersheets"} />

      <CharacterSheetHeader
        cover={undefined} // add field here when it exists in the API response
        avatar={undefined} // add field here when it exists in the API response
        nick={profile.nickname}
        characterClass={characterClass}
        lvls={[]}
        health={status.health}
        stamina={status.stamina}
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
        fullname={profile.fullname}
        briefDescription={profile.briefDescription}
        birthday={profile.birthday}
        alignment={profile.alignment}
      />

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

          <SectionTitle>PRINCÍPIOS</SectionTitle>
          <NenPrinciplesDiagram
            principles={principles}
            spiritualAbility={abilities.spirituals}
          />
        </AttributesSection>

        <SkillsSection>
          <SectionTitle>PERÍCIAS</SectionTitle>

          <SkillsGroup>
            <GroupTitle>Físicas</GroupTitle>
            <PhysicalSkillsGroup
              attributes={physicalAttributes}
              skills={physicalSkills}
            />
          </SkillsGroup>

          <SkillsGroup>
            <GroupTitle>Espirituais</GroupTitle>
            <SpiritualSkillsGroup
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
        <ProficienciesList commonProfs={commonProficiencies} />
      </ProficienciesSection>
    </SheetContainer>
  );
}
export default CharacterSheetPage;

const SheetContainer = styled.div`
  container-type: inline-size;
  max-width: 940px;
  margin: 0 auto;
  color: white;
  background-color: black;
  position: relative;
  padding-bottom: 30px;
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
  margin: 0 30px;
  padding: 20px;
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
