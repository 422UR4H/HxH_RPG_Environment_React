import { renderToString } from "react-dom/server";
import { ServerStyleSheet } from "styled-components";
import { describe, expect, it } from "vitest";
import DescriptionMarkdown from "../../components/molecules/DescriptionMarkdown";

describe("markdownBase", () => {
  it("restores typography the reset removes", () => {
    const sheet = new ServerStyleSheet();
    const html = renderToString(
      sheet.collectStyles(
        <DescriptionMarkdown source={"# T\n\n**b** *i*\n\n- x"} />,
      ),
    );
    const css = sheet.getStyleTags().replace(/\s+/g, "");

    // O styled-components prefixa cada seletor com a classe do container.
    expect(css).toMatch(/strong,\.\w+b\{font-weight:bold/);
    expect(css).toMatch(/em,\.\w+i\{font-style:italic/);
    expect(css).toMatch(/ul\{list-style:disc/);
    expect(css).toMatch(/h1\{font-size/);
    expect(html).toContain("<h1>");
    expect(html).toContain("<strong>");
    expect(html).toContain("<em>");
  });
});
