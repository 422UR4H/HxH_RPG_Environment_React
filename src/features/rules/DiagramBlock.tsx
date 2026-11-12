import { useEffect, useMemo } from "react";
import styled from "styled-components";
import PhysicalsDiagram from "../sheet/PhysicalsDiagram";
import MentalsDiagram from "../sheet/MentalsDiagram";
import NenPrinciplesDiagram from "../sheet/NenPrinciplesDiagram";
import { GEOMETRY_BY_NAME, type DiagramName } from "../diagrams/geometry";
import { parsePaintSpec, type PaintSpec } from "../diagrams/paint";
import { describePaint } from "../diagrams/describePaint";
import AttributeNodeFigure from "./AttributeNodeFigure";
import { parseDiagramFence } from "./markdownMapping";

interface DiagramBlockProps {
  // Info string depois de "diagram" (ex.: "physical paint=RES,AGI").
  meta: string | undefined;
  // O bloco ASCII do doc, desenhado quando o marcador não vale.
  fallback: string;
}

type Resolved =
  | { kind: "attribute-node" }
  | { kind: "diagram"; name: DiagramName; paint: PaintSpec }
  | { kind: "invalid" };

function resolve(meta: string | undefined): Resolved {
  const fence = parseDiagramFence("diagram", meta);
  if (!fence) return { kind: "invalid" };
  if (fence.name === "attribute-node") return { kind: "attribute-node" };
  const paint = parsePaintSpec(fence.paintRaw, GEOMETRY_BY_NAME[fence.name]);
  return paint ? { kind: "diagram", name: fence.name, paint } : { kind: "invalid" };
}

export default function DiagramBlock({ meta, fallback }: DiagramBlockProps) {
  // Estável por meta: o GlowDiagram compara `paint` por referência.
  const resolved = useMemo(() => resolve(meta), [meta]);

  useEffect(() => {
    if (resolved.kind === "invalid" && import.meta.env.DEV) {
      console.warn(`[regras] marcador de diagrama inválido: "diagram ${meta ?? ""}"`);
    }
  }, [resolved, meta]);

  if (resolved.kind === "invalid") {
    return (
      <pre>
        <code>{fallback}</code>
      </pre>
    );
  }
  if (resolved.kind === "attribute-node") return <AttributeNodeFigure />;

  const { name, paint } = resolved;
  return (
    <Frame role="img" aria-label={describePaint(name, paint)}>
      <Diagram>
        {name === "physical" && <PhysicalsDiagram mode="view" variant="rules" paint={paint} />}
        {name === "mental" && <MentalsDiagram mode="view" variant="rules" paint={paint} />}
        {name === "nen-principles" && <NenPrinciplesDiagram mode="view" variant="rules" paint={paint} />}
      </Diagram>
    </Frame>
  );
}

const Frame = styled.div`
  margin: 20px 0 24px;
  display: flex;
  justify-content: center;
`;

// Container próprio: os diagramas escalam rótulos e margens em cqi.
const Diagram = styled.div`
  container-type: inline-size;
  width: min(100%, 380px);
  padding: 0 8%;
`;
