import styled from "styled-components";
import type { StatusBar } from "../../types/characterSheet";
import HpBar from "../atoms/HpBar";
import SpBar from "../atoms/SpBar";
import avatarPlaceholder from "../../assets/placeholder/avatar.png";
import coverPlaceholder from "../../assets/placeholder/cover.png";
import gungiFrame from "../../assets/icons/gungi.svg";

interface CharacterSheetHeaderProps {
  cover?: string;
  avatar?: string;
  nick: string;
  characterClass: string;
  health: StatusBar;
  stamina: StatusBar;
  lvls: number[];
  cardView?: boolean;
}

export default function CharacterSheetHeader({
  cover,
  avatar,
  nick,
  characterClass,
  health,
  stamina,
  lvls = [],
  cardView = false,
}: CharacterSheetHeaderProps) {
  return (
    <HeaderContainer>
      <CoverContainer $cardView={cardView}>
        <Cover src={cover || coverPlaceholder} alt={`cover`} />
      </CoverContainer>

      <AvatarContainer>
        <GungiFrame src={gungiFrame} alt="frame" />
        <Avatar src={avatar || avatarPlaceholder} alt={`avatar`} />
      </AvatarContainer>

      <NicknameOverlay>
        <Nickname>{nick}</Nickname>
        <CharacterClass>{characterClass}</CharacterClass>
      </NicknameOverlay>

      <StatusBarsContainer>
        <HpBar current={health.current} max={health.max} />
        <SpBar current={stamina.current} max={stamina.max} />
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

const CharacterClass = styled.h2`
  font-family: "Roboto", sans-serif;
  font-size: min(3.6cqi, 2.2rem);
  font-weight: 600;
  color: #c4c4c4;
  padding-left: 0.8cqi;
  text-shadow: 1px 1px 6px rgba(0, 0, 0, 1);
`;

const StatusBarsContainer = styled.div`
  display: flex;
  flex-direction: column;
`;
