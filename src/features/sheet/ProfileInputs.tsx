import { useMemo } from "react";
import styled from "styled-components";
import BackgroundButton from "../../components/atoms/BackgroundButton";
import type { Profile, CharacterSheet } from "../../types/characterSheet";
import { colors } from "../../styles/tokens";
import { DetailItem, DetailLabel, ProfilePillSelect } from "./ProfileFieldStyles";
import { toDateInputValue } from "../../utils/date";

interface ProfileInputsProps {
  charSheet?: CharacterSheet;
  setCharSheet?: (charSheet: CharacterSheet) => void;
  onBackgroundClick: () => void;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho", "Agosto",
  "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

const MONTH_OPTIONS = MONTH_NAMES.map((name, i) => ({ value: String(i + 1), label: name }));

const ALIGNMENT_OPTIONS = [
  { value: "", label: "Unaligned" },
  { value: "Lawful-Good", label: "Lawful Good" },
  { value: "Lawful-Neutral", label: "Lawful Neutral" },
  { value: "Lawful-Evil", label: "Lawful Evil" },
  { value: "Neutral-Good", label: "Neutral Good" },
  { value: "Neutral-Neutral", label: "True Neutral" },
  { value: "Neutral-Evil", label: "Neutral Evil" },
  { value: "Chaotic-Good", label: "Chaotic Good" },
  { value: "Chaotic-Neutral", label: "Chaotic Neutral" },
  { value: "Chaotic-Evil", label: "Chaotic Evil" },
];

function maxDaysForMonth(month: number): number {
  if (month === 2) return 29;
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

export default function ProfileInputs({
  charSheet,
  setCharSheet,
  onBackgroundClick,
}: ProfileInputsProps) {
  const handleInputChange = (field: keyof Profile, value: string | number) => {
    if (!charSheet || !setCharSheet) return;
    setCharSheet({
      ...charSheet,
      profile: {
        ...charSheet.profile,
        [field]: value,
      },
    });
  };
  const profile = charSheet?.profile;
  const defaultAge = 20;

  const birthdayParts = toDateInputValue(
    profile?.birthday ?? "0000-01-01T00:00:00.000Z"
  ).split("-");
  const currentMonth = parseInt(birthdayParts[1]);
  const currentDay = parseInt(birthdayParts[2]);
  // A lista de dias muda com o mês; a identidade estável evita recalcular a posição da lista aberta.
  const maxDays = maxDaysForMonth(currentMonth);
  const dayOptions = useMemo(
    () =>
      Array.from({ length: maxDays }, (_, i) => ({
        value: String(i + 1),
        label: String(i + 1),
      })),
    [maxDays],
  );

  return (
    <ProfileContainer>
      <SpacedField>
        <DetailLabel as="label" htmlFor="profile-fullname">
          Nome completo:
        </DetailLabel>
        <ProfileNameInput
          id="profile-fullname"
          type="text"
          autoComplete="off"
          placeholder="Nome completo do personagem"
          value={profile?.fullname || ""}
          onChange={(e) => handleInputChange("fullname", e.target.value)}
        />
      </SpacedField>

      <SpacedField>
        <DetailLabel as="label" htmlFor="profile-brief-description">
          Descrição breve:
        </DetailLabel>
        <ProfileDescriptionTextarea
          id="profile-brief-description"
          autoComplete="off"
          placeholder="Breve descrição do personagem"
          rows={2}
          value={profile?.briefDescription || ""}
          onChange={(e) => handleInputChange("briefDescription", e.target.value)}
        />
      </SpacedField>

      <ProfileContent>
        <LeftDetails>
          <BirthdayAgeRow>
            <DetailItem role="group" aria-labelledby="profile-birthday-label">
              <DetailLabel id="profile-birthday-label">Aniversário:</DetailLabel>
              <BirthdaySelects>
                <ProfilePillSelect
                  aria-label="Mês"
                  value={String(currentMonth)}
                  options={MONTH_OPTIONS}
                  onChange={(value) => {
                    const newMonth = parseInt(value);
                    const clampedDay = Math.min(currentDay, maxDaysForMonth(newMonth));
                    const mm = String(newMonth).padStart(2, "0");
                    const dd = String(clampedDay).padStart(2, "0");
                    handleInputChange("birthday", `0000-${mm}-${dd}T00:00:00.000Z`);
                  }}
                />
                <ProfilePillSelect
                  aria-label="Dia"
                  value={String(currentDay)}
                  options={dayOptions}
                  onChange={(value) => {
                    const mm = String(currentMonth).padStart(2, "0");
                    const dd = String(parseInt(value)).padStart(2, "0");
                    handleInputChange("birthday", `0000-${mm}-${dd}T00:00:00.000Z`);
                  }}
                />
              </BirthdaySelects>
            </DetailItem>

            <DetailItem>
              <DetailLabel as="label" htmlFor="profile-age">
                Idade:
              </DetailLabel>
              <AgeInput
                id="profile-age"
                type="number"
                value={profile?.age || defaultAge}
                onChange={(e) => handleInputChange("age", parseInt(e.target.value, 10) || 0)}
              />
            </DetailItem>
          </BirthdayAgeRow>

          <AlignmentBackgroundRow>
            <DetailItem>
              <DetailLabel id="profile-alignment-label">
                Alinhamento:
              </DetailLabel>
              <AlignmentContainer>
                <ProfilePillSelect
                  id="profile-alignment"
                  aria-labelledby="profile-alignment-label"
                  value={profile?.alignment ?? ""}
                  options={ALIGNMENT_OPTIONS}
                  onChange={(value) => handleInputChange("alignment", value)}
                />
              </AlignmentContainer>
            </DetailItem>
            <MobileOnlyButton>
              <BackgroundButton onClick={onBackgroundClick} />
            </MobileOnlyButton>
          </AlignmentBackgroundRow>
        </LeftDetails>

        <RightDetails>
          <BackgroundButton onClick={onBackgroundClick} />
        </RightDetails>
      </ProfileContent>
    </ProfileContainer>
  );
}

const ProfileContainer = styled.div`
  container-type: inline-size;
  padding: 20px 30px;
`;

const ProfileNameInput = styled.input`
  font-size: min(4.2cqi, 32px);
  font-weight: bold;
  color: ${colors.textPrimary};
  background-color: ${colors.surfaceNeutral};
  border: 2px solid ${colors.borderStrong};
  border-radius: 6px;
  padding: 12px 16px;
  width: 100%;

  &::placeholder {
    color: ${colors.textInputDisabled};
    font-weight: normal;
  }

  &:focus {
    outline: none;
    border-color: ${colors.brandAccent};
  }

  @media (max-width: 609px) {
    font-size: 5cqi;
  }
`;

const ProfileDescriptionTextarea = styled.textarea`
  font-size: min(3.4cqi, 24px);
  line-height: 1.6;
  color: ${colors.textPrimary};
  background-color: ${colors.surfaceNeutral};
  border: 2px solid ${colors.borderStrong};
  border-radius: 6px;
  padding: 12px 16px;
  width: 100%;
  resize: vertical;
  min-height: 80px;

  &::placeholder {
    color: ${colors.textInputDisabled};
  }

  &:focus {
    outline: none;
    border-color: ${colors.brandAccent};
  }

  @media (max-width: 609px) {
    font-size: 4.6cqi;
  }
`;

const ProfileContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 30px;
`;

const LeftDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
`;

const RightDetails = styled.div`
  display: flex;
  justify-content: center;

  /* @media (max-width: 609px) { */
  @media (max-width: 509px) {
    display: none;
  }
`;

const DetailInput = styled.input`
  font-size: min(3.8cqi, 28px);
  font-weight: 600;
  color: ${colors.textPrimary};
  background-color: ${colors.surfaceNeutral};
  border: 2px solid ${colors.borderStrong};
  border-radius: 6px;
  padding: 12px 16px;

  &::placeholder {
    color: ${colors.textInputDisabled};
    font-weight: normal;
  }

  &:focus {
    outline: none;
    border-color: ${colors.brandAccent};
  }

  /* Remove increment/decrement from input type number */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* Firefox */
  &[type="number"] {
    -moz-appearance: textfield;
  }

  @media (max-width: 609px) {
    font-size: 4.6cqi;
  }
`;
const BirthdayAgeRow = styled.div`
  display: flex;
  gap: 4cqi;
`;

const BirthdaySelects = styled.div`
  display: flex;
  gap: 1.6cqi;
`;

const AlignmentBackgroundRow = styled.div`
  display: contents;

  /* @media (max-width: 609px) { */
  @media (max-width: 509px) {
    display: flex;
    justify-content: flex-start;
    gap: calc(10% + 20px);
  }
`;

const MobileOnlyButton = styled.div`
  display: none;

  /* @media (max-width: 609px) { */
  @media (max-width: 509px) {
    display: flex;
  }
`;

const AgeInput = styled(DetailInput)`
  width: min(14cqi, 90px);
  font-size: min(3.8cqi, 28px);
  padding: 10px min(4cqi, 16px);
`;

const AlignmentContainer = styled.div`
  display: flex;
  gap: 12px;
`;

const SpacedField = styled(DetailItem)`
  margin-bottom: 2cqi;
`;
