import NenPrinciplesSVG from "../../assets/diagrams/nen_principles.svg";
import { type Ability } from "../../types/characterSheet.ts";
import styled from "styled-components";

interface NenPrinciplesDiagramProps {
  principles: {
    [key: string]: { valueForTest: number; level: number };
  };
  spiritualAbility: Ability;
}

const NenPrinciplesDiagram = ({
  principles,
  spiritualAbility,
}: NenPrinciplesDiagramProps) => {
  const attributePositions = [
    { name: "ten", key: "Ten", x: "38.4%", y: "69%" },
    { name: "zetsu", key: "Zts", x: "62%", y: "69%" },
    // { name: "ren", key: "Ren", x: "29%", y: "30%" },
    { name: "ren", key: "Ren", x: "39%", y: "37%" },
    { name: "en", key: "En", x: "1%", y: "51.5%" },
    { name: "ken", key: "Ken", x: "29%", y: "13%" },
    { name: "kou", key: "Kou", x: "98.5%", y: "51.5%" },
    { name: "ryu", key: "Ryu", x: "71.2%", y: "13%" },
    // { name: "gyo", key: "Gyo", x: "71.2%", y: "30%" },
    { name: "gyo", key: "Gyo", x: "61%", y: "37%" },
    // { name: "shu", key: "Shu", x: "30%", y: "70%" },
    { name: "in", key: "In", x: "71%", y: "87%" },
  ];

  return (
    <DiagramContainer>
      <DiagramWrapper>
        <SVGContainer>
          {/* <NenPrinciplesSVG /> */}
          <img src={NenPrinciplesSVG} alt="Spirituals Diagram" />
        </SVGContainer>

        <SpiritualAbility>
          <SpiritualLabel>SPIRITUAL</SpiritualLabel>
          <SpiritualNumbers>
            <SpiritualLevel>{spiritualAbility?.level}</SpiritualLevel>
            <SpiritualBonus>{spiritualAbility?.bonus}</SpiritualBonus>
          </SpiritualNumbers>
        </SpiritualAbility>

        {attributePositions.map((pos) => {
          const attr = principles[pos.name];
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
                <AttributeLevel>{attr.level}</AttributeLevel>
                {/* <AttributeLevel>Nv.{attr.level}</AttributeLevel> */}
                <AttributePower>{attr.valueForTest}</AttributePower>
              </AttributeNumbers>
            </AttributeMarker>
          );
        })}
      </DiagramWrapper>
    </DiagramContainer>
  );
};
export default NenPrinciplesDiagram;

const DiagramContainer = styled.div`
  background-color: black;
  width: 100%;
`;

const DiagramWrapper = styled.div`
  container-type: inline-size;
  position: relative;
  width: 88%;
  padding-bottom: 100%;
  margin: 0 auto;
`;

const SVGContainer = styled.div`
  position: absolute;
  top: 0;
  left: 1%;
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

const SpiritualAbility = styled.div`
  position: absolute;
  top: 53.5%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 3;
`;

const SpiritualLabel = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  font-size: 7cqi;
  color: white;
  margin-bottom: 4px;
`;

const SpiritualNumbers = styled.div`
  display: flex;
  gap: 3cqi;
`;

const SpiritualLevel = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  font-size: 6cqi;
  color: white;
`;

const SpiritualBonus = styled.div`
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
  font-size: 6cqi;
  padding: 2px 0px;
  border-radius: 4px;
`;

const AttributeNumbers = styled.div`
  display: flex;
  gap: 2.2cqi;
`;

const AttributeLevel = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  font-size: 5cqi;
`;

const AttributePower = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  font-size: 5cqi;
`;
