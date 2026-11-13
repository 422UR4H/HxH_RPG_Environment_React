import { useMemo } from "react";
import styled, { css } from "styled-components";
import BackgroundButton from "../../components/atoms/BackgroundButton";
import type { Profile } from "../../types/characterSheet";
import { colors } from "../../styles/tokens";
import { errorBox } from "../../styles/errorBox";
import { DetailItem, DetailLabel, ProfilePillSelect } from "./ProfileFieldStyles";
import { toDateInputValue } from "../../utils/date";
import { NO_EMOJI_MESSAGE, SHEET_LIMITS, containsEmoji } from "../../constants/fieldLimits";
import { useLimitedInput } from "../../utils/limitedInput";
import useFieldValidation from "../../hooks/useFieldValidation";

interface ProfileInputsProps {
  profile?: Profile;
  onProfileChange?: (profile: Profile) => void;
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

const AGE_MESSAGE = "A idade deve ser maior que zero.";

function maxDaysForMonth(month: number): number {
  if (month === 2) return 29;
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

export default function ProfileInputs({
  profile,
  onProfileChange,
  onBackgroundClick,
}: ProfileInputsProps) {
  const handleInputChange = (field: keyof Profile, value: string | number) => {
    if (!profile || !onProfileChange) return;
    onProfileChange({ ...profile, [field]: value });
  };
  const age = profile?.age ?? 0;
  const { errorFor, noticeFor, touch } = useFieldValidation({
    fullname: {
      value: profile?.fullname ?? "",
      required: true,
      min: SHEET_LIMITS.fullname.min,
      minMessage: `O nome completo deve ter pelo menos ${SHEET_LIMITS.fullname.min} caracteres.`,
      max: SHEET_LIMITS.fullname.max,
      validate: (v) => (containsEmoji(v) ? NO_EMOJI_MESSAGE : null),
    },
    briefDescription: {
      value: profile?.briefDescription ?? "",
      max: SHEET_LIMITS.briefDescription.max,
    },
    // O estado guarda 0 para "vazio"; "0" faz a regra rodar e acusar a idade.
    age: {
      value: String(age),
      validate: (v) => (Number(v) < 1 ? AGE_MESSAGE : null),
    },
  });
  const fullnameLimit = useLimitedInput<HTMLInputElement>(
    SHEET_LIMITS.fullname.max,
    profile?.fullname ?? "",
    (value) => {
      handleInputChange("fullname", value);
      // O erro de emoji aparece já na digitação, sem esperar o blur.
      if (containsEmoji(value)) touch("fullname");
    },
  );
  const descriptionLimit = useLimitedInput<HTMLTextAreaElement>(
    SHEET_LIMITS.briefDescription.max,
    profile?.briefDescription ?? "",
    (value) => handleInputChange("briefDescription", value),
  );
  const fullnameFeedback = errorFor("fullname") ?? noticeFor("fullname");
  const descriptionNotice = noticeFor("briefDescription");
  const ageError = errorFor("age");

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
          aria-invalid={errorFor("fullname") ? true : undefined}
          aria-describedby={fullnameFeedback ? "profile-fullname-feedback" : undefined}
          value={profile?.fullname || ""}
          {...fullnameLimit}
          onBlur={() => touch("fullname")}
        />
        {fullnameFeedback && (
          <FieldFeedback id="profile-fullname-feedback" $error={!!errorFor("fullname")}>
            {fullnameFeedback}
          </FieldFeedback>
        )}
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
          aria-describedby={descriptionNotice ? "profile-brief-description-feedback" : undefined}
          value={profile?.briefDescription || ""}
          {...descriptionLimit}
        />
        {descriptionNotice && (
          <FieldFeedback id="profile-brief-description-feedback" $error={false}>
            {descriptionNotice}
          </FieldFeedback>
        )}
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
                min={1}
                aria-invalid={ageError ? true : undefined}
                aria-describedby={ageError ? "profile-age-feedback" : undefined}
                value={age > 0 ? age : ""}
                onChange={(e) =>
                  handleInputChange("age", Math.max(0, parseInt(e.target.value, 10) || 0))
                }
                onBlur={() => touch("age")}
              />
              {ageError && (
                <FieldFeedback id="profile-age-feedback" $error>
                  {ageError}
                </FieldFeedback>
              )}
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

  /* Depois do :focus: o vermelho vence também com o campo focado. */
  &[aria-invalid="true"] {
    border-color: ${colors.feedbackDanger};
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

  /* Depois do :focus: o vermelho vence também com o campo focado. */
  &[aria-invalid="true"] {
    border-color: ${colors.feedbackDanger};
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

const FieldFeedback = styled.p<{ $error: boolean }>`
  margin: 4px 0 0;
  font-size: max(2.4cqi, 12px);
  line-height: 1.2;
  color: ${colors.textMuted};
  ${({ $error }) =>
    $error &&
    css`
      ${errorBox}
      line-height: 1.2;
    `}
`;
