import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import styled from "styled-components";
import {
  HEADER_STACK_BELOW,
  HeaderBox,
  headerRow,
  headerTitle,
} from "../pageHeader";

const Row = styled.div`
  ${headerRow}
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
  it("makes the header box a container and stacks by container width, not window width", () => {
    render(
      <HeaderBox>
        <Row>
          <Title>REENCONTRAMOS</Title>
        </Row>
      </HeaderBox>,
    );
    const css = injectedCss();
    expect(css).toContain("container-type:inline-size");
    expect(css).toContain(`@container (max-width: ${HEADER_STACK_BELOW - 1}px)`);
    expect(css).not.toContain("@media (max-width:750px)");
  });

  it("keeps words whole and falls back to hyphenation with a clamped size", () => {
    render(<Title>O GRANDE INÍCIO</Title>);
    const css = injectedCss();
    expect(css).toContain("overflow-wrap:normal");
    expect(css).toContain("hyphens:auto");
    expect(css).toContain("clamp(24px, 5.8cqi, 42px)");
  });
});
