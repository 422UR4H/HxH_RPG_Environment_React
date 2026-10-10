// src/features/match/MatchCharactersSidebar.tsx
import type { ReactNode } from "react";
import type { Enrollment, Participant } from "../../types/match";
import CharactersSidebar from "../../components/organisms/CharactersSidebar";
import CharacterSidebarItem from "../../components/molecules/CharacterSidebarItem";
import EnrollmentSidebarItem from "./EnrollmentSidebarItem";
import { toSidebarCharacter } from "./sidebarCharacter";

interface MatchCharactersSidebarProps {
  gameStarted: boolean;
  enrollments: Enrollment[];
  participants: Participant[];
  isMaster: boolean;
  actionLoading: Record<string, boolean>;
  onAccept: (enrollmentId: string) => void;
  onReject: (enrollmentId: string) => void;
  onSelectCharacterSheet: (sheetUuid: string) => void;
  ownPlayerUuid?: string;
  /** Cards na largura toda do painel (a aba Personagens da mesa). */
  fluid?: boolean;
  /** Depois dos cards, dentro da lista (ex.: "Pôr na partida" do mestre). */
  footer?: ReactNode;
}

export default function MatchCharactersSidebar({
  gameStarted,
  enrollments,
  participants,
  isMaster,
  actionLoading,
  onAccept,
  onReject,
  onSelectCharacterSheet,
  ownPlayerUuid,
  fluid,
  footer,
}: MatchCharactersSidebarProps) {
  if (!gameStarted) {
    return (
      <CharactersSidebar
        fluid={fluid}
        footer={footer}
        items={enrollments}
        renderItem={(enrollment) => (
          <EnrollmentSidebarItem
            key={enrollment.uuid}
            enrollment={enrollment}
            isMaster={isMaster}
            isLoading={!!actionLoading[enrollment.uuid]}
            onAccept={onAccept}
            onReject={onReject}
            onClick={() => onSelectCharacterSheet(enrollment.characterSheet.uuid)}
          />
        )}
      />
    );
  }

  return (
    <CharactersSidebar
      fluid={fluid}
      footer={footer}
      items={participants}
      renderItem={(participant) => (
        <CharacterSidebarItem
          key={participant.uuid}
          character={toSidebarCharacter(participant.characterSheet)}
          isMaster={isMaster}
          isOwn={!!ownPlayerUuid && participant.characterSheet.playerUuid === ownPlayerUuid}
          hasLeft={!!participant.leftAt}
          onClick={() => onSelectCharacterSheet(participant.characterSheet.uuid)}
        />
      )}
    />
  );
}
