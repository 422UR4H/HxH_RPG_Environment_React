import styled, { keyframes } from "styled-components";
import BackgroundButton from "../../components/atoms/BackgroundButton";
import type { Profile, CharacterSheet } from "../../types/characterSheet";
import BaseOption from "../../components/ions/BaseOption";
import BaseSelect from "../../components/ions/BaseSelect";

interface ProfileInputsProps {
  charSheet?: CharacterSheet;
  setCharSheet?: (charSheet: CharacterSheet) => void;
}

export default function ProfileInputs({
  charSheet,
  setCharSheet,
}: ProfileInputsProps) {
  const handleInputChange = (field: keyof Profile, value: string) => {
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
  const alignmentOptions = [
    "Unaligned",
    "Lawful Good",
    "Lawful Neutral",
    "Lawful Evil",
    "Neutral Good",
    "True Neutral",
    "Neutral Evil",
    "Chaotic Good",
    "Chaotic Neutral",
    "Chaotic Evil",
  ] as const;

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
          <DetailItem>
            {/* <DetailLabel>Data de Nascimento:</DetailLabel> */}
            {/* <DetailInput
              type="date"
              value={profile?.birthday || ""}
              onChange={(e) => handleInputChange("birthday", e.target.value)}
            /> */}
            <DetailLabel>Idade:</DetailLabel>
            <DetailInput
              type="number"
              value={profile?.age}
              onChange={(e) => handleInputChange("age", e.target.value)}
            />
          </DetailItem>

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
                value={profile?.alignment || "Unaligned"}
                onChange={(e) => handleInputChange("alignment", e.target.value)}
              >
                {alignmentOptions.map((alignment) => (
                  <BaseOption key={alignment} value={alignment}>
                    {alignment}
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
const AlignmentContainer = styled.div`
  display: flex;
  gap: 12px;
`;

const AlignmentSelect = styled.select`
  font-family: "Roboto", sans-serif;
  font-size: min(3.8cqi, 28px);
  font-weight: 600;
  color: white;
  background-color: #107135;
  border: 4px solid #107135;
  border-radius: 28px;
  padding: 8px 16px;
  flex: 1;
  cursor: pointer;

  /* remove down arrow */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;

  /* add new down arrow */
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 20px;

  &:active {
    outline: none;
    border-color: #088e3b;
    border-color: white;
  }
  &:focus {
    outline: none;
  }
  &:hover {
    filter: brightness(1.1);
  }
  option {
    font-family: "Roboto", sans-serif;
    font-size: min(3.8cqi, 28px);
    font-weight: 600;
    color: white;
    background-color: #555;
    background-color: #107135;
  }

  @media (max-width: 609px) {
    font-size: 4.6cqi;
  }
`;

const RightDetails = styled.div`
  display: flex;
  justify-content: center;
`;
