import styled from "styled-components";
import type { CharacterBaseSummary, StatusBar } from "../../types/characterSheet";
import { createEmptyCharacterSheet } from "../../features/sheet/factories/characterSheet.factory";
import CharacterSheetHeader from "./CharacterSheetHeader";
import Badge from "../ions/Badge";
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
      data-testid={`character-row-${character.uuid}`}
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
      {isPending && <OverlayBadge tone="pending" size="sm" uppercase={false}>Pendente</OverlayBadge>}
      {isNpc && <OverlayBadge tone="ongoing" size="sm" uppercase={false}>NPC</OverlayBadge>}
      {isDead && <OverlayBadge tone="danger" size="sm" uppercase={false}>Morto</OverlayBadge>}
      {hasLeft && <OverlayBadge tone="muted" size="sm" uppercase={false}>Saiu</OverlayBadge>}
      {isOnline === true && <OverlayBadge tone="ongoing" size="sm" uppercase={false}>CONECTADO</OverlayBadge>}
      {isOnline === false && <OverlayBadge tone="muted" size="sm" uppercase={false}>AGUARDANDO</OverlayBadge>}
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
  if ($isDead) return colors.feedbackDanger;
  if ($isPending) return colors.statusPending;
  if ($isOnline === false) return colors.statusLeft;
  if ($isOnline === true) return colors.statusOngoing;
  if ($isNpc) return colors.statusOngoing;
  return colors.actionAccent;
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

// Selo sobre a capa do card: posição aqui, aparência no ion.
const OverlayBadge = styled(Badge)`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
`;
