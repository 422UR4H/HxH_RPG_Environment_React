import styled from "styled-components";
import type { StatusBar } from "../../types/characterSheet";
import HpBar from "../atoms/HpBar";
import SpBar from "../atoms/SpBar";
import avatarPlaceholder from "../../assets/placeholder/avatar.png";
import coverPlaceholder from "../../assets/placeholder/cover.png";

interface CharacterSheetHeaderProps {
  cover?: string;
  avatar?: string;
  nick: string;
  health: StatusBar;
  stamina: StatusBar;
  lvls: number[];
}

export default function CharacterSheetHeader({
  cover,
  avatar,
  nick,
  health,
  stamina,
  lvls = [],
}: CharacterSheetHeaderProps) {
  return (
    <HeaderContainer>
      <CoverContainer>
        <Cover src={cover || coverPlaceholder} alt={`cover`} />
      </CoverContainer>

      <AvatarContainer>
        <Avatar src={avatar || avatarPlaceholder} alt={`avatar`} />
      </AvatarContainer>

      <NicknameOverlay>
        <Nickname>{nick}</Nickname>
      </NicknameOverlay>

      <StatusBarsContainer>
        <HpBar current={health.current} max={health.max} height={"3.8vw"} />
        <SpBar current={stamina.current} max={stamina.max} height={"3.8vw"} />
      </StatusBarsContainer>
    </HeaderContainer>
  );
}

const HeaderContainer = styled.div`
  background-color: #444;
  width: 100%;
  position: relative;
`;

const CoverContainer = styled.div`
  width: 100%;
  aspect-ratio: 2.5 / 1;
  overflow: hidden;
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
  width: 28vw;
  width: 28dvw;
  height: 28vw;
  height: 28dvw;
  border-radius: 50%;
  border: 3vw solid black;
  overflow: hidden;
  background-color: #444;
  z-index: 2;
`;

const Avatar = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const NicknameOverlay = styled.div`
  position: absolute;
  bottom: calc(8vw + 14px);
  left: 30vw;
  // TODO: fix gradient
  /* background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0.4) 50%,
    transparent 100%
  ); */
  /* padding: 20px; */
`;

const Nickname = styled.h1`
  font-family: "Roboto", sans-serif;
  font-size: min(5vw, 3rem);
  font-weight: 700;
  color: white;
  text-shadow: 1px 1px 6px rgba(0, 0, 0, 1);
`;

const StatusBarsContainer = styled.div`
  display: flex;
  flex-direction: column;
`;
