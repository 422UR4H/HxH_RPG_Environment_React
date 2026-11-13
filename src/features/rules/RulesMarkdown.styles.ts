import styled from "styled-components";
import { colors } from "../../styles/tokens";
import { markdownBase } from "../../styles/markdown";

// Estilos do Markdown das regras, por elemento (claude-design/EstilosMarkdown.dc.html e
// shared/regras.css). Os títulos do corpo descem um nível no painel: o h3 aqui tem o
// visual do "h2" do design e o h4 o do "h3".
export const RulesMarkdownContainer = styled.div`
  ${markdownBase}

  container-type: inline-size;
  max-width: 68ch;
  font-size: 17px;
  line-height: 1.6;
  color: ${colors.textMuted};
  overflow-wrap: break-word;

  & > :first-child {
    margin-top: 0;
  }

  h3 {
    margin: 48px 0 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid ${colors.borderMuted};
    font-size: 26px;
    line-height: 32px;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: ${colors.textPrimary};
    scroll-margin-top: 24px;
  }

  h4,
  h5,
  h6 {
    margin: 32px 0 8px;
    font-size: 20px;
    line-height: 28px;
    font-weight: 700;
    color: ${colors.textPrimary};
    scroll-margin-top: 24px;
  }

  p {
    margin: 0 0 16px;
  }

  strong {
    color: ${colors.textPrimary};
    font-weight: 700;
  }

  /* crase = sigla como aparece na ficha */
  code {
    font-family: inherit;
    font-size: 0.82em;
    font-weight: 700;
    color: ${colors.textPrimary};
    background: ${colors.surfaceControl};
    border: 1px solid ${colors.borderMuted};
    border-radius: 4px;
    padding: 1px 6px;
    white-space: nowrap;
  }

  /* bloco ASCII de reserva (marcador de diagrama inválido) */
  pre {
    margin: 20px 0;
    padding: 12px 14px;
    background: ${colors.surfaceDeep};
    border: 1px solid ${colors.borderMuted};
    border-radius: 6px;
    white-space: pre-wrap;
  }

  pre code {
    font-family: monospace;
    font-weight: 400;
    background: transparent;
    border: 0;
    padding: 0;
    white-space: inherit;
  }

  ul,
  ol {
    margin: 0 0 16px;
    padding: 0;
    list-style: none;
  }

  li {
    position: relative;
    margin: 6px 0;
    padding-left: 28px;
  }

  /* losango, o mesmo desenho dos diagramas */
  ul > li::before {
    content: "";
    position: absolute;
    left: 8px;
    top: 0.62em;
    width: 7px;
    height: 7px;
    background: ${colors.textMuted};
    transform: rotate(45deg);
  }

  ol {
    counter-reset: md;
  }

  ol > li {
    counter-increment: md;
    min-height: 32px;
    margin: 12px 0;
    padding-left: 46px;
    padding-top: 2px;
  }

  ol > li::before {
    content: counter(md);
    position: absolute;
    left: 0;
    top: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: ${colors.brandAccent};
    color: ${colors.textPrimary};
    font-weight: 700;
    font-size: 16px;
    line-height: 32px;
    text-align: center;
  }

  a {
    color: ${colors.actionAccent};
  }

  blockquote {
    margin: 20px 0;
  }

  blockquote.md-formula,
  blockquote.md-note {
    padding: 14px 20px 16px;
    border-radius: 6px;
    color: ${colors.textPrimary};
  }

  /* fórmula */
  blockquote.md-formula {
    background: ${colors.surfaceDeep};
    border: 1px solid ${colors.borderStrong};
  }

  blockquote.md-formula::before {
    content: "Fórmula";
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    line-height: 16px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${colors.textLabelMuted};
  }

  blockquote.md-formula p {
    margin: 0;
    font-size: 19px;
    line-height: 28px;
    font-weight: 500;
  }

  blockquote.md-formula p + p {
    margin-top: 6px;
  }

  /* nota / curiosidade: o negrito do começo vira o rótulo */
  blockquote.md-note {
    background: ${colors.surfaceInput};
    border: 2px solid ${colors.borderInput};
  }

  blockquote.md-note p {
    margin: 0;
    font-size: 16px;
    line-height: 1.55;
  }

  blockquote.md-note p + p {
    margin-top: 8px;
  }

  blockquote.md-note > p:first-child > strong:first-child {
    display: block;
    margin: 0 0 4px;
    font-size: 13px;
    line-height: 16px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${colors.actionAccent};
  }

  /* tabela: nunca rola na horizontal */
  .md-table {
    margin: 20px 0;
    overflow: hidden;
    border: 1px solid ${colors.borderMuted};
    border-radius: 6px;
    container-type: inline-size;
  }

  table {
    width: 100%;
    margin: 0;
    border-collapse: collapse;
    font-size: 16px;
    line-height: 22px;
  }

  th,
  td {
    border: 0;
    padding: 10px 14px;
  }

  th {
    background: ${colors.surfaceControl};
    color: ${colors.textPrimary};
    text-align: left;
    font-size: 13px;
    line-height: 18px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  td {
    border-top: 1px solid ${colors.borderMuted};
    color: ${colors.textMuted};
    vertical-align: top;
    /* break-word não reduz a largura mínima da célula: a palavra só quebra se não couber na tabela inteira */
    overflow-wrap: break-word;
  }

  tbody tr:nth-child(even) td {
    background: ${colors.overlayHighlightFaint};
  }

  /* 3+ colunas em largura estreita: cada linha vira um bloco "rótulo: valor" */
  @container (max-width: 480px) {
    .md-table.is-stack thead {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }

    .md-table.is-stack table,
    .md-table.is-stack tbody,
    .md-table.is-stack tr,
    .md-table.is-stack td {
      display: block;
      width: 100%;
    }

    .md-table.is-stack tr {
      padding: 10px 14px;
      border-top: 1px solid ${colors.borderMuted};
    }

    .md-table.is-stack tr:first-child {
      border-top: 0;
    }

    .md-table.is-stack tbody tr:nth-child(even) {
      background: ${colors.overlayHighlightFaint};
    }

    .md-table.is-stack td {
      padding: 2px 0;
      border: 0;
      background: transparent;
    }

    .md-table.is-stack td:first-child {
      margin-bottom: 4px;
      font-weight: 700;
      color: ${colors.textPrimary};
    }

    .md-table.is-stack td:not(:first-child)::before {
      content: attr(data-label) ": ";
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: ${colors.textLabelMuted};
    }
  }

  /* celular / painel estreito (o container é este próprio bloco) */
  @container (max-width: 480px) {
    & > * {
      font-size: 16px;
    }

    h3 {
      margin-top: 40px;
      font-size: 22px;
      line-height: 28px;
    }

    h4,
    h5,
    h6 {
      margin-top: 28px;
      font-size: 18px;
      line-height: 24px;
    }

    blockquote.md-formula,
    blockquote.md-note {
      padding: 12px 14px 14px;
    }

    blockquote.md-formula p {
      font-size: 17px;
      line-height: 25px;
    }

    th,
    td {
      padding: 9px 12px;
      font-size: 15px;
    }
  }
`;
