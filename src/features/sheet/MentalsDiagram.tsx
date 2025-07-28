import MentalLozengeSVG from "../../assets/diagrams/physical_lozange.svg";
import { type Ability, type Attribute } from "../../types/characterSheet.ts";
import styled from "styled-components";

interface MentalsDiagramProps {
  attributes: {
    [key: string]: Attribute;
  };
  mentalAbility: Ability;
}

const MentalsDiagram = ({ attributes, mentalAbility }: MentalsDiagramProps) => {
  const attributePositions = [
    { name: "resilience", key: "RSL", x: "50%", y: "8%" },
    // { name: "emotion", key: "EMO", x: "50%", y: "8%" },
    { name: "adaptability", key: "ADP", x: "92%", y: "53%" },
    // { name: "charism", key: "CAR", x: "92%", y: "53%" },
    { name: "weighting", key: "WEG", x: "50%", y: "92%" },
    // { name: "reasoning", key: "REA", x: "50%", y: "92%" },
    { name: "creativity", key: "CRE", x: "8%", y: "53%" },
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
          if (!attr) return null;

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
                <AttributePoints>{attr.points}</AttributePoints>
                <AttributeLevel>{attr.level}</AttributeLevel>
                {/* <AttributeLevel>Nv.{attr.level}</AttributeLevel> */}
                <AttributePower>{attr.power}</AttributePower>
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
  top: 52%;
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
  font-size: 6cqi;
  color: white;
  margin-bottom: 10px;
`;

const MentalNumbers = styled.div`
  display: flex;
  gap: 3cqi;
`;

const MentalLevel = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  font-size: 6cqi;
  color: white;
`;

const MentalBonus = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  font-size: 6cqi;
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
  font-size: 5.4cqi;
  padding: 2px 0px;
  border-radius: 4px;
`;

const AttributeNumbers = styled.div`
  display: flex;
  gap: 1.2cqi;
`;

const AttributePoints = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  font-size: 4cqi;
  color: white;
  align-items: center;
  justify-content: center;
`;

const AttributeLevel = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  font-size: 4cqi;
`;

const AttributePower = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  font-size: 4cqi;
`;
