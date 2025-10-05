import NenPrinciplesSVG from "../../assets/diagrams/nen_principles.svg";
import { type Ability, type Skill } from "../../types/characterSheet.ts";
import type { DiagramsMode } from "./types/diagramsMode.ts";
import styled from "styled-components";

interface NenPrinciplesDiagramProps {
  mode: DiagramsMode;
  principles?: {
    [key: string]: Skill;
  };
  spiritualAbility?: Ability;
}

const NenPrinciplesDiagram = ({
  mode,
  principles = {},
  spiritualAbility = { level: 0, bonus: 0 },
}: NenPrinciplesDiagramProps) => {
  const principlePositions = [
    { name: "ten", key: "Ten", x: "39%", y: "69%" },
    { name: "zetsu", key: "Zts", x: "61.6%", y: "69%" },
    { name: "ren", key: "Ren", x: "39.6%", y: "38%" },
    { name: "en", key: "En", x: "1%", y: "51.5%" },
    { name: "ken", key: "Ken", x: "29%", y: "12%" },
    { name: "kou", key: "Kou", x: "99%", y: "51.5%" },
    { name: "ryu", key: "Ryu", x: "71.2%", y: "12%" },
    { name: "gyo", key: "Gyo", x: "60.4%", y: "38%" },
    { name: "shu", key: "Shu", x: "29%", y: "89%" },
    { name: "in", key: "In", x: "71%", y: "89%" },
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

        {principlePositions.map((pos) => {
          const principle = principles[pos.name];

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
                <AttributeLevel>{principle?.level || 0}</AttributeLevel>
                {/* <AttributeLevel>Nv.{principle.level}</AttributeLevel> */}
                <AttributePower>{principle?.value || 0}</AttributePower>
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
  top: 54%;
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
  font-size: min(7.4cqi, 32px);
  color: white;
  margin-bottom: 1cqi;
`;

const SpiritualNumbers = styled.div`
  display: flex;
  font-size: min(7.5cqi, 32px);
  gap: 3cqi;
`;

const SpiritualLevel = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  color: white;
`;

const SpiritualBonus = styled.div`
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
  font-size: min(7cqi, 32px);
  padding: 1px 0px;
`;

const AttributeNumbers = styled.div`
  display: flex;
  gap: 2.2cqi;
  font-size: 5.8cqi;
`;

const AttributeLevel = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
`;

const AttributePower = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
`;
