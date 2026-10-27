import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import styled from "styled-components";
import {
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
  it("stacks by default and goes side by side only from a 900px column", () => {
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
    expect(css).toContain("flex-direction:column");
    expect(css).toContain("@container (min-width: 900px)");
    expect(css).toContain("flex-direction:row");
    expect(css).toContain("align-items:flex-end");
    expect(css).not.toContain("flex-wrap");
  });

  it("keeps the title fluid and breaks only a word larger than the column", () => {
    render(<Title>O GRANDE INÍCIO</Title>);
    const css = injectedCss();
    expect(css).toContain("clamp(20px, 6cqi, 42px)");
    expect(css).toContain("overflow-wrap:break-word");
    expect(css).toContain("min-width:0");
  });
});
