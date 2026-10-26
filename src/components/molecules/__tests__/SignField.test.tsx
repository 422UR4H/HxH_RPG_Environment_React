import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SignField from "../SignField";

function renderField(error?: string | null) {
  render(
    <SignField
      name="email"
      label="E-mail"
      type="email"
      value=""
      onChange={() => {}}
      autoComplete="email"
      maxLength={64}
      error={error}
    />,
  );
  return screen.getByLabelText("E-mail");
}

describe("SignField", () => {
  it("links the label to the input", () => {
    const input = renderField();
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("id", "sign-email");
  });

  it("passes autoComplete and maxLength through", () => {
    const input = renderField();
    expect(input).toHaveAttribute("autocomplete", "email");
    expect(input).toHaveAttribute("maxlength", "64");
  });

  it("marks the input invalid and describes it with the error", () => {
    const input = renderField("E-mail inválido.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const id = input.getAttribute("aria-describedby");
    expect(id).toBe("sign-email-error");
    expect(document.getElementById(id!)).toHaveTextContent("E-mail inválido.");
  });

  it("has no error description without an error", () => {
    const input = renderField(null);
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });
});
