import { useState } from "react";
import styled from "styled-components";
import ExpandButton from "../../components/ions/ExpandButton";
import { colors } from "../../styles/tokens";
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
  // In "create" and "edit" modes the profile panel starts expanded so the user
  // can fill in or edit fields immediately. In "view" mode it starts collapsed,
  // keeping the focus on the sheet's attributes and skills.
  const [isExpanded, setIsExpanded] = useState(mode === "create" || mode === "edit");

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

      {isExpanded && profile && mode === "view" && (
        <ProfileDetails profile={profile} />
      )}
      {isExpanded && profile && mode === "edit" && (
        <ProfileDetails
          profile={profile}
          onBriefDescriptionChange={(value) => {
            if (!charSheet || !setCharSheet) return;
            setCharSheet({ ...charSheet, profile: { ...charSheet.profile, briefDescription: value } });
          }}
        />
      )}
      {isExpanded && mode === "create" && (
        <ProfileInputs charSheet={charSheet} setCharSheet={setCharSheet} />
      )}
    </ProfileContainer>
  );
}

const ProfileContainer = styled.div`
  container-type: inline-size;
  width: 100%;
  background-color: ${colors.surfaceControl};
  border: 3px solid ${colors.textOnLight};
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
  z-index: 1;
  cursor: pointer;
  background-color: ${colors.surfaceMuted};
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
