import styled from "styled-components";
import type { CharacterSheet } from "../../types/characterSheet";
import HpBar from "../atoms/HpBar";
import SpBar from "../atoms/SpBar";
import avatarPlaceholder from "../../assets/placeholder/avatar.png";
import coverPlaceholder from "../../assets/placeholder/cover.png";
import cameraIcon from "../../assets/icons/camera.svg";
import gungiFrame from "../../assets/icons/gungi.svg";
import plusIcon from "../../assets/icons/plus.svg";
import penIcon from "../../assets/icons/pen.svg";
import type { HeaderMode } from "../../features/sheet/types/headerMode";
import type { CharacterClass } from "../../types/characterClass";
import { useCharSheetBuilder } from "../../features/sheet/hooks/useCharSheetBuilder";

interface Data {
  charSheet?: CharacterSheet;
  setCharSheet?: (charSheet: CharacterSheet) => void;
  charClasses?: CharacterClass[];
}

interface CharacterSheetHeaderProps {
  data: Data;
  mode: HeaderMode;
}

export default function CharacterSheetHeader({
  mode,
  data: { charSheet, setCharSheet, charClasses },
}: CharacterSheetHeaderProps) {
  const { buildFromClass } = useCharSheetBuilder();
  const handleClassChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const targetClass = event.target.value;
    const charClass = charClasses?.find(
      (cc) => cc.profile.name === targetClass
    );

    if (!charSheet || !setCharSheet) return;
    if (!charClass) return;

    // TODO: verify this assertion type
    const newCharSheet = buildFromClass(charClass, charSheet) as CharacterSheet;
    setCharSheet(newCharSheet);
  };
  const profile = charSheet?.profile;
  const health = charSheet?.status?.health;
  const stamina = charSheet?.status?.stamina;

  return (
    <HeaderContainer>
      <CoverContainer $cardView={mode === "card"}>
        <Cover src={profile?.cover || coverPlaceholder} alt={`cover`} />
      </CoverContainer>

      <AvatarContainer>
        <GungiFrame src={gungiFrame} alt="frame" />
        <Avatar src={profile?.avatar || avatarPlaceholder} alt={`avatar`} />
        {(mode === "create" || mode === "edit") && (
          <AddAvatar onClick={() => alert("Calma, jovem gafanhoto...")}>
            <CameraIcon src={cameraIcon} alt="Camera Icon" />
            <PlusIcon src={plusIcon} alt="+" />
          </AddAvatar>
        )}
      </AvatarContainer>

      {mode === "create" || mode == "edit" ? (
        <NicknameOverlay>
          <NicknameInputContainer>
            <PenIcon src={penIcon} alt="Edit Icon" />
            <NicknameInput type="text" placeholder="Nickname" maxLength={10} />
          </NicknameInputContainer>

          <CharacterClass>Classe: </CharacterClass>
          <CharacterClassSelect onChange={handleClassChange}>
            <CharacterClassOption value="">
              Selecione uma classe
            </CharacterClassOption>
            {charClasses?.map((charClass, i) => (
              <CharacterClassOption key={i} value={charClass.profile.name}>
                {charClass.profile.name}
              </CharacterClassOption>
            ))}
          </CharacterClassSelect>
        </NicknameOverlay>
      ) : (
        <NicknameOverlay>
          <Nickname>{profile?.nickname}</Nickname>
          <CharacterClass>{charSheet?.characterClass}</CharacterClass>
        </NicknameOverlay>
      )}

      <StatusBarsContainer>
        <HpBar current={health?.current} max={health?.max} />
        <SpBar current={stamina?.current} max={stamina?.max} />
      </StatusBarsContainer>
    </HeaderContainer>
  );
}

const HeaderContainer = styled.div`
  container-type: inline-size;
  background-color: #444;
  width: 100%;
  position: relative;
`;

