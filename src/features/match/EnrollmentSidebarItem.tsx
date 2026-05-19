import styled from "styled-components";
import type { Enrollment } from "../../types/match";
import { createEmptyCharacterSheet } from "../../features/sheet/factories/characterSheet.factory";
import CharacterSheetHeader from "../../components/molecules/CharacterSheetHeader";

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
  border-radius: 8px;
  border-left: 4px solid #ffa216;
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
      ? "#3498db"
      : $status === "accepted"
      ? "#2ecc71"
      : "#e74c3c"};
  color: white;
`;

const Actions = styled.div`
  display: flex;
  gap: 6px;
  padding: 10px 15px;
  background-color: rgba(0, 0, 0, 0.6);
`;

const ActionButton = styled.button<{ $variant: "accept" | "reject" }>`
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  background-color: ${({ $variant }) =>
    $variant === "accept" ? "#27ae60" : "#c0392b"};
  color: white;
  transition: filter 0.2s;

  &:hover:not(:disabled) {
    filter: brightness(1.15);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
