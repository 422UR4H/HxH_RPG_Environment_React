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
import SheetBottomActions from "./SheetBottomActions";

interface Data {
  error: string | null;
  isLoading: boolean;

  charSheet?: CharacterSheet;
  setCharSheet?: (charSheet: CharacterSheet) => void;
  charClasses?: CharacterClass[];
  selectedClass?: CharacterClass;
  applyClassDistribution?: (className: string) => void;
  onCampaignClick?: () => void;
  hasCampaign?: boolean;
  onAcceptSubmission?: () => void;
  onRejectSubmission?: () => void;
  onAvatarSelected?: (blob: Blob | null, url: string | null) => void;
  onCoverSelected?: (blob: Blob | null, url: string | null) => void;
  onCreateSheet?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  submitError?: string | null;
  manage?: {
    isFree: boolean;
    onEdit: () => void;
    onDelete: () => void;
  };
}

interface CharacterSheetTemplateProps {
  sheetMode: SheetMode;
  data: Data;
}

function CharacterSheetTemplate({
  data: {
    charSheet,
    setCharSheet,
    charClasses,
    isLoading,
    error,
    onCampaignClick,
    hasCampaign,
    onAcceptSubmission,
    onRejectSubmission,
    onAvatarSelected,
    onCoverSelected,
    onCreateSheet,
    onCancel,
    submitLabel,
    submitError,
    manage,
  },
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
  const selectedClass = charClasses?.find(
    (cc) => cc.profile.name === charSheet.characterClass,
  );

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
      <BackButton />

      <CharacterSheetHeader
        mode={sheetMode.headerMode}
        data={{
          charSheet,
          setCharSheet,
          charClasses,
          onAvatarSelected,
          onCoverSelected,
        }}
      />

      <CharacterProfile
        mode={sheetMode.profileMode}
        charSheet={charSheet}
        setCharSheet={setCharSheet}
      />

      <MainContent
        $hasBottomActions={
          sheetMode.headerMode === "view" &&
          !!(
            onCampaignClick ||
            manage ||
            onAcceptSubmission ||
            onRejectSubmission
          )
        }
      >
        <GridSection>
          <AttributesSection>
            <SectionTitle>ATRIBUTOS</SectionTitle>
            <PhysicalsDiagram
              key={`physical-${charSheet?.characterClass ?? "none"}`}
              mode={sheetMode.diagramsMode}
              attributes={physicalAttributes}
              physicalAbility={physicalAbility}
            />
            <MentalsDiagram
              key={`mental-${charSheet?.characterClass ?? "none"}`}
              mode={sheetMode.diagramsMode}
              attributes={mentalAttributes}
              mentalAbility={mentalAbility}
            />

            {(spiritualAbility?.level ?? 0) > 0 && (
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

            {(spiritualAbility?.level ?? 0) > 0 && (
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

        <ProficienciesSection>
          <SectionTitle>Proficiências</SectionTitle>
          <ProficienciesList
            key={charSheet?.characterClass ?? "none"}
            mode={sheetMode.proficiencyMode}
            commonProfs={commonProficiencies}
            jointProfs={jointProficiencies}
            distribution={
              sheetMode.proficiencyMode === "create"
                ? selectedClass?.distribution
                : undefined
            }
            charSheet={
              sheetMode.proficiencyMode === "create" ? charSheet : undefined
            }
            setCharSheet={
              sheetMode.proficiencyMode === "create" ? setCharSheet : undefined
            }
          />
        </ProficienciesSection>

        {sheetMode.headerMode === "view" && (onCampaignClick || manage) && (
          <SheetBottomActions
            onCampaignClick={onCampaignClick}
            campaignLabel={hasCampaign ? "Ver Campanha" : "Procurar Campanhas"}
            manage={manage}
          />
        )}

        {sheetMode.headerMode === "view" &&
          (onAcceptSubmission || onRejectSubmission) && (
            <SubmissionActionsWrapper>
              {onRejectSubmission && (
                <RejectButton onClick={onRejectSubmission}>
                  Rejeitar
                </RejectButton>
              )}
              {onAcceptSubmission && (
                <AcceptButton onClick={onAcceptSubmission}>
                  Aceitar
                </AcceptButton>
              )}
            </SubmissionActionsWrapper>
          )}

        {(sheetMode.headerMode === "create" ||
          sheetMode.headerMode === "edit-profile") && (
          <CreateSheetArea>
            {submitError && <SubmitErrorText>{submitError}</SubmitErrorText>}
            <SheetButtonsRow>
              {onCancel && (
                <CancelButton onClick={onCancel}>Cancelar</CancelButton>
              )}
              {onCreateSheet && (
                <CreateSheetButton onClick={onCreateSheet}>
                  {submitLabel ?? "+ Criar Ficha"}
                </CreateSheetButton>
              )}
            </SheetButtonsRow>
          </CreateSheetArea>
        )}
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

const MainContent = styled.main<{ $hasBottomActions?: boolean }>`
  position: relative;
  padding-bottom: ${({ $hasBottomActions }) =>
    $hasBottomActions ? "135px" : "30px"};
  background-image: url(${space});
  background-size: cover;
  background-position: center;
  /* background-position: top; */
  background-repeat: no-repeat;

  @media (max-width: 609px) {
    padding-bottom: ${({ $hasBottomActions }) =>
      $hasBottomActions ? "130px" : "20px"};
  }

  @media (max-width: 440px) {
    padding-bottom: ${({ $hasBottomActions }) =>
      $hasBottomActions ? "110px" : "20px"};
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

const SubmissionActionsWrapper = styled.div`
  position: absolute;
  bottom: 22px;
  left: 0;
  width: 100%;
  height: 91px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  padding: 0 3.2%;
`;

const SubmissionActionBase = styled.button`
  font-family: "Roboto", sans-serif;
  font-size: 26px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  height: 100%;
  flex: 1;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-3px);
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }
`;

const AcceptButton = styled(SubmissionActionBase)`
  background: #107135;
  color: white;
`;

const RejectButton = styled(SubmissionActionBase)`
  background: #b61b40;
  color: white;
`;

const SheetButtonsRow = styled.div`
  display: flex;
  gap: 12px;
  margin: 24px 30px 0;

  @media (max-width: 609px) {
    margin: 20px 20px 0;
  }
`;

const SheetButtonBase = styled.button`
  font-family: "Roboto", sans-serif;
  font-size: min(26px, 5cqi);
  font-weight: 600;

  border: none;
  border-radius: 8px;
  padding: 2cqi 28px;

  cursor: pointer;
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }

  @media (max-width: 440px) {
    height: 46px;
  }
`;

const CreateSheetButton = styled(SheetButtonBase)`
  flex: 1;
  background: linear-gradient(to bottom, #ffa216 0%, #ffa216 20%, #e60000 100%);
  color: black;
`;

const CancelButton = styled(SheetButtonBase)`
  flex: 0;
  white-space: nowrap;
  padding-inline: 50px;
  background-color: transparent;
  color: white;
  border: 1px solid white;

  @media (max-width: 440px) {
    padding-inline: 28px;
  }
`;

const CreateSheetArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  /* padding-bottom: 16px; */
`;

const SubmitErrorText = styled.p`
  font-family: "Roboto", sans-serif;
  font-size: max(2.7cqi, 12px);
  line-height: 1.2;
  color: #ff1c1c;
  background: rgba(231, 76, 60, 0.08);
  border-left: 3px solid #ff1c1c;
  margin: 16px 30px 0;
  padding: 10px 14px;
  border-radius: 0 8px 8px 0;
  white-space: pre-line;

  @media (max-width: 609px) {
    margin: 12px 20px 0;
  }
`;
