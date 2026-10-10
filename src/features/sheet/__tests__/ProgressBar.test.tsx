import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import ProgressBar from "../../../components/ions/ProgressBar";

describe("ProgressBar", () => {
  it("expõe os valores via aria com current=0", () => {
    render(<ProgressBar current={0} max={32} color="red" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "32");
  });

  it("mostra o texto com zero, fora do elemento de preenchimento", () => {
    render(<ProgressBar current={0} max={32} color="red" />);
    // duas camadas (clara e escura recortada) repetem o texto; nenhuma dentro do fill
    expect(screen.getAllByText("0/32")).toHaveLength(2);
    const fill = screen.getByTestId("progress-fill");
    expect(within(fill).queryByText("0/32")).not.toBeInTheDocument();
  });

  it("anuncia o texto uma única vez (a cópia escura é aria-hidden)", () => {
    render(<ProgressBar current={5} max={32} color="red" />);
    const visibleToAT = screen
      .getAllByText("5/32")
      .filter((el) => !el.closest("[aria-hidden]"));
    expect(visibleToAT).toHaveLength(1);
  });
});
