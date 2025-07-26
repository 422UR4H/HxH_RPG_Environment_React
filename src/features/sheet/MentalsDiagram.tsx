import MentalLozengeSVG from "../../assets/diagrams/physical_lozange.svg";
import { type Ability } from "../../types/characterSheet.ts";
import styled from "styled-components";

interface MentalsDiagramProps {
  attributes: {
    [key: string]: { power: number; level: number };
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
                <AttributeValue>{attr.power}</AttributeValue>
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
  margin-bottom: 7vw;
  margin-bottom: 7dvw;
  /* margin-bottom: 50px; */
  width: 100%;
`;

const DiagramWrapper = styled.div`
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

const MentalLevel = styled.div`
  font-family: "Roboto", sans-serif;
  font-size: min(5.4vw, 2.2rem);
  font-weight: bold;
  color: white;
`;

const MentalBonus = styled.div`
  font-family: "Roboto", sans-serif;
  font-size: min(5.4vw, 2.2rem);
  font-weight: bold;
  color: white;
`;

const MentalAbility = styled.div`
  position: absolute;
  top: 52%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 3;
  border-radius: 50%;
  width: min(35%, 180px);
  height: min(35%, 180px);
  padding: 10px;
`;

const MentalLabel = styled.div`
  font-family: "Roboto", sans-serif;
  font-size: min(5.6vw, 2.4rem);
  font-weight: bold;
  color: white;
  text-align: center;
  margin-bottom: 10px;
`;

const MentalNumbers = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
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
  font-size: min(5vw, 2rem);
  font-weight: bold;
  padding: 2px 0px;
  border-radius: 4px;
`;

const AttributeNumbers = styled.div`
  display: flex;
  gap: min(1vw, 0.5rem);
`;

const AttributeValue = styled.div`
  font-family: "Roboto", sans-serif;
  font-size: min(4vw, 1.6rem);
  font-weight: bold;
  color: white;
  align-items: center;
  justify-content: center; */
`;

const AttributeLevel = styled.div`
  font-family: "Roboto", sans-serif;
  font-size: min(4vw, 1.6rem);
  font-weight: bold;
`;

const AttributePower = styled.div`
  font-family: "Roboto", sans-serif;
  font-size: min(4vw, 1.6rem);
  font-weight: bold;
`;
