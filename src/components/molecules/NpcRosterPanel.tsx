import { useState } from "react";
import styled from "styled-components";
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import useToken from "../../hooks/useToken";
import { useCampaignDetails } from "../../hooks/useCampaignDetails";
import CharacterSidebarItem from "./CharacterSidebarItem";
import { colors, fonts } from "../../styles/tokens";

type Props = {
  campaignId: string;
  placedCharacterIds: Set<string>;
  placingNpcId: string | null;
  isDropTarget: boolean;
  onPointerDownNpc: (npc: CharacterPrivateSummary, e: React.PointerEvent) => void;
};

export default function NpcRosterPanel({
  campaignId,
  placedCharacterIds,
  placingNpcId,
  isDropTarget,
  onPointerDownNpc,
}: Props) {
  const { token } = useToken();
  const { data: campaign } = useCampaignDetails(token, campaignId);
  const [search, setSearch] = useState("");

  const npcs = (campaign?.characterSheets ?? []).filter((cs) => !cs.playerUuid);
  const available = npcs.filter(
    (npc) =>
      !placedCharacterIds.has(npc.uuid) &&
      npc.nickName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <DropZone
      data-testid="npc-roster-drop-zone"
      data-drop-target={isDropTarget ? "true" : "false"}
      $isDropTarget={isDropTarget}
    >
      <SearchInput
        placeholder="Buscar NPC..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <List>
        {available.map((npc) => (
          <CardWrapper
            key={npc.uuid}
            data-testid={`npc-card-${npc.uuid}`}
            $isPlacing={placingNpcId === npc.uuid}
            onPointerDown={(e) => onPointerDownNpc(npc, e)}
          >
            <CharacterSidebarItem
              character={npc}
              isMaster={true}
              onClick={() => {}}
            />
          </CardWrapper>
        ))}
        {available.length === 0 && (
          <EmptyHint>
            {npcs.length === 0
              ? "Nenhum NPC na campanha."
              : "Todos os NPCs estão no campo."}
          </EmptyHint>
        )}
      </List>
    </DropZone>
  );
}

const DropZone = styled.div<{ $isDropTarget: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px;
  border: 2px solid
    ${({ $isDropTarget }) =>
      $isDropTarget ? colors.brandAccent : "transparent"};
  border-radius: 6px;
  background: ${({ $isDropTarget }) =>
    $isDropTarget ? `${colors.brandAccent}0d` : "transparent"};
  transition: border-color 0.15s, background 0.15s;
`;

const SearchInput = styled.input`
  font-family: ${fonts.sans};
  font-size: 12px;
  color: ${colors.textPrimary};
  background: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 5px;
  padding: 5px 8px;
  margin-bottom: 6px;
  outline: none;
  width: 100%;

  &::placeholder {
    color: ${colors.textPlaceholder};
  }
  &:focus {
    border-color: ${colors.brandAccentBright};
  }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
`;

const CardWrapper = styled.div<{ $isPlacing: boolean }>`
  border-radius: 6px;
  border: 2px solid
    ${({ $isPlacing }) =>
      $isPlacing ? colors.brandAccent : "transparent"};
  cursor: grab;
  touch-action: none;
  transition: border-color 0.15s;

  &:hover {
    border-color: ${colors.brandAccent};
  }
  &:active {
    cursor: grabbing;
  }
`;

const EmptyHint = styled.p`
  font-family: ${fonts.sans};
  font-size: 11px;
  color: ${colors.textPlaceholder};
  text-align: center;
  padding: 16px 0;
`;
