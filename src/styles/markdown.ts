import { css } from "styled-components";
import { colors } from "./tokens";

// Base de Markdown para usar DENTRO de um container. O reset global
// (ResetStyle: font/margin/padding/list-style zerados) achata títulos, negrito
// e listas; aqui eles voltam, só no escopo do container (o reset não é tocado).
export const markdownBase = css`
  p, ul, ol, blockquote, table { margin: 0 0 1em 0; }
  h1, h2, h3, h4 { margin: 1em 0 0.5em; line-height: 1.25; font-weight: bold; }
  h1 { font-size: 1.6em; }
  h2 { font-size: 1.4em; }
  h3 { font-size: 1.2em; }
  h4 { font-size: 1.05em; }
  strong, b { font-weight: bold; }
  em, i { font-style: italic; }
  ul { list-style: disc; }
  ol { list-style: decimal; }
  ul, ol { padding-left: 1.5em; }
  li { margin: 0 0 0.25em 0; }
  blockquote {
    border-left: 3px solid ${colors.borderStrong};
    padding-left: 12px;
    color: ${colors.textMuted};
  }
  table { border-collapse: collapse; }
  th, td {
    border: 1px solid ${colors.borderStrong};
    padding: 6px 10px;
  }
  th { font-weight: bold; text-align: left; }
  code {
    background: ${colors.shadowSoft};
    padding: 1px 5px;
    border-radius: 3px;
    font-family: "Courier New", monospace;
  }
  a { color: ${colors.brandAccent}; }
`;