const CoverContainer = styled.div<{ $cardView: boolean }>`
  width: 100%;
  aspect-ratio: ${({ $cardView }) => ($cardView ? "3 / 1" : "2.5 / 1")};
  overflow: hidden;

  position: relative;

  /* add gradient with pseudo-element */
  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40%;
    background: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.9) 0%,
      rgba(0, 0, 0, 0.69) 15%,
      rgba(0, 0, 0, 0.55) 25%,
      rgba(0, 0, 0, 0.35) 40%,
      rgba(0, 0, 0, 0.19) 55%,
      rgba(0, 0, 0, 0.07) 70%,
      rgba(0, 0, 0, 0.02) 85%,
      transparent 100%
    );
    pointer-events: none; /* Allows clicks through the overlay */
    z-index: 0;
  }
`;

const Cover = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const AvatarContainer = styled.div`
  position: absolute;
  bottom: 0px;
  left: 0px;
  width: 28cqi;
  height: 28cqi;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const GungiFrame = styled.img`
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 1;
`;

const Avatar = styled.img`
  width: 71.1%;
  height: 71.1%;
  object-fit: cover;
  border-radius: 50%;
  z-index: 2;
  position: relative;
`;

const AddAvatar = styled.button`
  position: absolute;
  bottom: 1cqi;
  left: 1cqi;
  z-index: 3;

  background-color: black;
  width: 8cqi;
  height: 8cqi;
  padding: 1%;
  border: none;
  border-radius: 50%;
  cursor: pointer;

  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }
`;

const CameraIcon = styled.img`
  width: 100%;
  height: auto;
`;

const PlusIcon = styled.img`
  position: absolute;
  right: 0;
  top: 0;
  width: 40%;
  height: auto;
`;

const NicknameOverlay = styled.div`
  position: absolute;
  bottom: calc(8cqi + 14px);
  left: 30cqi;
`;

const NicknameInputContainer = styled.div`
  width: 50cqi;
  position: relative;
  display: flex;
  align-items: flex-end;
  margin-bottom: 8px;
`;

const PenIcon = styled.img`
  position: absolute;
  right: 0;
  bottom: 8px;
  width: 7cqi;
  height: 7cqi;
  z-index: 1;
`;

const Nickname = styled.h1`
  font-family: "Roboto", sans-serif;
  font-size: min(5.4cqi, 3.1rem);
  font-weight: 700;
  color: white;
  text-shadow: 1px 1px 6px rgba(0, 0, 0, 1);
`;

const NicknameInput = styled.input`
  background: transparent;
  outline: none;
  border: none;
  border-bottom: 2px solid white;
  font-family: "Roboto", sans-serif;
  font-size: min(5cqi, 3.1rem);
  font-weight: 700;
  color: white;
  margin-bottom: 8px;
  text-shadow: 1px 1px 6px rgba(0, 0, 0, 1);

  width: 50cqi;
  /* padding-left: min(6cqi, 28px); */

  &::placeholder {
    color: white;
  }
`;

const CharacterClass = styled.h2`
  font-family: "Roboto", sans-serif;
  font-size: min(3.6cqi, 2.2rem);
  font-weight: 600;
  color: #c4c4c4;
  display: inline-block;
  padding: 0 0.8cqi;
  text-shadow: 1px 1px 6px rgba(0, 0, 0, 1);
`;

const CharacterClassSelect = styled.select`
  font-family: "Roboto", sans-serif;
  font-size: min(3.8cqi, 28px);
  font-weight: 600;
  color: white;
  background-color: #107135;
  border: 4px solid #107135;
  border-radius: 28px;
  padding: 8px min(8cqi, 46px) 8px 16px;
  cursor: pointer;

  /* remove down arrow */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;

  /* add new down arrow */
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: min(4.4cqi, 28px);

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
`;

const CharacterClassOption = styled.option`
  font-family: "Roboto", sans-serif;
  font-size: min(3.8cqi, 28px);
  font-weight: 600;
  color: white;
  background-color: #555;
  background-color: #107135;
  padding-right: 40px;
`;

const StatusBarsContainer = styled.div`
  display: flex;
  flex-direction: column;
`;
