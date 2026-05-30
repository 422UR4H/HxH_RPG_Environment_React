import styled from "styled-components";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { colors } from "../../styles/tokens";

/**
 * Renderer canônico para Profile.description.
 * Configurado com react-markdown + remark-gfm + sanitização default.
 * Toda nova superfície que exiba description (preview em lista, tooltip,
 * export, etc.) deve usar este componente — não improvise renders alternativos.
 */
interface DescriptionMarkdownProps {
  source: string;
  emptyText?: string;
}

export default function DescriptionMarkdown({
  source,
  emptyText = "Sem background registrado.",
}: DescriptionMarkdownProps) {
  if (!source) {
    return <EmptyText>{emptyText}</EmptyText>;
  }
  return (
    <MarkdownContainer>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </MarkdownContainer>
  );
}

const MarkdownContainer = styled.div`
  font-family: inherit;
  color: ${colors.textPrimary};
  line-height: 1.6;
  tab-size: 4;
  white-space: normal;

  p, ul, ol, blockquote, table { margin: 0 0 1em 0; }
  h1, h2, h3, h4 { margin: 1em 0 0.5em; line-height: 1.25; }
  ul, ol { padding-left: 1.5em; }
  blockquote {
    border-left: 3px solid ${colors.grayMidStrong};
    padding-left: 12px;
    color: ${colors.textMuted};
  }
  table { border-collapse: collapse; }
  th, td {
    border: 1px solid ${colors.grayMidStrong};
    padding: 6px 10px;
  }
  code {
    background: rgba(0, 0, 0, 0.25);
    padding: 1px 5px;
    border-radius: 3px;
    font-family: "Courier New", monospace;
  }
  a { color: ${colors.brandAccentBright}; }
`;

const EmptyText = styled.p`
  font-family: "Roboto", sans-serif;
  font-size: 0.95rem;
  color: ${colors.textPlaceholder};
  font-style: italic;
  margin: 0;
`;
