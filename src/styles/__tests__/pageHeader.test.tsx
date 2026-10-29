import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import styled from "styled-components";
import {
  HeaderBox,
  headerBadge,
  headerDate,
  headerRow,
  headerTitle,
} from "../pageHeader";

const Row = styled.div`
  ${headerRow}
`;
const Badge = styled.span`
  ${headerBadge}
`;
const DateLabel = styled.div`
  ${headerDate}
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
  it("lays out title, badge and date on a grid with container-query fallbacks", () => {
    render(
      <HeaderBox>
        <Row>
          <Badge>AGENDADA</Badge>
          <Title>REENCONTRAMOS</Title>
          <DateLabel>01/01/2000</DateLabel>
        </Row>
      </HeaderBox>,
    );
    const css = injectedCss();
    expect(css).toContain("container-type:inline-size");
    expect(css).toContain("grid-template-columns:minmax(min-content, 1fr) fit-content(33.333%)");
    expect(css).toContain("@container (max-width: 559px)");
    expect(css).toContain("display:flow-root");
    expect(css).toContain("float:right");
    expect(css).toContain("@container (max-width: 339px)");
    expect(css).not.toContain("flex-wrap");
  });

  it("keeps the title fluid with a 26px floor and no mid-word break beside the badge", () => {
    render(<Title>O GRANDE INÍCIO</Title>);
    const css = injectedCss();
    expect(css).toContain("clamp(26px, 5.5cqi, 42px)");
    expect(css).toContain("overflow-wrap:normal");
    expect(css).toContain("min-width:0");
  });

  it("left-aligns the date once it drops under the title", () => {
    render(<DateLabel>01/01/2000</DateLabel>);
    const css = injectedCss();
    const block = css
      .split("@container (max-width: 559px)")
      .slice(1)
      .find((part) => part.includes("clear:both")) ?? "";
    expect(block).toContain("text-align:left");
    expect(block).toContain("justify-self:start");
  });
});
