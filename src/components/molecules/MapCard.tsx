// src/components/molecules/MapCard.tsx
import styled from "styled-components";
import type { TacticalMap } from "../../types/tacticalMap";
import { colors, fonts } from "../../styles/tokens";

interface MapCardProps {
  map: TacticalMap;
  onClick: () => void;
}

export default function MapCard({ map, onClick }: MapCardProps) {
  return (
    <Card onClick={onClick}>
      <MapName>{map.name}</MapName>
      {map.description && (
        <MapDescription>{map.description}</MapDescription>
      )}
    </Card>
  );
}

const Card = styled.button`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  background-color: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background-color 0.15s;

  &:hover {
    background-color: ${colors.surfaceInputHover};
  }
`;

const MapName = styled.h3`
  font-family: ${fonts.sans};
  font-size: 18px;
  font-weight: 700;
  color: ${colors.textPrimary};
  margin: 0;
`;

const MapDescription = styled.p`
  font-family: ${fonts.sans};
  font-size: 14px;
  color: ${colors.textMuted};
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;
