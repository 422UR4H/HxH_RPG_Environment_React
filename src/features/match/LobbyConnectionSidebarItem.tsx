import { useState } from "react";
import styled from "styled-components";
import type { Enrollment } from "../../types/match";
import { createEmptyCharacterSheet } from "../sheet/factories/characterSheet.factory";
import CharacterSheetHeader from "../../components/molecules/CharacterSheetHeader";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
import BlockableButton from "../../components/molecules/BlockableButton";
import { colors } from "../../styles/tokens";

interface LobbyConnectionSidebarItemProps {
  enrollment: Enrollment;
  isOnline: boolean;
  isMaster: boolean;
  onKick?: (playerUuid: string) => void;
  onClick: () => void;
}

export default function LobbyConnectionSidebarItem({
  enrollment,
  isOnline,
  isMaster,
  onKick,
  onClick,
}: LobbyConnectionSidebarItemProps) {
  const [showKickConfirm, setShowKickConfirm] = useState(false);
  const { characterSheet } = enrollment;
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
    charSheet.status = { health: priv.health, stamina: priv.stamina };
  }
  if (priv?.currExp !== undefined && priv?.nextLvlBaseExp !== undefined) {
    charSheet.characterExp = {
      ...charSheet.characterExp,
      level: priv.level ?? charSheet.characterExp.level,
      currExp: priv.currExp,
      nextLvlBaseExp: priv.nextLvlBaseExp,
    };
  }

  const handleKickConfirm = () => {
    setShowKickConfirm(false);
    onKick?.(enrollment.player.uuid);
  };

  return (
    <>
      <ItemContainer
        $isOnline={isOnline}
        $clickable={isMaster}
        onClick={isMaster ? onClick : undefined}
      >
        <CharacterSheetHeader mode="card" data={{ charSheet }} showStatus={!!priv} />
        <StatusBadge $isOnline={isOnline}>
          {isOnline ? "ONLINE" : "AGUARDANDO"}
        </StatusBadge>

        {isMaster && (
          // A faixa de ações nunca abre a ficha: o toque no Expulsar indisponível só mostra o motivo.
          <Actions onClick={(e) => e.stopPropagation()}>
            <KickButton
              blockedReason={isOnline ? undefined : "O jogador precisa estar conectado."}
              stretch
              onClick={() => setShowKickConfirm(true)}
            >
              Expulsar
            </KickButton>
          </Actions>
        )}
      </ItemContainer>

      {showKickConfirm && (
        <ConfirmDialog
          message={`Tem certeza que deseja expulsar ${characterSheet.nickName} do lobby?`}
          confirmLabel="Expulsar"
          confirmVariant="danger"
          onConfirm={handleKickConfirm}
          onCancel={() => setShowKickConfirm(false)}
        />
      )}
    </>
  );
}

const ItemContainer = styled.div<{ $isOnline: boolean; $clickable: boolean }>`
  position: relative;
  overflow: hidden;
  border-radius: 0px 16px 0 0;
  border-left: 4px solid
    ${({ $isOnline }) => ($isOnline ? colors.statusOngoing : colors.statusLeft)};
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
  opacity: ${({ $isOnline }) => ($isOnline ? 1 : 0.75)};

  &:hover {
    filter: ${({ $clickable }) => ($clickable ? "brightness(1.05)" : "none")};
  }
`;

const StatusBadge = styled.span<{ $isOnline: boolean }>`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: bold;
  background-color: ${({ $isOnline }) =>
    $isOnline ? colors.statusOngoing : colors.statusLeft};
  color: ${({ $isOnline }) => ($isOnline ? colors.textPrimary : colors.textDisabled)};
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  padding: 6px 8px;
  background-color: ${colors.overlayMedium};
`;

const KickButton = styled(BlockableButton)`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  padding: 0 12px;
  background-color: ${colors.actionDestructive};
  color: ${colors.textPrimary};
  transition: filter 0.2s;

  &:hover:not([aria-disabled="true"]) {
    filter: brightness(1.15);
  }
  &[aria-disabled="true"] {
    background-color: ${colors.surfaceDisabled};
    color: ${colors.textDisabledOnDark};
    filter: none;
    cursor: not-allowed;
  }
`;
