import styled from "styled-components";
import type { CharacterPrivateSummary } from "../../types/campaign";

interface CharacterSidebarItemProps {
  character: CharacterPrivateSummary & { isPending?: boolean };
  isMaster: boolean;
  onClick: () => void;
}

export default function CharacterSidebarItem({
  character,
  isMaster,
  onClick,
}: CharacterSidebarItemProps) {
  const isDead = !!character.deadAt;
  const isPending = !!character.isPending;
  const isNpc = !character.playerUuid;

  return (
    <CharacterItem
      $isDead={isDead}
      $isPending={isPending}
      $isNpc={isNpc}
      $clickable={isMaster}
      onClick={isMaster ? onClick : undefined}
    >
      <CharacterName>{character.nickName}</CharacterName>
      <CharacterMeta>
        <div>{character.fullName}</div>
        <StatusBars>
          <StatusBar
            $type="health"
            $value={(character.health.current / character.health.max) * 100}
          />
          <StatusBar
            $type="stamina"
            $value={(character.stamina.current / character.stamina.max) * 100}
          />
        </StatusBars>
      </CharacterMeta>

      {isPending && <PendingBadge>Pendente</PendingBadge>}
      {isDead && <DeadBadge>Morto</DeadBadge>}
      {isNpc && <NpcBadge>NPC</NpcBadge>}
    </CharacterItem>
  );
}

const CharacterItem = styled.div<{
  $isDead?: boolean;
  $isPending?: boolean;
  $isNpc?: boolean;
  $clickable?: boolean;
}>`
  background-color: ${({ $isDead, $isPending, $isNpc }) =>
    $isDead ? "#3a3131" : $isPending ? "#31353a" : $isNpc ? "#313a35" : "#333"};
  border-radius: 8px;
  padding: 15px;
  position: relative;
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
    background-color: ${({ $clickable }) => ($clickable ? "#444" : "inherit")};
  }
`;

const CharacterName = styled.div`
  font-family: "Oswald", sans-serif;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
`;

const CharacterMeta = styled.div`
  font-size: 14px;
  color: #9f9f9f;
`;

const StatusBars = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
`;

const StatusBar = styled.div<{
  $type: "health" | "stamina";
  $value: number;
}>`
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

const Badge = styled.span`
  position: absolute;
  top: 10px;
  right: 10px;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: bold;
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
