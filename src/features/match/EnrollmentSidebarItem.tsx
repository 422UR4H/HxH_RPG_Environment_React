import styled from "styled-components";
import type { Enrollment } from "../../types/match";
import { createEmptyCharacterSheet } from "../../features/sheet/factories/characterSheet.factory";
import CharacterSheetHeader from "../../components/molecules/CharacterSheetHeader";
import { colors } from "../../styles/tokens";

interface EnrollmentSidebarItemProps {
  enrollment: Enrollment;
  isMaster: boolean;
  isLoading: boolean;
  onAccept: (enrollmentId: string) => void;
  onReject: (enrollmentId: string) => void;
  onClick: () => void;
}

export default function EnrollmentSidebarItem({
  enrollment,
  isMaster,
  isLoading,
  onAccept,
  onReject,
  onClick,
}: EnrollmentSidebarItemProps) {
  const { characterSheet, status } = enrollment;
  const priv = characterSheet.private;

  const charSheet = createEmptyCharacterSheet();
  charSheet.characterClass = priv?.characterClass ?? "";
  charSheet.profile = {
    ...charSheet.profile,
    nickname: characterSheet.nickName,
    fullname: priv?.fullName ?? "",
    coverUrl: characterSheet.coverUrl,
    avatarUrl: characterSheet.avatarUrl,
  };
  if (priv?.health && priv?.stamina) {
    charSheet.status = {
      health: priv.health,
      stamina: priv.stamina,
    };
  }
  if (priv?.currExp !== undefined && priv?.nextLvlBaseExp !== undefined) {
    charSheet.characterExp = {
      ...charSheet.characterExp,
      currExp: priv.currExp,
      nextLvlBaseExp: priv.nextLvlBaseExp,
    };
  }

  return (
    <ItemContainer $clickable={isMaster} onClick={isMaster ? onClick : undefined}>
      <CharacterSheetHeader
        mode="card"
        data={{ charSheet }}
        showStatus={!!priv}
      />
      <StatusBadge $status={status}>
        {status === "pending" && "Pendente"}
        {status === "accepted" && "Aceito"}
        {status === "rejected" && "Rejeitado"}
      </StatusBadge>

      {isMaster && (
        <Actions>
          <ActionButton
            $variant="accept"
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              onAccept(enrollment.uuid);
            }}
          >
            ✓
          </ActionButton>
          <ActionButton
            $variant="reject"
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              onReject(enrollment.uuid);
            }}
          >
            ✗
          </ActionButton>
        </Actions>
      )}
    </ItemContainer>
  );
}

const ItemContainer = styled.div<{ $clickable: boolean }>`
  position: relative;
  overflow: hidden;
  border-radius: 0px 16px 0 0;
  border-left: 4px solid ${colors.orange};
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};

  &:hover {
    filter: ${({ $clickable }) => ($clickable ? "brightness(1.05)" : "none")};
  }
`;

const StatusBadge = styled.span<{ $status: string }>`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: bold;
  background-color: ${({ $status }) =>
    $status === "pending"
      ? colors.statusPending
      : $status === "accepted"
      ? colors.statusNpc
      : colors.danger};
  color: ${colors.textPrimary};
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  padding: 6px 8px;
  background-color: ${colors.overlayMedium};
`;

const ActionButton = styled.button<{ $variant: "accept" | "reject" }>`
  flex: 1;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  background-color: ${({ $variant }) =>
    $variant === "accept" ? colors.statusOngoing : colors.dangerDark};
  color: ${colors.textPrimary};
  transition: filter 0.2s;

  &:hover:not(:disabled) {
    filter: brightness(1.15);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
