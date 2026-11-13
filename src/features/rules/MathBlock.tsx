import temml from "temml";
import styled from "styled-components";
import { colors } from "../../styles/tokens";

// Fórmula LaTeX → MathML nativo (sem fontes nem CSS extra). Este módulo é carregado sob
// demanda (React.lazy em RulesPre): o temml só entra no bundle de quem abre uma fórmula.
const Block = styled.div`
  margin: 14px 0;
  max-width: 100%;
  overflow-x: auto;
  text-align: center;
  font-size: 1.3em;
  color: ${colors.textPrimary};
`;

function renderMath(source: string): string | null {
  try {
    return temml.renderToString(source, { displayMode: true, throwOnError: true });
  } catch {
    return null;
  }
}

export default function MathBlock({ source }: { source: string }) {
  const html = renderMath(source);
  // LaTeX inválido: mostra o texto cru no estilo de código; nunca derruba o painel.
  if (html === null) return <pre><code>{source}</code></pre>;
  return <Block dangerouslySetInnerHTML={{ __html: html }} />;
}
