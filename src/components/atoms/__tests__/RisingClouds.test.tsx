import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RisingClouds from "../RisingClouds";

describe("RisingClouds", () => {
  it("renders a decorative layer hidden from assistive tech", () => {
    const { container } = render(<RisingClouds />);
    const layer = container.firstElementChild as HTMLElement;
    expect(layer.getAttribute("aria-hidden")).toBe("true");
    const images = layer.querySelectorAll("img");
    expect(images.length).toBeGreaterThan(0);
    images.forEach((img) => expect(img.getAttribute("alt")).toBe(""));
  });

  it("renders seven clouds", () => {
    const { getAllByTestId } = render(<RisingClouds />);
    expect(getAllByTestId("rising-cloud")).toHaveLength(7);
  });

  it("does not intercept clicks or touches", () => {
    const { container } = render(<RisingClouds />);
    const layer = container.firstElementChild as HTMLElement;
    expect(getComputedStyle(layer).pointerEvents).toBe("none");
    expect(getComputedStyle(layer).position).toBe("fixed");
  });
});
