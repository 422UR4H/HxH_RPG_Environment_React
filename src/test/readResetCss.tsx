import { renderToString } from "react-dom/server";
import { ServerStyleSheet } from "styled-components";
import ResetStyle from "../styles/ResetStyle";

// No jsdom o styled-components não injeta estilos globais no <head>; o
// ServerStyleSheet devolve o CSS gerado. Sem espaços: o comparativo não depende de formatação.
export const readResetCss = () => {
  const sheet = new ServerStyleSheet();
  renderToString(sheet.collectStyles(<ResetStyle />));
  return sheet.getStyleTags().replace(/\s+/g, "");
};
