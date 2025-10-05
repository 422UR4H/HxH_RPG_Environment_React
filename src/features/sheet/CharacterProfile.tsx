import { useState } from "react";
import styled from "styled-components";
import ExpandButton from "../../components/ions/ExpandButton";
import type { ProfileMode } from "./types/profileMode";
import type { CharacterSheet } from "../../types/characterSheet";
import ProfileDetails from "./ProfileDetails";
import ProfileInputs from "./ProfileInputs";

interface CharacterProfileProps {
  mode: ProfileMode;
  charSheet?: CharacterSheet;
  setCharSheet?: (charSheet: CharacterSheet) => void;
}

export default function CharacterProfile({
  mode,
  charSheet,
  setCharSheet,
}: CharacterProfileProps) {
  const profile = charSheet?.profile;
  const [isExpanded, setIsExpanded] = useState(mode === "create");

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <ProfileContainer>
      <ProfileHeader onClick={toggleExpanded}>
        <ExpandButtonContainer>
          <ExpandButton isExpanded={isExpanded} />
        </ExpandButtonContainer>
      </ProfileHeader>

      {/* TODO: refactor ternary to semanthic funcion */}
      {isExpanded && profile && mode === "view" && (
        <ProfileDetails profile={profile} />
      )}
      {isExpanded && (mode === "create" || mode === "edit") && (
        <ProfileInputs charSheet={charSheet} setCharSheet={setCharSheet} />
      )}
    </ProfileContainer>
  );
}

const ProfileContainer = styled.div`
  container-type: inline-size;
  width: 100%;
  background-color: #444;
  border: 3px solid black;
  /* border-bottom: none; */
  /* margin-bottom: 2cqi; */
  overflow: visible;
  transition: all 0.3s ease;

  @media (max-width: 609px) {
    border-width: 0.6cqi;
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
  background-color: #333333;
  transition: background-color 0.2s ease;
  overflow: visible;

  &:hover {
    filter: brightness(1.1);
  }
`;

const ExpandButtonContainer = styled.div`
  position: absolute;
  z-index: 1;
  top: 40%;

  width: 6cqi;
  height: auto;

  @media (max-width: 589px) {
    width: 7cqi;
    height: 7cqi;
  }
`;
