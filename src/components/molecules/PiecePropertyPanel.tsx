import styled from "styled-components";
import type { Piece } from "../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import { colors, fonts } from "../../styles/tokens";

type Props = {
  piece: Piece;
  npc: CharacterPrivateSummary;
  onZChange: (z: number) => void;
  onRemove: () => void;
};

export default function PiecePropertyPanel({ piece, npc, onZChange, onRemove }: Props) {
  const initial = npc.nickName[0]?.toUpperCase() ?? "?";

  return (
    <Panel>
      <NpcHeader>
        <Avatar>{npc.avatarUrl ? <img src={npc.avatarUrl} alt="" /> : initial}</Avatar>
        <NpcInfo>
          <NpcName>{npc.nickName}</NpcName>
          <NpcMeta>NPC · no campo</NpcMeta>
        </NpcInfo>
      </NpcHeader>

      <details data-testid="mais-configs">
        <Summary role="button">mais configurações</Summary>
        <ConfigBody>
          <FieldLabel>Altura (Z)</FieldLabel>
          <ZRow>
            <ZSlider
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={piece.coord.z}
              onChange={(e) => onZChange(Number(e.target.value))}
            />
            <ZValue>{piece.coord.z.toFixed(1)}m</ZValue>
          </ZRow>
        </ConfigBody>
      </details>

      <Divider />

      <RemoveButton type="button" onClick={onRemove}>
        ✕ Remover do mapa
      </RemoveButton>
      <DragHint>ou arraste a peça de volta para a lista</DragHint>
    </Panel>
  );
}

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 10px;
  border-bottom: 1px solid ${colors.borderInput};
`;

const NpcHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: ${colors.surfaceInput};
  border-radius: 6px;
  border: 1px solid ${colors.borderInput};
  margin-bottom: 10px;
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${colors.brandAccent};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${fonts.sans};
  font-size: 14px;
  font-weight: 700;
  color: ${colors.textPrimary};
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const NpcInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const NpcName = styled.span`
  font-family: ${fonts.sans};
  font-size: 13px;
  font-weight: 600;
  color: ${colors.textPrimary};
`;

const NpcMeta = styled.span`
  font-family: ${fonts.sans};
  font-size: 11px;
  color: ${colors.textMuted};
`;

const Summary = styled.summary`
  font-family: ${fonts.sans};
  font-size: 11px;
  color: ${colors.textMuted};
  cursor: pointer;
  padding: 4px 0;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 4px;

  &::before {
    content: "▶";
    font-size: 9px;
    transition: transform 0.15s;
  }

  details[open] &::before {
    transform: rotate(90deg);
  }
`;

const ConfigBody = styled.div`
  padding: 8px 0 4px;
`;

const FieldLabel = styled.div`
  font-family: ${fonts.sans};
  font-size: 10px;
  color: ${colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
`;

const ZRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ZSlider = styled.input`
  flex: 1;
  accent-color: ${colors.brandAccent};
`;

const ZValue = styled.span`
  font-family: ${fonts.sans};
  font-size: 12px;
  color: ${colors.brandAccent};
  font-weight: 700;
  min-width: 32px;
  text-align: right;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${colors.borderInput};
  margin: 10px 0;
`;

const RemoveButton = styled.button`
  width: 100%;
  padding: 8px;
  border: 1px solid ${colors.danger}55;
  background: ${colors.danger}11;
  color: ${colors.danger};
  border-radius: 6px;
  font-family: ${fonts.sans};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: background 0.15s;

  &:hover {
    background: ${colors.danger}22;
    border-color: ${colors.danger};
  }
`;

const DragHint = styled.p`
  font-family: ${fonts.sans};
  font-size: 10px;
  color: ${colors.textPlaceholder};
  text-align: center;
  margin-top: 4px;
`;
