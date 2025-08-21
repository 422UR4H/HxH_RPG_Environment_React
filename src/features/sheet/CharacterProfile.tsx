import { useState } from "react";
import styled from "styled-components";
import expandIcon from "../../assets/icons/vezinhopontiagudo.svg";
import type { ProfileMode } from "./types/profileMode";
import type { Profile } from "../../types/characterSheet";
import ProfileDetails from "./ProfileDetails";
import ProfileInputs from "./ProfileInputs";

interface CharacterProfileProps {
  mode: ProfileMode;
  profile?: Profile;
}

export default function CharacterProfile({
  mode,
  profile,
}: CharacterProfileProps) {
  const [isExpanded, setIsExpanded] = useState(mode === "create");

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <ProfileContainer>
      <ProfileHeader onClick={toggleExpanded}>
        <ExpandIcon
          src={expandIcon}
          alt="Expandir/Retrair"
          $isExpanded={isExpanded}
        />
      </ProfileHeader>

      {/* TODO: refactor ternary to semanthic funcion */}
      {isExpanded && profile && mode === "view" && (
        <ProfileDetails profile={profile} />
      )}
      {isExpanded && (mode === "create" || mode === "edit") && (
        <ProfileInputs />
      )}
    </ProfileContainer>
  );
}

const ProfileContainer = styled.div`
  container-type: inline-size;
  width: 100%;
  background-color: #444;
  margin-bottom: 2cqi;
  border: 3px solid black;
  overflow: visible;
  transition: all 0.3s ease;

  @media (max-width: 609px) {
    margin-bottom: 4vw;
  }
`;

const ProfileHeader = styled.div`
  width: 100%;
  height: 3.8cqi;
  /* border-bottom: 3px solid black; */
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  background-color: #3a3a3a;
  transition: background-color 0.2s ease;
  overflow: visible;

  &:hover {
    background-color: #555;
  }
`;

const ExpandIcon = styled.img<{ $isExpanded: boolean }>`
  position: absolute;
  z-index: 1;
  top: 18%;
  width: 38px;
  height: 38px;
  width: 6cqi;
  height: 6cqi;
  transition: transform 0.16s ease;
  transform: ${({ $isExpanded }) =>
    $isExpanded ? "rotate(180deg)" : "rotate(0deg)"};

  -webkit-user-select: none;
  /* -moz-user-select: none; */
  /* pointer-events: none; */
  /* user-select: none; */

  &:hover {
    /* transform: scale(1.05); */
    filter: brightness(1.1);
  }
  /* &:active {
    transform: scale(0.98);
  } */
`;
