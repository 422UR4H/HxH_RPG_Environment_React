import { type Ability, type Attribute } from "../../types/characterSheet";
import type { DiagramsMode } from "./types/diagramsMode";
import styled from "styled-components";
import PlusButton from "../../components/ions/PlusButton";
import MinusButton from "../../components/ions/MinusButton";
import { deriveMiddlePoints } from "./utils/distribute";
import { colors } from "../../styles/tokens";
import GlowDiagram from "../diagrams/GlowDiagram";
import { PHYSICAL_GEOMETRY } from "../diagrams/geometry";
import type { PaintSpec } from "../diagrams/paint";
import AttributeNode, { AttributeLabel } from "./AttributeNode";

interface PhysicalsDiagramProps {
  mode: DiagramsMode;
  attributes?: {
    [key: string]: Attribute;
  };
  /** Pede ao dono da ficha que some `delta` aos pontos do atributo; o diagrama não muta `attributes`. */
  onAttributePointsChange?: (name: string, delta: 1 | -1) => void;
  physicalAbility?: Ability;
  /** "rules": só as siglas, nas posições da visualização (painel de regras). */
  variant?: "sheet" | "rules";
  paint?: PaintSpec;
}

const attributePositions = [
  { name: "resistance", key: "RES", x: "50.2%", y: "8%", isPrimary: true },
  { name: "constitution", key: "Con", x: "74%", y: "26%", isPrimary: false },
  { name: "strength", key: "Str", x: "26%", y: "26%", isPrimary: false },
  { name: "agility", key: "AGI", x: "7%", y: "53%", isPrimary: true },
  { name: "dexterity", key: "Dex", x: "74%", y: "74%", isPrimary: false },
  { name: "sense", key: "SEN", x: "93%", y: "53%", isPrimary: true },
  { name: "flexibility", key: "FLX", x: "50.2%", y: "92%", isPrimary: true },
  { name: "celerity", key: "Cel", x: "26%", y: "74%", isPrimary: false },
];

const primaryAttributeNames = new Set(
  attributePositions.filter((p) => p.isPrimary).map((p) => p.name)
);

const PhysicalsDiagram = ({
  mode,
  attributes = {},
  onAttributePointsChange,
  physicalAbility = { level: 0, bonus: 0 },
  variant = "sheet",
  paint = "all",
}: PhysicalsDiagramProps) => {
  const isRules = variant === "rules";
  // A variante de regras usa o layout da visualização mesmo num modo de distribuição.
  const isDistributeMode =
    !isRules && (mode === "distribute" || mode === "create" || mode === "edit");
  const spent = Object.entries(attributes)
    .filter(([name]) => primaryAttributeNames.has(name))
    .reduce((sum, [, a]) => sum + (a?.points || 0), 0);
  // Derivado a cada render: o nível de Físicos muda com a classe e com as
  // escolhas (a prévia recalcula), e um contador guardado na montagem ficava
  // velho. Pode ficar negativo se o nível cair abaixo do que já foi gasto.
  const distributionPoints = (physicalAbility?.level || 0) - spent;

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

  const positions = attributePositions.map((p) => ({ ...p }));
  let marginTop = "0";
  let marginBottom = "0";
  if (isDistributeMode) {
    marginTop = "16cqi";
    marginBottom = "20cqi";

    positions[0].y = "0%";
    positions[1].y = "20%";
    positions[2].y = "20%";
    positions[4].y = "80%";
    positions[6].y = "101%";
    positions[7].y = "80%";
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
          <GlowDiagram geometry={PHYSICAL_GEOMETRY} color="physical" paint={paint} />
        </SVGContainer>

        {!isRules && (
          <PhysicalAbility>
            <PhysicalLabel>PHYSICAL</PhysicalLabel>
            <PhysicalNumbers>
              <PhysicalLevel>{physicalAbility?.level}</PhysicalLevel>
              <PhysicalBonus>{physicalAbility?.bonus}</PhysicalBonus>
            </PhysicalNumbers>
          </PhysicalAbility>
        )}

        {positions.map((pos) => {
          const attr = attributes[pos.name];
          const displayPoints = pos.isPrimary
            ? (attr?.points ?? 0)
            : deriveMiddlePoints(pos.name, attributes);
          const canIncrement = distributionPoints > 0;
          const canDecrement = pos.isPrimary && (attr?.points || 0) > 0;

          return (
            <AttributeMarker
              key={pos.key}
              style={{
                left: pos.x,
                top: pos.y,
              }}
            >
              {isDistributeMode && pos.isPrimary && (
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
                  points={displayPoints}
                  power={attr?.power || 0}
                />
              )}

              {isDistributeMode && pos.isPrimary && (
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
export default PhysicalsDiagram;

const DiagramContainer = styled.div<{
  $marginTop?: string;
  $marginBottom?: string;
}>`
  margin-bottom: ${({ $marginBottom }) => $marginBottom || "8cqi"};
  margin-top: ${({ $marginTop }) => $marginTop || "16cqi"};
  width: 100%;
`;

const DiagramWrapper = styled.div`
  container-type: inline-size;
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  margin: 0 auto;
`;

const Distribution = styled.div`
  position: absolute;
  top: -20cqi;
  width: 40cqi;

  font-family: "Roboto", sans-serif;
  font-weight: 500;
  font-size: 6cqi;
  line-height: 8cqi;

  @media (max-width: 589px) {
    top: -17cqi;
  }
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

const PhysicalAbility = styled.div`
  position: absolute;
  top: 54%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 3;
`;

const PhysicalLabel = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  font-size: min(7.6cqi, 34px);
  color: white;
  margin-bottom: 2cqi;
`;

const PhysicalNumbers = styled.div`
  display: flex;
  font-size: min(7.5cqi, 32px);
  gap: 3cqi;
`;

const PhysicalLevel = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  color: white;
`;

const PhysicalBonus = styled.div`
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
