import styled, { css } from "styled-components";
import { colors } from "../../styles/tokens";

// Zona pixel-tuned (src/components/CLAUDE.md): valores copiados do marcador do
// PhysicalsDiagram, não normalizar.

type NodeSize = "sheet" | "figure";

interface AttributeNodeProps {
  label: string;
  level: number;
  points: number;
  power: number;
  // "sheet" escala pelo container do diagrama (cqi); "figure" fica fora de um diagrama e usa os
  // mesmos tamanhos que a ficha tem no desktop (diagrama com 425px de largura).
  size?: "sheet" | "figure";
}

export default function AttributeNode({ label, level, points, power, size = "sheet" }: AttributeNodeProps) {
  return (
    <>
      <AttributeLabel $size={size}>{label}</AttributeLabel>
      <AttributeNumbers $size={size}>
        <AttributeLevel>{level}</AttributeLevel>
        <AttributePoints>{points}</AttributePoints>
        <AttributePower>{power}</AttributePower>
      </AttributeNumbers>
    </>
  );
}

export const AttributeLabel = styled.div<{ $size?: NodeSize }>`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  font-size: min(7.4cqi, 32px);
  padding: 2px 0px;
  margin-top: 0.4cqi;
  border-radius: 4px;

  ${({ $size }) =>
    $size === "figure" &&
    css`
      font-size: 31.45px;
      margin-top: 1.7px;
    `}
`;

const AttributeNumbers = styled.div<{ $size: NodeSize }>`
  display: flex;
  gap: 1.2cqi;
  font-size: 5.8cqi;

  ${({ $size }) =>
    $size === "figure" &&
    css`
      gap: 5.1px;
      font-size: 24.65px;
    `}
`;

const AttributePoints = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  color: ${colors.vitalPoints};
  align-items: center;
  justify-content: center;
`;

const AttributeLevel = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
`;

const AttributePower = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  color: ${colors.textPrimary};
  position: relative;
`;
