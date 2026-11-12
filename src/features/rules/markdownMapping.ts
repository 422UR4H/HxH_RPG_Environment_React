import type { Element, ElementContent, Root, RootContent } from "hast";
import type { DiagramName } from "../diagrams/geometry";

// Mapeamento puro do Markdown das regras para o painel (spec §5.3 e §5.4).

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Ids "<capítulo>--<título>": o mesmo "Visão Geral" em vários capítulos não colide.
export function headingId(chapterSlug: string, text: string): string {
  return `${chapterSlug}--${slugify(text)}`;
}

// Âncora malformada ("#100%") não pode derrubar o render: usa o texto cru.
function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

// Link relativo para outro doc ("./x.md", "../x.md", "x.md", com "#âncora" opcional).
// URL com esquema, caminho absoluto ou só "#âncora" não é link de doc.
export function resolveDocLink(href: string): { slug: string; anchor?: string } | null {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("/") || href.startsWith("//")) return null;
  const match = href.match(/^([^#?]*?)([^/#?]+)\.md(?:#(.*))?$/);
  if (!match) return null;
  const slug = match[2];
  const anchor = match[3] ? slugify(safeDecode(match[3])) : "";
  return anchor ? { slug, anchor } : { slug };
}

// Regra de detecção (o spec deixa a escolha ao construtor):
// - fórmula: o conteúdo é só itálico ("> *valor = pontos + nível*") ou começa com um
//   termo em negrito seguido de "=" ("> **Valor de Teste** = ..."), como os docs escrevem;
// - nota: começa com um rótulo em negrito que não é fórmula ("> **Nota:** ...",
//   "> **🔍 Curiosidade — ...**");
// - o resto é citação comum.
export function classifyBlockquote(text: {
  firstStrong: boolean;
  onlyEmphasis: boolean;
  equalsAfterStrong?: boolean;
}): "formula" | "note" | "plain" {
  if (text.onlyEmphasis) return "formula";
  if (text.firstStrong) return text.equalsAfterStrong ? "formula" : "note";
  return "plain";
}

const FENCE_NAMES: readonly (DiagramName | "attribute-node")[] = [
  "physical",
  "mental",
  "nen-principles",
  "attribute-node",
];

// Info string "diagram <nome> [paint=...]"; nome desconhecido → null.
export function parseDiagramFence(
  lang: string | undefined,
  meta: string | undefined,
): { name: DiagramName | "attribute-node"; paintRaw?: string } | null {
  if (lang !== "diagram" || !meta) return null;
  const [rawName, ...rest] = meta.trim().split(/\s+/);
  const name = FENCE_NAMES.find((n) => n === rawName);
  if (!name) return null;
  const paint = rest.find((t) => t.startsWith("paint="));
  return paint ? { name, paintRaw: paint.slice("paint=".length) } : { name };
}

export function hastText(node: Root | RootContent | ElementContent): string {
  if (node.type === "text") return node.value;
  if ("children" in node) return node.children.map(hastText).join("");
  return "";
}

const childElements = (n: Root | Element): Element[] =>
  (n.children as RootContent[]).filter((c): c is Element => c.type === "element");

function findAll(n: Root | Element, tagName: string, out: Element[] = []): Element[] {
  for (const c of childElements(n)) {
    if (c.tagName === tagName) out.push(c);
    findAll(c, tagName, out);
  }
  return out;
}

// Copia o texto do <th> de cada coluna para data-label nos <td>: a tabela empilhada
// em largura estreita mostra "rótulo: valor".
export function rehypeTableLabels(): (tree: Root) => void {
  return (tree) => {
    for (const table of findAll(tree, "table")) {
      const labels = findAll(table, "th").map((th) => hastText(th).trim());
      for (const tr of findAll(table, "tr")) {
        childElements(tr)
          .filter((c) => c.tagName === "td")
          .forEach((td, i) => {
            if (labels[i]) td.properties.dataLabel = labels[i];
          });
      }
    }
  };
}

// Desce um nível os títulos (o painel desenha o título do capítulo como h2) e dá a cada
// um o id do capítulo.
export function rehypeChapterHeadings(chapterSlug: string): () => (tree: Root) => void {
  return () => (tree) => {
    const visit = (n: Root | Element) => {
      for (const c of childElements(n)) {
        const level = /^h([1-6])$/.exec(c.tagName);
        if (level) {
          c.tagName = `h${Math.min(Number(level[1]) + 1, 6)}`;
          c.properties.id = headingId(chapterSlug, hastText(c));
        } else visit(c);
      }
    };
    visit(tree);
  };
}
