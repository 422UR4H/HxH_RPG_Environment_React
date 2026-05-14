import styled from "styled-components";
import type { Enrollment } from "../../types/match";

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

  return (
    <ItemContainer $clickable={isMaster} onClick={isMaster ? onClick : undefined}>
      <TopRow>
        <NickName>{characterSheet.nickName}</NickName>
        <StatusBadge $status={status}>
          {status === "pending" && "Pendente"}
          {status === "accepted" && "Aceito"}
          {status === "rejected" && "Rejeitado"}
        </StatusBadge>
      </TopRow>

      {priv && (
        <PrivateInfo>
          <FullName>{priv.fullName}</FullName>
          <Bars>
            <Bar
              $type="health"
              $value={(priv.health.current / priv.health.max) * 100}
            />
            <Bar
              $type="stamina"
              $value={(priv.stamina.current / priv.stamina.max) * 100}
            />
          </Bars>
        </PrivateInfo>
      )}

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
  background-color: #333;
  border-radius: 8px;
  padding: 15px;
  position: relative;
  border-left: 4px solid #ffa216;
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};

  &:hover {
    background-color: ${({ $clickable }) => ($clickable ? "#444" : "#333")};
  }
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const NickName = styled.div`
  font-family: "Oswald", sans-serif;
  font-size: 18px;
  font-weight: bold;
  color: white;
`;

const StatusBadge = styled.span<{ $status: string }>`
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

const PrivateInfo = styled.div`
  margin-top: 4px;
`;

const FullName = styled.div`
  font-size: 14px;
  color: #9f9f9f;
  margin-bottom: 6px;
`;

const Bars = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Bar = styled.div<{ $type: "health" | "stamina"; $value: number }>`
  height: 6px;
  background-color: #444;
  border-radius: 3px;
  position: relative;
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${({ $value }) => Math.min(Math.max($value, 0), 100)}%;
    background-color: ${({ $type }) =>
      $type === "health" ? "#e74c3c" : "#2ecc71"};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 10px;
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
