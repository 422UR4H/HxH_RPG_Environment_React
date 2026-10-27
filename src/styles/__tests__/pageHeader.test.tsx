import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import styled from "styled-components";
import {
  HEADER_NARROW_BELOW,
  HeaderBox,
  headerAside,
  headerRow,
  headerTitle,
} from "../pageHeader";

const Row = styled.div`
  ${headerRow}
`;
const Aside = styled.div`
  ${headerAside}
`;
const Title = styled.h1`
  ${headerTitle}
`;

function injectedCss(): string {
  return Array.from(document.querySelectorAll("style"))
    .map((s) => s.textContent ?? "")
    .join("\n");
}

describe("pageHeader", () => {
  it("makes the header box a container and wraps only when the title does not fit", () => {
    render(
      <HeaderBox>
        <Row>
          <Title>REENCONTRAMOS</Title>
          <Aside>01/01/2000</Aside>
        </Row>
      </HeaderBox>,
    );
    const css = injectedCss();
    expect(css).toContain("container-type:inline-size");
    expect(css).toContain("flex-wrap:wrap");
    expect(css).toContain("min-width:min-content");
    expect(css).toContain("flex:1 1 0");
    expect(css).toContain("flex:0 0 auto");
    expect(css).not.toContain("flex-direction:column");
    expect(HEADER_NARROW_BELOW).toBe(400);
  });

  it("keeps words whole, without automatic hyphenation, with a clamped size", () => {
    render(<Title>O GRANDE INÍCIO</Title>);
    const css = injectedCss();
    expect(css).toContain("overflow-wrap:normal");
    expect(css).toContain("hyphens:manual");
    expect(css).toContain("clamp(24px, 5.8cqi, 42px)");
  });
});
