import { Suspense, lazy, useState } from "react";
import styled from "styled-components";
import Collapse from "../../components/atoms/Collapse";
import ExpandButton from "../../components/ions/ExpandButton";
import { colors } from "../../styles/tokens";
import type { ProfileMode } from "./types/profileMode";
import type { CharacterSheet } from "../../types/characterSheet";
import ProfileDetails from "./ProfileDetails";
import ProfileInputs from "./ProfileInputs";

const BackgroundEditorModal = lazy(
  () => import("../../components/molecules/BackgroundEditorModal")
);

const PROFILE_CONTENT_ID = "character-profile-content";

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
  const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);

  const toggleExpanded = () => setIsExpanded(!isExpanded);
  const openBackground = () => setIsBackgroundOpen(true);
  const closeBackground = () => setIsBackgroundOpen(false);

  const handleBackgroundSave = (value: string) => {
    if (!charSheet || !setCharSheet) return;
    setCharSheet({
      ...charSheet,
      profile: { ...charSheet.profile, description: value },
    });
    setIsBackgroundOpen(false);
  };

  return (
    <ProfileContainer>
      {/* Persiana: o conteúdo fica acima e a barra é a borda de baixo, que desce ao abrir. */}
      <Collapse id={PROFILE_CONTENT_ID} open={isExpanded}>
        {profile && mode === "view" && (
          <ProfileDetails profile={profile} onBackgroundClick={openBackground} />
        )}
        {profile && mode === "edit" && (
          <ProfileDetails
            profile={profile}
            onBackgroundClick={openBackground}
            onBriefDescriptionChange={(value) => {
              if (!charSheet || !setCharSheet) return;
              setCharSheet({ ...charSheet, profile: { ...charSheet.profile, briefDescription: value } });
            }}
          />
        )}
        {mode === "create" && (
          <ProfileInputs
            charSheet={charSheet}
            setCharSheet={setCharSheet}
            onBackgroundClick={openBackground}
          />
        )}
      </Collapse>

      <ProfileBar
        type="button"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
        aria-controls={PROFILE_CONTENT_ID}
        aria-label={isExpanded ? "Ocultar perfil" : "Mostrar perfil"}
      >
        <ExpandButtonContainer>
          <ExpandButton isExpanded={isExpanded} />
        </ExpandButtonContainer>
      </ProfileBar>

      {isBackgroundOpen && (
        <Suspense fallback={null}>
          <BackgroundEditorModal
            initialValue={charSheet?.profile?.description ?? ""}
            readOnly={mode === "view"}
            onClose={closeBackground}
            onSave={handleBackgroundSave}
          />
        </Suspense>
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

const ProfileBar = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  width: 100%;
  height: 3.8cqi;
  padding: 0;
  border: none;
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
