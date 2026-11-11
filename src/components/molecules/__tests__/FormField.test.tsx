import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FormField from "../FormField";

describe("FormField", () => {
  it("keeps the child's own aria-describedby and appends the error and notice ids", () => {
    render(
      <FormField label="Nome" htmlFor="name" error="Erro aqui" notice="Nota aqui">
        <input id="name" aria-describedby="own-hint" />
      </FormField>,
    );
    const input = screen.getByLabelText("Nome");
    expect(input).toHaveAttribute("aria-describedby", "own-hint name-error name-notice");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Erro aqui");
    expect(screen.getByRole("status")).toHaveTextContent("Nota aqui");
  });

  it("leaves the child untouched without error or notice", () => {
    render(
      <FormField label="Nome" htmlFor="name">
        <input id="name" />
      </FormField>,
    );
    expect(screen.getByLabelText("Nome")).not.toHaveAttribute("aria-invalid");
  });

  it("renders the error and the notice before the help text", () => {
    render(
      <FormField label="Nome" htmlFor="name" error="Erro aqui" notice="Nota aqui" helpText="Ajuda aqui">
        <input id="name" />
      </FormField>,
    );
    const error = screen.getByText("Erro aqui");
    const notice = screen.getByText("Nota aqui");
    const help = screen.getByText("Ajuda aqui");
    expect(error.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(notice.compareDocumentPosition(help) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps at most 3 direct children (label, control, feedback) so FormRow's 3-row subgrid holds", () => {
    const { container } = render(
      <FormField label="Nome" htmlFor="name" error="Erro aqui" notice="Nota aqui" helpText="Ajuda aqui">
        <input id="name" />
      </FormField>,
    );
    expect(container.firstElementChild?.children.length).toBeLessThanOrEqual(3);
  });
});
