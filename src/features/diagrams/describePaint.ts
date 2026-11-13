import type { DiagramName } from "./geometry";
import type { PaintSpec } from "./paint";

// Nomes em português dos nós (siglas da ficha), para o aria-label do diagrama.
const NODE_NAMES: Record<string, string> = {
  RES: "Resistência",
  SEN: "Sentido",
  FLX: "Flexibilidade",
  AGI: "Agilidade",
  Str: "Força",
  Con: "Constituição",
  Dex: "Destreza",
  Cel: "Celeridade",
  RSL: "Resiliência",
  ADP: "Adaptabilidade",
  JUD: "Julgamento",
  CRE: "Criatividade",
  Zts: "Zetsu",
};

const DIAGRAM_NAMES: Record<DiagramName, { title: string; all: string }> = {
  physical: { title: "Diagrama físico", all: "todos os atributos acesos" },
  mental: { title: "Diagrama mental", all: "todos os atributos acesos" },
  "nen-principles": { title: "Diagrama dos princípios Nen", all: "todos os princípios acesos" },
};

const nodeName = (id: string) => NODE_NAMES[id] ?? id;

const joinPt = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;

export function describePaint(name: DiagramName, spec: PaintSpec): string {
  const { title, all } = DIAGRAM_NAMES[name];
  if (spec === "all") return `${title} com ${all}`;
  if (spec.nodes.length > 0) return `${title} com destaque em ${joinPt(spec.nodes.map(nodeName))}`;
  const links = spec.segments.map(([a, b]) => `${nodeName(a)} e ${nodeName(b)}`);
  if (links.length === 0) return title;
  return `${title} com destaque na ligação entre ${links.join("; ")}`;
}
