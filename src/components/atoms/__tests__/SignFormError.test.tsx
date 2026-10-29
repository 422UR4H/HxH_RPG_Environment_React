import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SignFormError from "../SignFormError";

describe("SignFormError", () => {
  it("renders the message as an alert in the dark tone", () => {
    render(<SignFormError message="Erro ao criar campanha." tone="dark" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Erro ao criar campanha.");
  });
});
