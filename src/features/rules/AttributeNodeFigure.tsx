import styled from "styled-components";
import AttributeNode from "../sheet/AttributeNode";
import { colors } from "../../styles/tokens";

// "Como ler um atributo" (claude-design/NoAtributo.dc.html): o nó como aparece na ficha
// e um cartão para cada um dos três números.
const CARDS = [
  { value: 3, title: "Nível", text: "Sobe com a experiência.", points: false },
  { value: 2, title: "Pontos", text: "Os seus: + põe, − tira.", points: true },
  { value: 8, title: "Poder", text: "O que conta nos testes.", points: false },
];

export default function AttributeNodeFigure() {
  return (
    <Figure aria-label="Como ler um atributo: AGI com os números 3, 2 e 8">
      <Node>
        <Kicker>Na ficha</Kicker>
        <AttributeNode label="AGI" level={3} points={2} power={8} size="figure" />
        <NodeName>Agilidade · AGI</NodeName>
      </Node>
      <Cards>
        {CARDS.map((c) => (
          <Card key={c.title} $points={c.points}>
            <CardValue $points={c.points}>{c.value}</CardValue>
            <CardTitle $points={c.points}>{c.title}</CardTitle>
            <CardText>{c.text}</CardText>
          </Card>
        ))}
      </Cards>
      <Caption>Os três números sob a sigla, da esquerda para a direita: nível · pontos · poder.</Caption>
    </Figure>
  );
}

const Figure = styled.figure`
  margin: 20px 0 24px;
  padding: 20px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  background: ${colors.surfaceDeep};
  border: 1px solid ${colors.borderMuted};
  border-radius: 6px;
  color: ${colors.textPrimary};
`;

const Node = styled.div`
  flex: 0 0 auto;
  width: 116px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const Kicker = styled.span`
  margin-bottom: 4px;
  font-size: 11px;
  line-height: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${colors.textLabelMuted};
`;

const NodeName = styled.span`
  margin-top: 6px;
  font-size: 13px;
  line-height: 18px;
  color: ${colors.textMuted};
  white-space: nowrap;
`;

const Cards = styled.div`
  flex: 1 1 300px;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
`;

const Card = styled.div<{ $points: boolean }>`
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: ${colors.surfaceMuted};
  border: 1px solid ${({ $points }) => ($points ? colors.vitalPoints : colors.borderMuted)};
  border-radius: 6px;
`;

const CardValue = styled.span<{ $points: boolean }>`
  font-size: 30px;
  line-height: 34px;
  font-weight: 700;
  color: ${({ $points }) => ($points ? colors.vitalPoints : colors.textPrimary)};
`;

const CardTitle = styled.span<{ $points: boolean }>`
  font-size: 15px;
  line-height: 20px;
  font-weight: 700;
  color: ${({ $points }) => ($points ? colors.vitalPoints : colors.textPrimary)};
`;

const CardText = styled.span`
  font-size: 13px;
  line-height: 18px;
  color: ${colors.textMuted};
`;

const Caption = styled.figcaption`
  flex: 1 1 100%;
  font-size: 13px;
  line-height: 18px;
  color: ${colors.textLabelMuted};
`;
