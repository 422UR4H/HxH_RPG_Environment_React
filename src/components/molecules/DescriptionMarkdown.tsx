import styled from "styled-components";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { colors } from "../../styles/tokens";
import { markdownBase } from "../../styles/markdown";

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
  color: ${colors.textPrimary};
  line-height: 1.6;
  tab-size: 4;
  white-space: normal;


  ${markdownBase}
`;

const EmptyText = styled.p`
  font-size: 0.95rem;
  color: ${colors.textPlaceholder};
  font-style: italic;
  margin: 0;
`;
