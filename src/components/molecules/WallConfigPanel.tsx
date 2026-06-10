import styled from "styled-components";
import { fonts } from "../../styles/tokens";
import type { WallSegment } from "../../types/tacticalMap";

type Props = {
  wall: WallSegment;
  onUpdate: (patch: Partial<WallSegment>) => void;
  onRemove: () => void;
};

export default function WallConfigPanel({ wall, onUpdate, onRemove }: Props) {
  return (
    <Container>
      <Header>
        <Title>Segmento</Title>
        <RemoveButton type="button" onClick={onRemove}>Remover</RemoveButton>
      </Header>
      <Row><Label>Tipo</Label><Value>{wall.wallType}</Value></Row>
      <Row><Label>Material</Label><Value>{wall.material}</Value></Row>
      <Row><Label>HP</Label><Value>{wall.hp} / {wall.maxHp}</Value></Row>
      <Divider />
      <CheckRow>
        <input id="wall-move" type="checkbox" checked={wall.move}
          onChange={(e) => onUpdate({ move: e.target.checked })} />
        <CheckLabel htmlFor="wall-move">Bloqueia movimento</CheckLabel>
      </CheckRow>
      {(wall.wallType === "door" || wall.wallType === "window") && (
        <CheckRow>
          <input id="wall-open" type="checkbox" checked={wall.open}
            onChange={(e) => onUpdate({ open: e.target.checked })} />
          <CheckLabel htmlFor="wall-open">Aberta</CheckLabel>
        </CheckRow>
      )}
      {wall.wallType === "door" && (
        <CheckRow>
          <input id="wall-locked" type="checkbox" checked={wall.locked}
            onChange={(e) => onUpdate({ locked: e.target.checked })} />
          <CheckLabel htmlFor="wall-locked">Trancada</CheckLabel>
        </CheckRow>
      )}
    </Container>
  );
}

const Container = styled.div`
  display: flex; flex-direction: column; gap: 10px; padding: 12px 0;
  font-family: ${fonts.sans};
`;
const Header = styled.div`display: flex; justify-content: space-between; align-items: center;`;
const Title = styled.span`font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.9);`;
const RemoveButton = styled.button`
  font-family: ${fonts.sans};
  font-size: 12px; padding: 3px 10px; border-radius: 4px;
  border: 1px solid #ef4444; background: transparent; color: #ef4444; cursor: pointer;
  &:hover { background: #ef4444; color: #fff; }
`;
const Row = styled.div`display: flex; gap: 8px; align-items: center;`;
const Label = styled.span`font-size: 12px; color: rgba(255, 255, 255, 0.5); min-width: 60px;`;
const Value = styled.span`font-size: 12px; color: rgba(255, 255, 255, 0.9);`;
const Divider = styled.hr`border: none; border-top: 1px solid #334155; margin: 0;`;
const CheckRow = styled.div`display: flex; align-items: center; gap: 8px;`;
const CheckLabel = styled.label`font-size: 12px; color: rgba(255, 255, 255, 0.9); cursor: pointer;`;
