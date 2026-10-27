import styled from "styled-components";
import Badge from "../../components/ions/Badge";
import type { BadgeTone } from "../../components/ions/Badge";
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
      level: priv.level ?? charSheet.characterExp.level,
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
      <StatusBadge tone={enrollmentTones[status] ?? "danger"} size="sm" uppercase={false}>
        {status === "pending" && "Pendente"}
        {status === "accepted" && "Aceito"}
        {status === "rejected" && "Recusado"}
      </StatusBadge>

      {/* Só enquanto há o que decidir; depois fica só o selo de status.
          Sem ícone até o X de recusar do designer chegar: os dois entram juntos. */}
      {isMaster && status === "pending" && (
        <Actions onClick={(e) => e.stopPropagation()}>
          <AcceptButton
            type="button"
            aria-label={`Aceitar inscrição de ${characterSheet.nickName}`}
            disabled={isLoading}
            onClick={() => onAccept(enrollment.uuid)}
          >
            Aceitar
          </AcceptButton>
          <RejectButton
            type="button"
            aria-label={`Recusar inscrição de ${characterSheet.nickName}`}
            disabled={isLoading}
            onClick={() => onReject(enrollment.uuid)}
          >
            Recusar
          </RejectButton>
        </Actions>
      )}
    </ItemContainer>
  );
}

const ItemContainer = styled.div<{ $clickable: boolean }>`
  position: relative;
  overflow: hidden;
  border-radius: 0px 16px 0 0;
  border-left: 4px solid ${colors.actionAccent};
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};

  &:hover {
    filter: ${({ $clickable }) => ($clickable ? "brightness(1.05)" : "none")};
  }
`;


const Actions = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px;
  background-color: ${colors.overlayMedium};
`;

// Contorno sobre o painel escuro: o check verde do designer, quando chegar, não some no fundo.
const ActionButton = styled.button`
  flex: 1;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 6px;
  background: transparent;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background-color: ${colors.overlayHighlightFaint};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const AcceptButton = styled(ActionButton)`
  border: 2px solid ${colors.actionConfirm};
  color: ${colors.textPrimary};
`;

const RejectButton = styled(ActionButton)`
  border: 2px solid ${colors.actionDestructiveText};
  color: ${colors.actionDestructiveText};
`;

// Selo sobre a capa do card: posição aqui, aparência no ion.
const StatusBadge = styled(Badge)`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
`;

const enrollmentTones: Record<string, BadgeTone> = {
  pending: "pending",
  accepted: "ongoing",
  rejected: "danger",
};
