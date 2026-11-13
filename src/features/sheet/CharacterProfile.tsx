import { Suspense, lazy, memo, useState } from "react";
import styled from "styled-components";
import Collapse from "../../components/atoms/Collapse";
import ExpandButton from "../../components/ions/ExpandButton";
import { iconButtonFx } from "../../styles/iconButtonFx";
import { colors } from "../../styles/tokens";
import type { ProfileMode } from "./types/profileMode";
import type { Profile } from "../../types/characterSheet";
import ProfileDetails from "./ProfileDetails";
import ProfileInputs from "./ProfileInputs";

const BackgroundEditorModal = lazy(
  () => import("../../components/molecules/BackgroundEditorModal")
);

const PROFILE_CONTENT_ID = "character-profile-content";

interface CharacterProfileProps {
  mode: ProfileMode;
  profile?: Profile;
  /** Recebe o perfil inteiro já alterado; sem ela o perfil é só leitura. */
  onProfileChange?: (profile: Profile) => void;
}

// Recebe só o perfil (não a ficha): com memo, os cliques de distribuição — que mudam a ficha,
// mas não o perfil — não re-renderizam o formulário inteiro.
function CharacterProfile({ mode, profile, onProfileChange }: CharacterProfileProps) {
  // In "create" and "edit" modes the profile panel starts expanded so the user
  // can fill in or edit fields immediately. In "view" mode it starts collapsed,
  // keeping the focus on the sheet's attributes and skills.
  const [isExpanded, setIsExpanded] = useState(mode === "create" || mode === "edit");
  const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);

  const toggleExpanded = () => setIsExpanded(!isExpanded);
  const openBackground = () => setIsBackgroundOpen(true);
  const closeBackground = () => setIsBackgroundOpen(false);

  const handleBackgroundSave = (value: string) => {
    if (!profile || !onProfileChange) return;
    onProfileChange({ ...profile, description: value });
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
              if (!onProfileChange) return;
              onProfileChange({ ...profile, briefDescription: value });
            }}
          />
        )}
        {mode === "create" && (
          <ProfileInputs
            profile={profile}
            onProfileChange={onProfileChange}
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
            initialValue={profile?.description ?? ""}
            readOnly={mode === "view"}
            onClose={closeBackground}
            onSave={handleBackgroundSave}
          />
        </Suspense>
      )}
    </ProfileContainer>
  );
}

export default memo(CharacterProfile);

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

  ${iconButtonFx(1.15)}
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
