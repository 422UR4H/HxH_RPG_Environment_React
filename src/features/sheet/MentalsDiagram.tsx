import MentalLozengeSVG from "../../assets/diagrams/physical_lozange.svg";
import PlusButton from "../../components/ions/PlusButton";
import { type Ability, type Attribute } from "../../types/characterSheet.ts";
import type { DiagramsMode } from "./types/diagramsMode.ts";
import styled from "styled-components";
import MinusButton from "../../components/ions/MinusButton.tsx";
import { useState } from "react";

interface MentalsDiagramProps {
  mode: DiagramsMode;
  attributes?: {
    [key: string]: Attribute;
  };
  mentalAbility?: Ability;
}

const MentalsDiagram = ({
  mode,
  attributes = {},
  mentalAbility = { level: 0, bonus: 0 },
}: MentalsDiagramProps) => {
  const spent = Object.values(attributes).reduce((sum, a) => sum + (a?.points || 0), 0);
  const [distributionPoints, setDistributionPoints] = useState(
    Math.max(0, (mentalAbility?.level || 0) - spent)
  );

  const incDistributionPoints = () => {
    setDistributionPoints((prev) => prev + 1);
  };
  const decDistributionPoints = () => {
    setDistributionPoints((prev) => (prev > 0 ? prev - 1 : 0));
  };

  const incAttributePoints = (attr: Attribute) => {
    if (distributionPoints <= 0) return;
    attr?.points !== undefined && (attr.points += 1);
    decDistributionPoints();
  };
  const decAttributePoints = (attr: Attribute) => {
    if (attr?.points === undefined || attr.points <= 0) return;
    attr.points -= 1;
    incDistributionPoints();
  };

  const attributePositions = [
    { name: "resilience", key: "RSL", x: "50.2%", y: "8%" },
    // { name: "emotion", key: "EMO", x: "50%", y: "8%" },
    { name: "adaptability", key: "ADP", x: "93%", y: "53%" },
    // { name: "charism", key: "CAR", x: "92%", y: "53%" },
    { name: "weighting", key: "WEG", x: "50.2%", y: "92%" },
    // { name: "reasoning", key: "REA", x: "50%", y: "92%" },
    { name: "creativity", key: "CRE", x: "7%", y: "53%" },
  ];
  let marginTop;
  let marginBottom;
  if (mode === "distribute" || mode === "create" || mode === "edit") {
    marginTop = "16cqi";
    marginBottom = "16cqi";

    attributePositions[0].y = "0%";
    attributePositions[2].y = "101%";
  }

  return (
    <DiagramContainer $marginTop={marginTop} $marginBottom={marginBottom}>
      <DiagramWrapper>
        {(mode === "distribute" || mode === "create" || mode === "edit") && (
          <Distribution>
            Pontos para Distribuir: {distributionPoints}
          </Distribution>
        )}

        <SVGContainer>
          {/* <MentalLozengeSVG /> */}
          <img src={MentalLozengeSVG} alt="Mentals Diagram" />
        </SVGContainer>

        <MentalAbility>
          <MentalLabel>MENTAL</MentalLabel>
          <MentalNumbers>
            <MentalLevel>{mentalAbility?.level}</MentalLevel>
            <MentalBonus>{mentalAbility?.bonus}</MentalBonus>
          </MentalNumbers>
        </MentalAbility>

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
              {(mode === "distribute" ||
                mode === "create" ||
                mode === "edit") && (
                <PlusButton
                  isDisabled={!canIncrement}
                  onClick={() => incAttributePoints(attr)}
                />
              )}

              <AttributeLabel>{pos.key}</AttributeLabel>
              <AttributeNumbers>
                <AttributeLevel>{attr?.level || 0}</AttributeLevel>
                <AttributePoints>{attr?.points || 0}</AttributePoints>
                {/* <AttributeLevel>Nv.{attr.level}</AttributeLevel> */}
                <AttributePower>{attr?.power || 0}</AttributePower>
              </AttributeNumbers>

              {(mode === "distribute" ||
                mode === "create" ||
                mode === "edit") && (
                <MinusButton
                  isDisabled={!canDecrement}
                  onClick={() => decAttributePoints(attr)}
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

const SVGContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain; /* Isso garante que a imagem mantenha sua proporção */
  }

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

const AttributeLabel = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  font-size: min(7.4cqi, 32px);
  padding: 2px 0px;
  margin-top: 0.4cqi;
  border-radius: 4px;
`;

const AttributeNumbers = styled.div`
  display: flex;
  gap: 1.2cqi;
  font-size: 5.8cqi;
`;

const AttributePoints = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  color: #00ea5a;
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
`;
