import type { Root, RootContent, Parent, Text } from "mdast";

// "(em breve)" nos docs marca o que existe no back mas ainda não é dos jogadores.
// Vira um nó que o remark-rehype entrega como <coming-soon>, mapeado para o selo.
const MARKER = /\(em breve\)/gi;

function split(node: Text): RootContent[] | null {
  const parts: RootContent[] = [];
  let last = 0;
  for (const m of node.value.matchAll(MARKER)) {
    if (m.index > last) parts.push({ type: "text", value: node.value.slice(last, m.index) });
    parts.push({
      type: "comingSoon",
      data: { hName: "coming-soon" },
    } as unknown as RootContent);
    last = m.index + m[0].length;
  }
  if (parts.length === 0) return null;
  if (last < node.value.length) parts.push({ type: "text", value: node.value.slice(last) });
  return parts;
}

// Só nós "text": code span (inlineCode) e fence (code) guardam o literal em `value` de outro tipo.
export function remarkComingSoon(): (tree: Root) => void {
  const visit = (parent: Parent) => {
    const next: RootContent[] = [];
    for (const child of parent.children as RootContent[]) {
      if (child.type === "text") {
        next.push(...(split(child) ?? [child]));
      } else {
        if ("children" in child) visit(child as Parent);
        next.push(child);
      }
    }
    parent.children = next as Parent["children"];
  };
  return (tree) => visit(tree);
}
