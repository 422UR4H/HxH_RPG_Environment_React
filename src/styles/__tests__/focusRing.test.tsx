import { renderToString } from "react-dom/server";
import { ServerStyleSheet } from "styled-components";
import { describe, expect, it } from "vitest";
import ResetStyle from "../ResetStyle";
import { colors } from "../tokens";

// No jsdom o styled-components não injeta estilos globais no <head>; o
// ServerStyleSheet devolve o CSS gerado. Sem espaços: o comparativo não depende de formatação.
const lerCss = () => {
  const sheet = new ServerStyleSheet();
  renderToString(sheet.collectStyles(<ResetStyle />));
  return sheet.getStyleTags().replace(/\s+/g, "");
};

describe("anel de foco global", () => {
  it("define --focus-ring no :root", () => {
    expect(lerCss()).toContain(`:root{--focus-ring:${colors.actionHighlight};}`);
  });

  it("anel global com especificidade zero", () => {
    const css = lerCss();
    expect(css).toContain(":where(");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("outline:2pxsolidvar(--focus-ring)");
    expect(css).toContain("outline-offset:3px");
  });

  it("campos de texto ficam fora do anel", () => {
    const css = lerCss();
    const seletor = css.slice(css.indexOf(":where("), css.indexOf("{outline:2px"));
    expect(seletor).toContain(":not(input,textarea,select)");
    expect(seletor).toContain('input[type="checkbox"]');
    expect(seletor).toContain('input[type="radio"]');
    expect(seletor).toContain('input[type="range"]');
  });
});
