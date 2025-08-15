import styled from "styled-components";
import type { StatusBar } from "../../types/characterSheet";
import HpBar from "../atoms/HpBar";
import SpBar from "../atoms/SpBar";
import avatarPlaceholder from "../../assets/placeholder/avatar.png";
import coverPlaceholder from "../../assets/placeholder/cover.png";
import gungiFrame from "../../assets/icons/gungi.svg";
import type { HeaderMode } from "../../features/sheet/types/headerMode";
import type { CharacterClass } from "../../types/characterClass";

interface CharacterSheetHeaderProps {
  mode: HeaderMode;
  cover?: string;
  avatar?: string;
  nick?: string;
  characterClass?: string;
  health?: StatusBar;
  stamina?: StatusBar;
  lvls: number[];
  charClasses?: CharacterClass[];
}

export default function CharacterSheetHeader({
  mode,
  cover,
  avatar,
  nick,
  characterClass,
  health,
  stamina,
  lvls = [],
  charClasses = [],
}: CharacterSheetHeaderProps) {
  return (
    <HeaderContainer>
      <CoverContainer $cardView={mode === "card"}>
        <Cover src={cover || coverPlaceholder} alt={`cover`} />
      </CoverContainer>

      <AvatarContainer>
        <GungiFrame src={gungiFrame} alt="frame" />
        <Avatar src={avatar || avatarPlaceholder} alt={`avatar`} />
      </AvatarContainer>

      {mode === "create" || mode == "edit" ? (
        <NicknameOverlay>
          <NicknameInput type="text" placeholder="Nickname" maxLength={10} />
          <CharacterClass>Classe: </CharacterClass>
          <CharacterClassSelect>
            {charClasses.map((charClass, i) => (
              <option key={i} value={charClass.profile.name}>
                {charClass.profile.name}
              </option>
            ))}
          </CharacterClassSelect>
        </NicknameOverlay>
      ) : (
        <NicknameOverlay>
          <Nickname>{nick}</Nickname>
          <CharacterClass>{characterClass}</CharacterClass>
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
  z-index: 2;
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

const NicknameOverlay = styled.div`
  position: absolute;
  bottom: calc(8cqi + 14px);
  left: 30cqi;
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
  font-size: min(3cqi, 28px);
  font-weight: 600;
  color: white;
  background-color: #107135;
  border: 4px solid #107135;
  border-radius: 28px;
  padding: 8px 16px;
  appearance: none;
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
    font-size: min(3cqi, 28px);
    font-weight: 600;
    color: white;
    background-color: #555;
    background-color: #107135;
  }
`;

const StatusBarsContainer = styled.div`
  display: flex;
  flex-direction: column;
`;
