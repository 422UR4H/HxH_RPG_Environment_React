import styled from "styled-components";
import type { CharacterBaseSummary, StatusBar } from "../../types/characterSheet";
import { createEmptyCharacterSheet } from "../../features/sheet/factories/characterSheet.factory";
import CharacterSheetHeader from "./CharacterSheetHeader";
import { colors } from "../../styles/tokens";

interface CharacterSidebarItemProps {
  character: CharacterBaseSummary & {
    isPending?: boolean;
    fullName?: string;
    characterClass?: string;
    level?: number;
    currExp?: number;
    nextLvlBaseExp?: number;
    health?: StatusBar;
    stamina?: StatusBar;
  };
  isMaster: boolean;
  isOwn?: boolean;
  hasLeft?: boolean;
  isOnline?: boolean;
  onClick: () => void;
}

export default function CharacterSidebarItem({
  character,
  isMaster,
  isOwn,
  hasLeft,
  isOnline,
  onClick,
}: CharacterSidebarItemProps) {
  const isDead = !!character.deadAt;
  const isPending = !!character.isPending;
  const isNpc = !character.playerUuid;

  const charSheet = createEmptyCharacterSheet();
  charSheet.characterClass = character.characterClass ?? "";
  charSheet.profile = {
    ...charSheet.profile,
    nickname: character.nickName,
    fullname: character.fullName ?? "",
    coverUrl: character.coverUrl,
    avatarUrl: character.avatarUrl,
  };
  if (character.health && character.stamina) {
    charSheet.status = {
      health: character.health,
      stamina: character.stamina,
    };
  }
  if (character.currExp !== undefined && character.nextLvlBaseExp !== undefined) {
    charSheet.characterExp = {
      ...charSheet.characterExp,
      level: character.level ?? charSheet.characterExp.level,
      currExp: character.currExp,
      nextLvlBaseExp: character.nextLvlBaseExp,
    };
  }

  const isClickable = isMaster || !!isOwn;

  return (
    <ItemContainer
      $isDead={isDead}
      $isPending={isPending}
      $isNpc={isNpc}
      $isOnline={isOnline}
      $clickable={isClickable}
      onClick={isClickable ? onClick : undefined}
    >
      <CharacterSheetHeader
        mode="card"
        data={{ charSheet }}
        showStatus={!!character.health}
      />
      {isPending && <PendingBadge>Pendente</PendingBadge>}
      {isNpc && <NpcBadge>NPC</NpcBadge>}
      {isDead && <DeadBadge>Morto</DeadBadge>}
      {hasLeft && <LeftBadge>Saiu</LeftBadge>}
      {isOnline === true && <OnlineBadge>ONLINE</OnlineBadge>}
      {isOnline === false && <AwaitingBadge>AGUARDANDO</AwaitingBadge>}
    </ItemContainer>
  );
}

const borderColor = ({
  $isDead,
  $isPending,
  $isOnline,
  $isNpc,
}: {
  $isDead?: boolean;
  $isPending?: boolean;
  $isOnline?: boolean;
  $isNpc?: boolean;
}): string => {
  if ($isDead) return colors.danger;
  if ($isPending) return colors.statusPending;
  if ($isOnline === false) return colors.statusLeft;
  if ($isOnline === true) return colors.statusOngoing;
  if ($isNpc) return colors.statusNpc;
  return colors.orange;
};

const ItemContainer = styled.div<{
  $isDead?: boolean;
  $isPending?: boolean;
  $isNpc?: boolean;
  $isOnline?: boolean;
  $clickable?: boolean;
}>`
  position: relative;
  overflow: hidden;
  border-radius: 0px 16px 0 0;
  opacity: ${({ $isDead }) => ($isDead ? 0.7 : 1)};
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
  border-left: 4px solid
    ${({ $isDead, $isPending, $isOnline, $isNpc }) =>
      borderColor({ $isDead, $isPending, $isOnline, $isNpc })};

  &:hover {
    filter: ${({ $clickable }) => ($clickable ? "brightness(1.05)" : "none")};
  }
`;

const Badge = styled.span`
  position: absolute;
  top: 10px;
  right: 10px;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: bold;
  z-index: 10;
`;

const PendingBadge = styled(Badge)`
  background-color: ${colors.statusPending};
  color: ${colors.textPrimary};
`;

const DeadBadge = styled(Badge)`
  background-color: ${colors.danger};
  color: ${colors.textPrimary};
`;

const NpcBadge = styled(Badge)`
  background-color: ${colors.statusNpc};
  color: ${colors.textPrimary};
`;

const LeftBadge = styled(Badge)`
  background-color: ${colors.statusLeft};
  color: ${colors.textDisabled};
`;

const OnlineBadge = styled(Badge)`
  background-color: ${colors.statusOngoing};
  color: ${colors.textPrimary};
`;

const AwaitingBadge = styled(Badge)`
  background-color: ${colors.statusLeft};
  color: ${colors.textDisabled};
`;
