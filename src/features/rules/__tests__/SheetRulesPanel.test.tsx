import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/server";
import { renderWithProviders } from "../../../test/render";
import { sheetRulesFixture } from "../../../test/fixtures/rules";
import SheetRulesPanel from "../SheetRulesPanel";

const RULES_URL = "http://localhost:5000/rules/character-sheet";

// O setup responde `matches: false` a tudo; aqui a resposta segue a largura simulada.
const originalMatchMedia = window.matchMedia;
function setWidth(px: number) {
  window.matchMedia = ((query: string) => {
    const min = /min-width:\s*(\d+)px/.exec(query);
    const max = /max-width:\s*(\d+)px/.exec(query);
    let matches = false;
    if (min) matches = px >= Number(min[1]);
    else if (max) matches = px <= Number(max[1]);
    return {
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    };
  }) as typeof window.matchMedia;
}

const scrollIntoView = vi.fn();

beforeEach(() => {
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  document.body.style.overflow = "";
});

function renderPanel(props: Partial<Parameters<typeof SheetRulesPanel>[0]> = {}) {
  const onClose = vi.fn();
  const onChapterChange = vi.fn();
  renderWithProviders(
    <SheetRulesPanel startSlug="atributos" onClose={onClose} onChapterChange={onChapterChange} {...props} />,
    { token: null },
  );
  return { onClose, onChapterChange };
}

describe("SheetRulesPanel", () => {
  it("renders chips and chapters in order with the coming-soon badge on Nen", async () => {
    setWidth(1440);
    renderPanel();

    const nav = await screen.findByRole("navigation", { name: "Sumário das regras" });
    const chips = within(nav).getAllByRole("link");
    expect(chips.map((c) => c.textContent)).toEqual(["Criação", "Atributos", "NenEm breve"]);

    const titles = screen.getAllByRole("heading", { level: 2 }).slice(1);
    expect(titles.map((h) => h.closest("section")?.id)).toEqual(sheetRulesFixture.map((c) => c.slug));
    expect(within(titles[2]).getByText("Em breve")).toBeInTheDocument();
    expect(within(titles[0]).queryByText("Em breve")).not.toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Atributos" })).toHaveAttribute("aria-current", "location");
  });

  it("scrolls to the start chapter", async () => {
    setWidth(1440);
    renderPanel({ startSlug: "atributos" });

    await screen.findByRole("navigation", { name: "Sumário das regras" });
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    const target = scrollIntoView.mock.contexts[0] as HTMLElement;
    expect(target.tagName).toBe("SECTION");
    expect(target.id).toBe("atributos");
  });

  it("is a modal dialog below 1024px and a complementary panel above", async () => {
    setWidth(390);
    const { unmount } = renderWithProviders(
      <SheetRulesPanel startSlug="atributos" onClose={vi.fn()} onChapterChange={vi.fn()} />,
      { token: null },
    );
    const dialog = screen.getByRole("dialog", { name: "Regras" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");

    setWidth(1440);
    renderPanel();
    expect(screen.getByRole("complementary", { name: "Regras · criação de personagem" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on Escape and on the X", async () => {
    setWidth(1440);
    const user = userEvent.setup();
    const { onClose } = renderPanel();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Fechar regras" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("shows the error box and retries", async () => {
    setWidth(1440);
    let calls = 0;
    server.use(
      http.get(RULES_URL, () => {
        calls += 1;
        // O hook tenta duas vezes (retry: 1) antes de dar erro; só o refetch acerta.
        if (calls <= 2) return new HttpResponse(null, { status: 500 });
        return HttpResponse.json({ chapters: sheetRulesFixture });
      }),
    );
    const user = userEvent.setup();
    renderPanel();

    expect(await screen.findByText("Não foi possível carregar as regras.", {}, { timeout: 4000 })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByRole("navigation", { name: "Sumário das regras" })).toBeInTheDocument();
    expect(screen.queryByText("Não foi possível carregar as regras.")).not.toBeInTheDocument();
  });
});
