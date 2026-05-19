import styled from "styled-components";
import type { CharacterBaseSummary, StatusBar } from "../../types/characterSheet";
import { createEmptyCharacterSheet } from "../../features/sheet/factories/characterSheet.factory";
import CharacterSheetHeader from "../../components/molecules/CharacterSheetHeader";

interface CharacterSidebarItemProps {
  character: CharacterBaseSummary & {
    isPending?: boolean;
    fullName?: string;
    characterClass?: string;
    currExp?: number;
    nextLvlBaseExp?: number;
    health?: StatusBar;
    stamina?: StatusBar;
  };
  isMaster: boolean;
  isOwn?: boolean;
  hasLeft?: boolean;
  onClick: () => void;
}

export default function CharacterSidebarItem({
  character,
  isMaster,
  isOwn,
  hasLeft,
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
    </ItemContainer>
  );
}

const ItemContainer = styled.div<{
  $isDead?: boolean;
  $isPending?: boolean;
  $isNpc?: boolean;
  $clickable?: boolean;
}>`
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  opacity: ${({ $isDead }) => ($isDead ? 0.7 : 1)};
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
  border-left: 4px solid
    ${({ $isDead, $isPending, $isNpc }) =>
      $isDead
        ? "#e74c3c"
        : $isPending
        ? "#3498db"
        : $isNpc
        ? "#2ecc71"
        : "#ffa216"};

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
  background-color: #3498db;
  color: white;
`;

const DeadBadge = styled(Badge)`
  background-color: #e74c3c;
  color: white;
`;

const NpcBadge = styled(Badge)`
  background-color: #2ecc71;
  color: white;
`;

const LeftBadge = styled(Badge)`
  background-color: #555;
  color: #ccc;
`;
