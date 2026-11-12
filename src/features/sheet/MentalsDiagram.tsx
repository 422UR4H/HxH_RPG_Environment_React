import PlusButton from "../../components/ions/PlusButton";
import { type Ability, type Attribute } from "../../types/characterSheet.ts";
import type { DiagramsMode } from "./types/diagramsMode.ts";
import styled from "styled-components";
import MinusButton from "../../components/ions/MinusButton.tsx";
import { colors } from "../../styles/tokens";
import GlowDiagram from "../diagrams/GlowDiagram";
import { MENTAL_GEOMETRY } from "../diagrams/geometry";
import type { PaintSpec } from "../diagrams/paint";
import AttributeNode, { AttributeLabel } from "./AttributeNode";

interface MentalsDiagramProps {
  mode: DiagramsMode;
  attributes?: {
    [key: string]: Attribute;
  };
  /** Pede ao dono da ficha que some `delta` aos pontos do atributo; o diagrama não muta `attributes`. */
  onAttributePointsChange?: (name: string, delta: 1 | -1) => void;
  mentalAbility?: Ability;
  /** "rules": só as siglas, nas posições da visualização (painel de regras). */
  variant?: "sheet" | "rules";
  paint?: PaintSpec;
}

const MentalsDiagram = ({
  mode,
  attributes = {},
  onAttributePointsChange,
  mentalAbility = { level: 0, bonus: 0 },
  variant = "sheet",
  paint = "all",
}: MentalsDiagramProps) => {
  const isRules = variant === "rules";
  // A variante de regras usa o layout da visualização mesmo num modo de distribuição.
  const isDistributeMode =
    !isRules && (mode === "distribute" || mode === "create" || mode === "edit");
  const spent = Object.values(attributes).reduce((sum, a) => sum + (a?.points || 0), 0);
  // Derivado a cada render (ver PhysicalsDiagram): nada de contador guardado.
  const distributionPoints = (mentalAbility?.level || 0) - spent;

  const incAttributePoints = (name: string) => {
    if (distributionPoints <= 0) return;
    if (attributes[name]?.points !== undefined)
      onAttributePointsChange?.(name, 1);
  };
  const decAttributePoints = (name: string) => {
    const points = attributes[name]?.points;
    if (points === undefined || points <= 0) return;
    onAttributePointsChange?.(name, -1);
  };

  const attributePositions = [
    { name: "resilience", key: "RSL", x: "50.2%", y: "8%" },
    // { name: "emotion", key: "EMO", x: "50%", y: "8%" },
    { name: "adaptability", key: "ADP", x: "93%", y: "53%" },
    // { name: "charism", key: "CAR", x: "92%", y: "53%" },
    { name: "judgment", key: "JUD", x: "50.2%", y: "92%" },
    // { name: "reasoning", key: "REA", x: "50%", y: "92%" },
    { name: "creativity", key: "CRE", x: "7%", y: "53%" },
  ];
  let marginTop;
  let marginBottom;
  if (isDistributeMode) {
    marginTop = "16cqi";
    marginBottom = "16cqi";

    attributePositions[0].y = "0%";
    attributePositions[2].y = "101%";
  }

  return (
    <DiagramContainer $marginTop={marginTop} $marginBottom={marginBottom}>
      <DiagramWrapper>
        {isDistributeMode && (
          <Distribution>
            Pontos para Distribuir: <DistributionPoints>{distributionPoints}</DistributionPoints>
          </Distribution>
        )}

        <SVGContainer>
          <GlowDiagram geometry={MENTAL_GEOMETRY} color="mental" paint={paint} />
        </SVGContainer>

        {!isRules && (
          <MentalAbility>
            <MentalLabel>MENTAL</MentalLabel>
            <MentalNumbers>
              <MentalLevel>{mentalAbility?.level}</MentalLevel>
              <MentalBonus>{mentalAbility?.bonus}</MentalBonus>
            </MentalNumbers>
          </MentalAbility>
        )}

        {attributePositions.map((pos) => {
          const attr = attributes[pos.name];
          const canIncrement = distributionPoints > 0;
          const canDecrement = (attr?.points || 0) > 0;

          return (
            <AttributeMarker
              key={pos.key}
              style={{
                left: pos.x,
                top: pos.y,
              }}
            >
              {isDistributeMode && (
                <PlusButton
                  isDisabled={!canIncrement}
                  onClick={() => incAttributePoints(pos.name)}
                />
              )}

              {isRules ? (
                <AttributeLabel>{pos.key}</AttributeLabel>
              ) : (
                <AttributeNode
                  label={pos.key}
                  level={attr?.level || 0}
                  points={attr?.points || 0}
                  power={attr?.power || 0}
                />
              )}

              {isDistributeMode && (
                <MinusButton
                  isDisabled={!canDecrement}
                  onClick={() => decAttributePoints(pos.name)}
                />
              )}
            </AttributeMarker>
          );
        })}
      </DiagramWrapper>
    </DiagramContainer>
  );
};
export default MentalsDiagram;

const DiagramContainer = styled.div<{
  $marginTop?: string;
  $marginBottom?: string;
}>`
  margin-bottom: ${({ $marginBottom }) => $marginBottom || "16cqi"};
  margin-top: ${({ $marginTop }) => $marginTop || "8cqi"};
  width: 100%;

  @media (max-width: 589px) {
    margin-bottom: ${({ $marginBottom }) => $marginBottom || "4cqi"};
  }
`;

const DiagramWrapper = styled.div`
  container-type: inline-size;
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  margin: 0 auto;
`;

const DistributionPoints = styled.span`
  color: ${colors.vitalPoints};
`;

const SVGContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: visible;

  svg {
    width: 100%;
    height: 100%;
  }
`;

const Distribution = styled.div`
  position: absolute;
  top: -18cqi;
  width: 40cqi;

  font-family: "Roboto", sans-serif;
  font-weight: 500;
  font-size: 6cqi;
  line-height: 8cqi;

  @media (max-width: 589px) {
    top: -17cqi;
  }
`;

const MentalAbility = styled.div`
  position: absolute;
  top: 54%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 3;
`;

const MentalLabel = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  font-size: min(7.6cqi, 34px);
  color: white;
  margin-bottom: 2cqi;
`;

const MentalNumbers = styled.div`
  display: flex;
  font-size: min(7.2cqi, 30px);
  gap: 3cqi;
`;

const MentalLevel = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  color: white;
`;

const MentalBonus = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  color: white;
`;

const AttributeMarker = styled.div`
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2;
`;
