import { Component, createContext, lazy, Suspense, useContext, useMemo, type ComponentProps, type MouseEvent, type ReactNode } from "react";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Element, ElementContent } from "hast";
import type { RuleChapter } from "../../types/rules";
import ComingSoonBadge from "../../components/ions/ComingSoonBadge";
import DiagramBlock from "./DiagramBlock";
import { remarkComingSoon } from "./remarkComingSoon";
import {
  classifyBlockquote,
  hastText,
  headingId,
  rehypeChapterHeadings,
  rehypeTableLabels,
  resolveDocLink,
} from "./markdownMapping";
import { ComingSoonMark, RulesMarkdownContainer } from "./RulesMarkdown.styles";

interface RulesMarkdownProps {
  chapter: RuleChapter;
  onNavigate(slug: string, anchor?: string): void;
  // Slugs que viram navegação no painel; sem a prop, todo link de doc vira.
  chapterSlugs?: readonly string[];
}

const isWhitespace = (n: ElementContent) => n.type === "text" && n.value.trim() === "";
const meaningful = (n: Element) => n.children.filter((c) => c.type !== "comment" && !isWhitespace(c));
const isElement = (n: ElementContent | undefined, tag: string): n is Element =>
  n?.type === "element" && n.tagName === tag;

function blockquoteKind(node: Element | undefined) {
  if (!node) return "plain";
  const paragraphs = meaningful(node);
  const first = paragraphs[0];
  const firstChildren = isElement(first, "p") ? meaningful(first) : [];
  const firstStrong = isElement(firstChildren[0], "strong");
  const afterStrong = firstChildren[1];
  const equalsAfterStrong =
    firstStrong && afterStrong?.type === "text" && afterStrong.value.trim().startsWith("=");
  const onlyEmphasis =
    paragraphs.length > 0 &&
    paragraphs.every((p) => isElement(p, "p") && meaningful(p).every((c) => isElement(c, "em")));
  return classifyBlockquote({ firstStrong, onlyEmphasis, equalsAfterStrong });
}

const MathBlock = lazy(() => import("./MathBlock"));

// Falha ao baixar o chunk da fórmula (deploy trocou os hashes, sem rede) não derruba o painel:
// cai no LaTeX cru, como o LaTeX inválido.
class MathBoundary extends Component<{ source: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <pre><code>{this.props.source}</code></pre>;
    return this.props.children;
  }
}

function RulesComingSoon() {
  return (
    <ComingSoonMark>
      <ComingSoonBadge />
    </ComingSoonMark>
  );
}

function codeOf(pre: Element | undefined): Element | undefined {
  const child = pre?.children.find((c) => isElement(c, "code"));
  return child && child.type === "element" ? child : undefined;
}

// Navegação lida por contexto: os componentes do Markdown ficam no módulo, com identidade
// estável. Se mudassem a cada render (onNavigate inline, chapterSlugs novo), o React
// remontaria a árvore inteira e cada diagrama repetiria a ignição da luz.
interface NavigationValue {
  onNavigate(slug: string, anchor?: string): void;
  chapterSlugs?: readonly string[];
}
const NavigationContext = createContext<NavigationValue>({ onNavigate: () => {} });

function RulesLink({ node: _node, href = "", children, ...rest }: ComponentProps<"a"> & ExtraProps) {
  const { onNavigate, chapterSlugs } = useContext(NavigationContext);
  const doc = resolveDocLink(href);
  if (doc && (!chapterSlugs || chapterSlugs.includes(doc.slug))) {
    const target = doc.anchor ? headingId(doc.slug, doc.anchor) : doc.slug;
    const go = (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      onNavigate(doc.slug, doc.anchor);
    };
    return (
      <a {...rest} href={`#${target}`} onClick={go}>
        {children}
      </a>
    );
  }
  return (
    <a {...rest} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function RulesBlockquote({ node, className, ...rest }: ComponentProps<"blockquote"> & ExtraProps) {
  const kind = blockquoteKind(node);
  const mdClass = kind === "plain" ? undefined : `md-${kind}`;
  return <blockquote {...rest} className={[className, mdClass].filter(Boolean).join(" ") || undefined} />;
}

function RulesPre({ node, children, ...rest }: ComponentProps<"pre"> & ExtraProps) {
  const code = codeOf(node);
  const classes = code?.properties.className;
  const isDiagram = Array.isArray(classes) && classes.includes("language-diagram");
  if (code && isDiagram) {
    // O mdast-util-to-hast guarda a info string depois da linguagem em data.meta.
    const meta = code.data?.meta ?? undefined;
    return <DiagramBlock meta={meta} fallback={hastText(code).replace(/\n$/, "")} />;
  }
  if (code && Array.isArray(classes) && classes.includes("language-math")) {
    const source = hastText(code).replace(/\n$/, "");
    return (
      <MathBoundary source={source}>
        <Suspense fallback={<pre><code>{source}</code></pre>}>
          <MathBlock source={source} />
        </Suspense>
      </MathBoundary>
    );
  }
  return <pre {...rest}>{children}</pre>;
}

function RulesTable({ node, className, ...rest }: ComponentProps<"table"> & ExtraProps) {
  // Com 3+ colunas a tabela empilha em largura estreita; com 2 continua tabela.
  const columns = node ? countColumns(node) : 0;
  return (
    <div className={columns >= 3 ? "md-table is-stack" : "md-table"}>
      <table {...rest} className={className} />
    </div>
  );
}

const COMPONENTS: Components = {
  a: RulesLink,
  blockquote: RulesBlockquote,
  pre: RulesPre,
  table: RulesTable,
  // Tag própria do remarkComingSoon; fora do mapa de tags HTML do tipo Components.
  "coming-soon": RulesComingSoon,
} as Components;

const REMARK_PLUGINS = [remarkGfm, remarkComingSoon];

export default function RulesMarkdown({ chapter, onNavigate, chapterSlugs }: RulesMarkdownProps) {
  const rehypePlugins = useMemo(
    () => [rehypeChapterHeadings(chapter.slug), rehypeTableLabels],
    [chapter.slug],
  );
  const navigation = useMemo(() => ({ onNavigate, chapterSlugs }), [onNavigate, chapterSlugs]);

  return (
    <NavigationContext.Provider value={navigation}>
      <RulesMarkdownContainer>
        <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={rehypePlugins} components={COMPONENTS}>
          {chapter.markdown}
        </ReactMarkdown>
      </RulesMarkdownContainer>
    </NavigationContext.Provider>
  );
}

function countColumns(table: Element): number {
  const find = (n: Element): Element | undefined => {
    for (const c of n.children) {
      if (c.type !== "element") continue;
      if (c.tagName === "tr") return c;
      const found = find(c);
      if (found) return found;
    }
    return undefined;
  };
  const row = find(table);
  return row ? row.children.filter((c) => c.type === "element").length : 0;
}
