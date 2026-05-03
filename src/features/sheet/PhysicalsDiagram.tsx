import PhysicalLozengeSVG from "../../assets/diagrams/physical_lozange.svg";
import { type Ability, type Attribute } from "../../types/characterSheet";
import type { DiagramsMode } from "./types/diagramsMode";
import styled from "styled-components";
import PlusButton from "../../components/ions/PlusButton";
import MinusButton from "../../components/ions/MinusButton";
import { useEffect, useState } from "react";

interface PhysicalsDiagramProps {
  mode: DiagramsMode;
  attributes?: {
    [key: string]: Attribute;
  };
  physicalAbility?: Ability;
}

const PhysicalsDiagram = ({
  mode,
  attributes = {},
  physicalAbility = { level: 0, bonus: 0 },
}: PhysicalsDiagramProps) => {
  const [distributionPoints, setDistributionPoints] = useState(
    physicalAbility?.level || 0
  );
  useEffect(() => {
    setDistributionPoints(physicalAbility?.level || 0);
  }, [physicalAbility?.level]);

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
    { name: "resistance", key: "RES", x: "50.2%", y: "8%" },
    { name: "constitution", key: "Con", x: "74%", y: "26%" },
    { name: "strength", key: "Str", x: "26%", y: "26%" },
    { name: "agility", key: "AGI", x: "7%", y: "53%" },
    { name: "dexterity", key: "Dex", x: "74%", y: "74%" },
    { name: "sense", key: "SEN", x: "93%", y: "53%" },
    { name: "flexibility", key: "FLX", x: "50.2%", y: "92%" },
    { name: "celerity", key: "Cel", x: "26%", y: "74%" },
  ];
  let marginTop = "0";
  let marginBottom = "0";
  if (mode === "distribute" || mode === "create" || mode === "edit") {
    marginTop = "16cqi";
    marginBottom = "20cqi";

    attributePositions[0].y = "0%";
    attributePositions[1].y = "20%";
    attributePositions[2].y = "20%";
    attributePositions[4].y = "80%";
    attributePositions[6].y = "101%";
    attributePositions[7].y = "80%";
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
                <AttributePower>
                  {attr?.power || 0}
                  {/* <span className="tentacle" />
                  <span className="tentacle" />
                  <span className="tentacle" />
                  <span className="tentacle" />
                  <span className="tentacle" />
                  <span className="tentacle" /> */}
                </AttributePower>
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
  margin-top: 0.4cqi;
  border-radius: 4px;
`;

const AttributeNumbers = styled.div`
  display: flex;
  gap: 1.2cqi;
  font-size: 5.8cqi;
  /* margin-bottom: 0.4cqi; */
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

// const AttributePower = styled.div`
//   font-family: "Roboto", sans-serif;
//   font-weight: bold;
//   color: white;
//   position: relative;

//   /* Text shadow multicamadas */
//   text-shadow: 0 0 3px rgba(135, 206, 235, 1), 0 0 6px rgba(135, 206, 235, 0.9),
//     0 0 12px rgba(135, 206, 235, 0.7), 0 0 18px rgba(135, 206, 235, 0.5),
//     0 0 24px rgba(135, 206, 235, 0.3);

//   animation: powerPulse 2.8s ease-in-out infinite;

//   /* Múltiplas camadas de aura */
//   &::before {
//     content: "";
//     position: absolute;
//     top: 50%;
//     left: 50%;
//     transform: translate(-50%, -50%);
//     width: 160%;
//     height: 160%;
//     background: radial-gradient(
//       ellipse at center,
//       rgba(135, 206, 235, 0.5) 0%,
//       rgba(135, 206, 235, 0.3) 20%,
//       rgba(135, 206, 235, 0.2) 40%,
//       rgba(135, 206, 235, 0.1) 60%,
//       transparent 80%
//     );
//     border-radius: 50%;
//     animation: auraRotate 3.5s ease-in-out infinite;
//     z-index: -1;

//     /* Box shadow para criar densidade */
//     box-shadow: inset 0 0 10px rgba(135, 206, 235, 0.4),
//       0 0 15px rgba(135, 206, 235, 0.3), 0 0 25px rgba(135, 206, 235, 0.2);
//   }

//   &::after {
//     content: "";
//     position: absolute;
//     top: 50%;
//     left: 50%;
//     transform: translate(-50%, -50%);
//     width: 220%;
//     height: 220%;
//     background: conic-gradient(
//       from 45deg,
//       transparent 0deg,
//       rgba(135, 206, 235, 0.15) 20deg,
//       transparent 40deg,
//       rgba(135, 206, 235, 0.2) 60deg,
//       transparent 80deg,
//       rgba(135, 206, 235, 0.15) 100deg,
//       transparent 120deg,
//       rgba(135, 206, 235, 0.2) 140deg,
//       transparent 160deg,
//       rgba(135, 206, 235, 0.15) 180deg,
//       transparent 200deg,
//       rgba(135, 206, 235, 0.2) 220deg,
//       transparent 240deg,
//       rgba(135, 206, 235, 0.15) 260deg,
//       transparent 280deg,
//       rgba(135, 206, 235, 0.2) 300deg,
//       transparent 320deg,
//       rgba(135, 206, 235, 0.15) 340deg,
//       transparent 360deg
//     );
//     border-radius: 50%;
//     animation: outerAura 5s linear infinite reverse;
//     z-index: -2;
//     filter: blur(1px);
//   }

//   @keyframes powerPulse {
//     0%,
//     100% {
//       text-shadow: 0 0 3px rgba(135, 206, 235, 1),
//         0 0 6px rgba(135, 206, 235, 0.9), 0 0 12px rgba(135, 206, 235, 0.7);
//     }
//     50% {
//       text-shadow: 0 0 5px rgba(135, 206, 235, 1),
//         0 0 10px rgba(135, 206, 235, 1), 0 0 20px rgba(135, 206, 235, 0.9),
//         0 0 30px rgba(135, 206, 235, 0.6), 0 0 40px rgba(135, 206, 235, 0.3);
//     }
//   }

//   @keyframes auraRotate {
//     0% {
//       transform: translate(-50%, -50%) rotate(0deg) scale(1);
//       opacity: 0.8;
//     }
//     25% {
//       transform: translate(-50%, -50%) rotate(90deg) scale(1.05);
//       opacity: 0.9;
//     }
//     50% {
//       transform: translate(-50%, -50%) rotate(180deg) scale(1.1);
//       opacity: 1;
//     }
//     75% {
//       transform: translate(-50%, -50%) rotate(270deg) scale(1.05);
//       opacity: 0.9;
//     }
//     100% {
//       transform: translate(-50%, -50%) rotate(360deg) scale(1);
//       opacity: 0.8;
//     }
//   }

//   @keyframes outerAura {
//     0% {
//       transform: translate(-50%, -50%) rotate(0deg);
//       filter: blur(1px);
//     }
//     50% {
//       transform: translate(-50%, -50%) rotate(180deg);
//       filter: blur(2px);
//     }
//     100% {
//       transform: translate(-50%, -50%) rotate(360deg);
//       filter: blur(1px);
//     }
//   }
// `;
const AttributePower = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: bold;
  color: white;
  position: relative;

  /* text-shadow: 0 0 0.25cqi rgba(120, 200, 255, 1),
               0 0 0.5cqi rgba(120, 200, 255, 0.8),
               0 0 1cqi rgba(120, 200, 255, 0.6);
  filter: drop-shadow(0 0 0.6cqi rgba(120, 200, 255, 0.7)); */

  /* aura respirante */
  /* &::before {
    content: "";
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: 150%;
    height: 160%;
    background: radial-gradient(
      ellipse at center,
      rgba(135, 206, 250, 0.25) 0%,
      rgba(135, 206, 250, 0.1) 60%,
      transparent 100%
    );
    filter: blur(0.6cqi);
    animation: glowPulse 3.2s ease-in-out infinite;
    z-index: -1;
  } */

  /* tentáculos */
  /* span.tentacle {
    position: absolute;
    bottom: 0;
    width: 0.55cqi;
    height: 7cqi;
    border-radius: 50%;
    background: linear-gradient(
      to top,
      rgba(120, 200, 255, 0.95) 0%,
      rgba(120, 200, 255, 0.6) 35%,
      rgba(120, 200, 255, 0.25) 80%,
      transparent 100%
    );
    filter: blur(0.25cqi);
    opacity: 0.9;
    z-index: -1;
    transform-origin: center bottom;
    animation: tentacleDance 3s ease-in-out infinite;
  } */

  /* múltiplos tentáculos em posições variadas */
  /* span.tentacle:nth-child(2) {
    left: 43%;
    animation-delay: 0.2s;
    height: 7.2cqi;
  }
  span.tentacle:nth-child(3) {
    left: 47%;
    animation-delay: 0.6s;
    height: 6.8cqi;
  }
  span.tentacle:nth-child(4) {
    left: 52%;
    animation-delay: 1.1s;
    height: 7.5cqi;
  }
  span.tentacle:nth-child(5) {
    left: 57%;
    animation-delay: 1.6s;
    height: 6.9cqi;
  }
  span.tentacle:nth-child(6) {
    left: 61%;
    animation-delay: 2s;
    height: 7.3cqi;
  } */

  /* aura geral */
  /* @keyframes glowPulse {
    0%, 100% {
      opacity: 0.45;
      transform: translateX(-50%) scale(1);
    }
    50% {
      opacity: 0.8;
      transform: translateX(-50%) scale(1.05);
    }
  } */

  /* animação dançante, com base fixa e topo dissipando */
  /* @keyframes tentacleDance {
    0% {
      transform: scaleY(1) scaleX(1) skewX(0deg);
      opacity: 0.9;
    }
    20% {
      transform: scaleY(1.05) scaleX(0.95) skewX(3deg);
      opacity: 1;
    }
    40% {
      transform: scaleY(1.1) scaleX(0.9) skewX(-3deg);
      opacity: 0.95;
    }
    60% {
      transform: scaleY(1.08) scaleX(1) skewX(2deg);
      opacity: 0.9;
    }
    80% {
      transform: scaleY(1.12) scaleX(0.92) skewX(-2deg);
      opacity: 0.85;
    }
    100% {
      transform: scaleY(1.05) scaleX(1) skewX(1deg);
      opacity: 0.8;
    }
  } */
`;
