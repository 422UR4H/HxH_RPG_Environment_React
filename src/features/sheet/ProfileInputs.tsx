import styled, { keyframes } from "styled-components";
import BackgroundButton from "../../components/atoms/BackgroundButton";
import type { Profile, CharacterSheet } from "../../types/characterSheet";
import BaseOption from "../../components/ions/BaseOption";
import BaseSelect from "../../components/ions/BaseSelect";

interface ProfileInputsProps {
  charSheet?: CharacterSheet;
  setCharSheet?: (charSheet: CharacterSheet) => void;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho", "Agosto",
  "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

function maxDaysForMonth(month: number): number {
  if (month === 2) return 29;
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

export default function ProfileInputs({
  charSheet,
  setCharSheet,
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

  const birthdayParts = (profile?.birthday ?? "0000-01-01T00:00:00.000Z")
    .split("T")[0]
    .split("-");
  const currentMonth = parseInt(birthdayParts[1]);
  const currentDay = parseInt(birthdayParts[2]);
  const alignmentOptions: { value: string; label: string }[] = [
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

  return (
    <ProfileContainer>
      <ProfileNameInput
        type="text"
        placeholder="Nome completo do personagem"
        value={profile?.fullname || ""}
        onChange={(e) => handleInputChange("fullname", e.target.value)}
      />

      <ProfileDescriptionTextarea
        placeholder="Breve descrição do personagem"
        rows={2}
        value={profile?.description || ""}
        onChange={(e) => handleInputChange("description", e.target.value)}
      />

      <ProfileContent>
        <LeftDetails>
          <BirthdayAgeRow>
            <DetailItem>
              <DetailLabel>Aniversário:</DetailLabel>
              <BirthdayRow>
                <BaseSelect
                  value={String(currentMonth)}
                  onChange={(e) => {
                    const newMonth = parseInt(e.target.value);
                    const clampedDay = Math.min(currentDay, maxDaysForMonth(newMonth));
                    const mm = String(newMonth).padStart(2, "0");
                    const dd = String(clampedDay).padStart(2, "0");
                    handleInputChange("birthday", `0000-${mm}-${dd}T00:00:00.000Z`);
                  }}
                >
                  {MONTH_NAMES.map((name, i) => (
                    <BaseOption key={name} value={String(i + 1)}>
                      {name}
                    </BaseOption>
                  ))}
                </BaseSelect>
                <BaseSelect
                  value={String(currentDay)}
                  onChange={(e) => {
                    const mm = String(currentMonth).padStart(2, "0");
                    const dd = String(parseInt(e.target.value)).padStart(2, "0");
                    handleInputChange("birthday", `0000-${mm}-${dd}T00:00:00.000Z`);
                  }}
                >
                  {Array.from({ length: maxDaysForMonth(currentMonth) }, (_, i) => i + 1).map(
                    (day) => (
                      <BaseOption key={day} value={String(day)}>
                        {String(day)}
                      </BaseOption>
                    )
                  )}
                </BaseSelect>
              </BirthdayRow>
            </DetailItem>

            <DetailItem>
              <DetailLabel>Idade:</DetailLabel>
              <AgeInput
                type="number"
                value={profile?.age || defaultAge}
                onChange={(e) => handleInputChange("age", parseInt(e.target.value, 10) || 0)}
              />
            </DetailItem>
          </BirthdayAgeRow>

          <DetailItem>
            <DetailLabel>Alinhamento:</DetailLabel>
            <AlignmentContainer>
              {/* <AlignmentSelect defaultValue="Neutral">
                <option value="Lawful">Lawful</option>
                <option value="Neutral">Neutral</option>
                <option value="Chaotic">Chaotic</option>
              </AlignmentSelect>

              <AlignmentSelect defaultValue="Neutral">
                <option value="Good">Good</option>
                <option value="Neutral">Neutral</option>
                <option value="Evil">Evil</option>
              </AlignmentSelect> */}

              <BaseSelect
                value={profile?.alignment ?? ""}
                onChange={(e) => handleInputChange("alignment", e.target.value)}
              >
                {alignmentOptions.map((opt) => (
                  <BaseOption key={opt.label} value={opt.value}>
                    {opt.label}
                  </BaseOption>
                ))}
              </BaseSelect>
            </AlignmentContainer>
          </DetailItem>
        </LeftDetails>

        <RightDetails>
          <BackgroundButton />
        </RightDetails>
      </ProfileContent>
    </ProfileContainer>
  );
}

const slideDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const ProfileContainer = styled.div`
  container-type: inline-size;
  padding: 20px 30px;
  animation: ${slideDown} 0.3s ease;
`;

const ProfileNameInput = styled.input`
  font-family: "Roboto", sans-serif;
  font-size: min(4.2cqi, 32px);
  font-weight: bold;
  color: white;
  background-color: #555;
  border: 2px solid #666;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 2cqi;
  width: 100%;

  &::placeholder {
    color: #9f9f9f;
    font-weight: normal;
  }

  &:focus {
    outline: none;
    border-color: #088e3b;
  }

  @media (max-width: 609px) {
    font-size: 5cqi;
  }
`;

const ProfileDescriptionTextarea = styled.textarea`
  font-family: "Roboto", sans-serif;
  font-size: min(3.4cqi, 24px);
  line-height: 1.6;
  color: white;
  background-color: #555;
  border: 2px solid #666;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 2cqi;
  width: 100%;
  resize: vertical;
  min-height: 80px;

  &::placeholder {
    color: #9f9f9f;
  }

  &:focus {
    outline: none;
    border-color: #088e3b;
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

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DetailLabel = styled.span`
  font-family: "Roboto", sans-serif;
  font-size: min(3.4cqi, 24px);
  color: #9f9f9f;
  font-weight: 500;

  @media (max-width: 609px) {
    font-size: 4cqi;
  }
`;

const DetailInput = styled.input`
  font-family: "Roboto", sans-serif;
  font-size: min(3.8cqi, 28px);
  font-weight: 600;
  color: white;
  background-color: #555;
  border: 2px solid #666;
  border-radius: 6px;
  padding: 12px 16px;

  &::placeholder {
    color: #9f9f9f;
    font-weight: normal;
  }

  &:focus {
    outline: none;
    border-color: #088e3b;
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

const BirthdayRow = styled.div`
  display: flex;
  gap: 1.6cqi;
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


const RightDetails = styled.div`
  display: flex;
  justify-content: center;
`;
