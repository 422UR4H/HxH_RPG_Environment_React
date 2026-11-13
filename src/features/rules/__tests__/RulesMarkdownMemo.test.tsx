import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { sheetRulesFixture } from "../../../test/fixtures/rules";

// Conta quantas vezes o Markdown passa pelo parser: o react-markdown real, embrulhado.
const parses = vi.hoisted(() => ({ count: 0 }));
vi.mock("react-markdown", async () => {
  const actual = await vi.importActual<typeof import("react-markdown")>("react-markdown");
  const Real = actual.default;
  return {
    ...actual,
    default: (props: Parameters<typeof Real>[0]) => {
      parses.count++;
      return <Real {...props} />;
    },
  };
});

const { default: RulesMarkdown } = await import("../RulesMarkdown");

const slugs = sheetRulesFixture.map((c) => c.slug);
const onNavigate = () => {};

// Faz o papel do painel: re-renderiza (o chip ativo mudou) com as mesmas props estáveis.
function Panel() {
  const [active, setActive] = useState(0);
  return (
    <>
      <button onClick={() => setActive((a) => a + 1)}>next chapter {active}</button>
      {sheetRulesFixture.map((c) => (
        <RulesMarkdown key={c.slug} chapter={c} onNavigate={onNavigate} chapterSlugs={slugs} />
      ))}
    </>
  );
}

describe("RulesMarkdown memo", () => {
  it("does not re-parse the chapters when the panel re-renders with the same props", () => {
    render(<Panel />);
    const afterMount = parses.count;
    expect(afterMount).toBe(sheetRulesFixture.length);

    fireEvent.click(screen.getByRole("button", { name: /next chapter/ }));
    fireEvent.click(screen.getByRole("button", { name: /next chapter/ }));
    expect(parses.count).toBe(afterMount);
  });
});
