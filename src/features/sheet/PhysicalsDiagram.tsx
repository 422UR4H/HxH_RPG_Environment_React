import PhysicalLozengeSVG from "../../assets/diagrams/physical_lozange.svg";
import { type Ability, type Attribute } from "../../types/characterSheet.ts";
import styled from "styled-components";

interface PhysicalsDiagramProps {
  attributes: {
    [key: string]: Attribute;
  };
  physicalAbility: Ability;
}

const PhysicalsDiagram = ({
  attributes,
  physicalAbility,
}: PhysicalsDiagramProps) => {
  const attributePositions = [
    { name: "resistance", key: "RES", x: "50%", y: "8%" },
    { name: "constitution", key: "Con", x: "74%", y: "26%" },
    { name: "strength", key: "Str", x: "26%", y: "26%" },
    { name: "agility", key: "AGI", x: "7%", y: "53%" },
    { name: "dexterity", key: "Dex", x: "74%", y: "74%" },
    { name: "sense", key: "SEN", x: "93%", y: "53%" },
    { name: "flexibility", key: "FLX", x: "50%", y: "92%" },
    { name: "celerity", key: "Cel", x: "26%", y: "74%" },
  ];

  return (
    <DiagramContainer>
      <DiagramWrapper>
        <SVGContainer>
          {/* <PhysicalLozengeSVG /> */}
          <img src={PhysicalLozengeSVG} alt="Physicals Diagram" />
        </SVGContainer>

        <PhysicalAbility>
          <PhysicalLabel>PHYSICAL</PhysicalLabel>
          <PhysicalNumbers>
            <PhysicalLevel>{physicalAbility?.level}</PhysicalLevel>
            <PhysicalBonus>{physicalAbility?.bonus}</PhysicalBonus>
          </PhysicalNumbers>
        </PhysicalAbility>

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
export default PhysicalsDiagram;

const DiagramContainer = styled.div`
  background-color: black;
  margin-bottom: 8cqi;
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
