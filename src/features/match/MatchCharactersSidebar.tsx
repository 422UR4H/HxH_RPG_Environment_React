// src/features/match/MatchCharactersSidebar.tsx
import styled from "styled-components";
import type { Enrollment, Participant } from "../../types/match";
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import CharactersSidebar from "../../components/organisms/CharactersSidebar";
import CharacterSidebarItem from "../../components/molecules/CharacterSidebarItem";
import EnrollmentSidebarItem from "./EnrollmentSidebarItem";
import { colors, fonts } from "../../styles/tokens";

interface MatchCharactersSidebarProps {
  gameStarted: boolean;
  enrollments: Enrollment[];
  participants: Participant[];
  isMaster: boolean;
  actionLoading: Record<string, boolean>;
  onAccept: (enrollmentId: string) => void;
  onReject: (enrollmentId: string) => void;
  onSelectCharacterSheet: (sheetUuid: string) => void;
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
}: MatchCharactersSidebarProps) {
  if (!gameStarted) {
    return (
      <CharactersSidebar
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
      items={participants}
      renderItem={(participant) => {
        const priv = participant.characterSheet.private;
        if (!priv) {
          return (
            <BasicParticipantItem key={participant.uuid}>
              <span>{participant.characterSheet.nickName}</span>
              {participant.leftAt && <LeftBadge>Saiu</LeftBadge>}
            </BasicParticipantItem>
          );
        }
        const character = {
          ...participant.characterSheet,
          ...priv,
          isPending: false,
        } as CharacterPrivateSummary & { isPending?: boolean };
        return (
          <CharacterSidebarItem
            key={participant.uuid}
            character={character}
            isMaster={isMaster}
            hasLeft={!!participant.leftAt}
            onClick={() => onSelectCharacterSheet(participant.characterSheet.uuid)}
          />
        );
      }}
    />
  );
}

const BasicParticipantItem = styled.div`
  background-color: ${colors.surfaceMuted};
  border-radius: 8px;
  padding: 15px;
  border-left: 4px solid ${colors.orange};
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: ${fonts.display};
  font-size: 18px;
  font-weight: bold;
  color: ${colors.textPrimary};
`;

const LeftBadge = styled.span`
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: bold;
  background-color: ${colors.statusLeft};
  color: ${colors.textDisabled};
`;
