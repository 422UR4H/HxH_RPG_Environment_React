import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/server";
import { renderWithProviders } from "../../../test/render";
import { sheetRulesFixture } from "../../../test/fixtures/rules";
import SheetRulesPanel from "../SheetRulesPanel";

const RULES_URL = "http://localhost:5000/rules/character-sheet";

// O setup responde `matches: false` a tudo; aqui a resposta segue a largura simulada, e
// `resize` avisa os ouvintes como o navegador faria ao girar o tablet.
const originalMatchMedia = window.matchMedia;
type MediaListener = (e: MediaQueryListEvent) => void;
let width = 0;
let mediaListeners: { query: string; listener: MediaListener }[] = [];
function matchesAt(query: string, px: number) {
  const min = /min-width:\s*(\d+)px/.exec(query);
  const max = /max-width:\s*(\d+)px/.exec(query);
  if (min) return px >= Number(min[1]);
  if (max) return px <= Number(max[1]);
  return false;
}
function setWidth(px: number) {
  width = px;
  window.matchMedia = ((query: string) => ({
    matches: matchesAt(query, width),
    media: query,
    addEventListener: (_: string, listener: MediaListener) => mediaListeners.push({ query, listener }),
    removeEventListener: (_: string, listener: MediaListener) => {
      mediaListeners = mediaListeners.filter((l) => l.listener !== listener);
    },
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
function resize(px: number) {
  width = px;
  act(() => {
    for (const { query, listener } of [...mediaListeners]) {
      listener({ matches: matchesAt(query, px), media: query } as MediaQueryListEvent);
    }
  });
}

const scrollIntoView = vi.fn();

beforeEach(() => {
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  mediaListeners = [];
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
  it.each([
    [10, [4, 3, 3]],
    [7, [4, 3]],
  ])("docked, %i chapters get forced row breaks as %j", async (n, sizes) => {
    setWidth(1440);
    const base = sheetRulesFixture[0];
    const many = Array.from({ length: n }, (_, i) => ({ ...base, slug: `cap-${i}`, label: `Cap ${i}`, title: `Cap ${i}` }));
    server.use(http.get(RULES_URL, () => HttpResponse.json({ chapters: many })));
    renderPanel({ startSlug: "cap-0" });

    const nav = await screen.findByRole("navigation", { name: "Sumário das regras" });
    expect(within(nav).getAllByRole("link")).toHaveLength(n);
    const rows: number[] = [0];
    for (const li of Array.from(nav.querySelectorAll("ol > li"))) {
      if (li.getAttribute("aria-hidden") === "true") rows.push(0);
      else rows[rows.length - 1] += 1;
    }
    expect(rows).toEqual(sizes);
  });

  it("docked, a multiple of 3 keeps the plain grid with no breaks", async () => {
    setWidth(1440);
    renderPanel();
    const nav = await screen.findByRole("navigation", { name: "Sumário das regras" });
    expect(nav.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0);
  });

  it("renders chips and chapters in order with the coming-soon badge on Nen", async () => {
    setWidth(1440);
    renderPanel();

    const nav = await screen.findByRole("navigation", { name: "Sumário das regras" });
    const chips = within(nav).getAllByRole("link");
    expect(chips.map((c) => c.textContent)).toEqual(["Criação", "Atributos", "NenEm breve"]);

    // Os capítulos montam um por tarefa (o pedido primeiro); no fim ficam na ordem do doc.
    await waitFor(() => expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(sheetRulesFixture.length + 1));
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

  it("keeps the same panel and reading area when crossing 1024px while open", async () => {
    setWidth(768);
    renderPanel();
    const dialog = screen.getByRole("dialog", { name: "Regras" });
    await screen.findByRole("navigation", { name: "Sumário das regras" });
    await waitFor(() => expect(document.getElementById("criacao")).toBeInTheDocument());
    const reading = document.getElementById("criacao")!.parentElement!;
    expect(document.body.style.overflow).toBe("hidden");

    resize(1024);
    const aside = screen.getByRole("complementary", { name: "Regras · criação de personagem" });
    expect(aside).toBe(dialog);
    expect(aside).not.toHaveAttribute("aria-modal");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.getElementById("criacao")!.parentElement).toBe(reading);
    expect(document.body.style.overflow).toBe("");

    resize(768);
    expect(screen.getByRole("dialog", { name: "Regras" })).toBe(dialog);
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(document.getElementById("criacao")!.parentElement).toBe(reading);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("docked, leaves Escape to another open modal", async () => {
    setWidth(1440);
    const user = userEvent.setup();
    const { onClose } = renderPanel();
    const other = document.createElement("div");
    other.setAttribute("role", "dialog");
    other.setAttribute("aria-modal", "true");
    document.body.appendChild(other);
    try {
      await user.keyboard("{Escape}");
      expect(onClose).not.toHaveBeenCalled();

      // Diálogo sem `aria-modal`: vale o Esc que nasce dentro dele.
      other.removeAttribute("aria-modal");
      const button = document.createElement("button");
      other.appendChild(button);
      button.focus();
      await user.keyboard("{Escape}");
      expect(onClose).not.toHaveBeenCalled();

      other.remove();
      await user.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      other.remove();
    }
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
