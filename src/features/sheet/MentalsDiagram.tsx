import MentalLozengeSVG from "../../assets/diagrams/physical_lozange.svg";
import { type Ability, type Attribute } from "../../types/characterSheet.ts";
import type { DiagramsMode } from "./types/diagramsMode.ts";
import styled from "styled-components";

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
  const attributePositions = [
    { name: "resilience", key: "RSL", x: "50%", y: "8%" },
    // { name: "emotion", key: "EMO", x: "50%", y: "8%" },
    { name: "adaptability", key: "ADP", x: "93%", y: "53%" },
    // { name: "charism", key: "CAR", x: "92%", y: "53%" },
    { name: "weighting", key: "WEG", x: "50%", y: "92%" },
    // { name: "reasoning", key: "REA", x: "50%", y: "92%" },
    { name: "creativity", key: "CRE", x: "7%", y: "53%" },
  ];

  return (
    <DiagramContainer>
      <DiagramWrapper>
        <SVGContainer>
          {/* <MentalLozengeSVG /> */}
          {/* <img src={MentalLozengeSVG} alt="Mentals Diagram" /> */}
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

          return (
            <AttributeMarker
              key={pos.key}
              style={{
                left: pos.x,
                top: pos.y,
              }}
            >
              <AttributeLabel>{pos.key}</AttributeLabel>
              <AttributeNumbers>
                <AttributePoints>{attr?.points || 0}</AttributePoints>
                <AttributeLevel>{attr?.level || 0}</AttributeLevel>
                {/* <AttributeLevel>Nv.{attr.level}</AttributeLevel> */}
                <AttributePower>{attr?.power || 0}</AttributePower>
              </AttributeNumbers>
            </AttributeMarker>
          );
        })}
      </DiagramWrapper>
    </DiagramContainer>
  );
};
export default MentalsDiagram;

const DiagramContainer = styled.div`
  background-color: black;
  margin-bottom: 20cqi;
  width: 100%;
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
  color: white;
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
