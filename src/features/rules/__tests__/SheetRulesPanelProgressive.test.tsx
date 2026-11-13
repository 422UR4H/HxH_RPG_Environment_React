import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/render";
import SheetRulesPanel from "../SheetRulesPanel";

// O ritmo da montagem fica na mão do teste: cada capítulo só entra quando `mountNext` roda.
const pending: Array<() => void> = [];
vi.mock("../progressiveChapters", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../progressiveChapters")>();
  return {
    ...actual,
    scheduleNextChapter: (mount: () => void) => {
      pending.push(mount);
      return () => {
        const i = pending.indexOf(mount);
        if (i >= 0) pending.splice(i, 1);
      };
    },
  };
});

function mountNext() {
  const mount = pending.shift();
  if (!mount) throw new Error("nenhum capítulo agendado");
  act(() => mount());
}

const lastOf = <T,>(items: T[]): T | undefined => items[items.length - 1];
const sectionIds = () => Array.from(document.querySelectorAll("section[id]")).map((s) => s.id);

const scrollIntoView = vi.fn();
const originalRect = Element.prototype.getBoundingClientRect;

beforeEach(() => {
  pending.length = 0;
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  Element.prototype.getBoundingClientRect = originalRect;
});

async function renderPanel(startSlug: string) {
  renderWithProviders(<SheetRulesPanel startSlug={startSlug} onClose={vi.fn()} onChapterChange={vi.fn()} />, {
    token: null,
  });
  await screen.findByRole("navigation", { name: "Sumário das regras" });
  await waitFor(() => expect(pending).toHaveLength(1));
}

describe("SheetRulesPanel progressive chapters", () => {
  it("mounts the requested chapter first, lands on it, then mounts the rest nearest first", async () => {
    await renderPanel("sistema-nen");
    expect(sectionIds()).toEqual([]);

    mountNext();
    expect(sectionIds()).toEqual(["sistema-nen"]);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect((scrollIntoView.mock.contexts[0] as HTMLElement).id).toBe("sistema-nen");

    mountNext();
    expect(sectionIds()).toEqual(["atributos", "sistema-nen"]);
    mountNext();
    expect(sectionIds()).toEqual(["criacao", "atributos", "sistema-nen"]);
    expect(pending).toHaveLength(0);
    // Abrir no capítulo é uma rolagem só; os que entram depois não roubam a posição.
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("keeps the reading position when chapters mount above the open one", async () => {
    // Layout falso: cada capítulo tem 500 px; o topo depende de quantos vêm antes e da rolagem.
    Element.prototype.getBoundingClientRect = function (this: Element) {
      if (this.tagName !== "SECTION") return originalRect.call(this);
      let top = 0;
      for (let n = this.previousElementSibling; n; n = n.previousElementSibling) {
        if (n.tagName === "SECTION") top += 500;
      }
      return { top: top - (this.parentElement?.scrollTop ?? 0) } as DOMRect;
    };
    await renderPanel("sistema-nen");
    mountNext();
    const reading = document.getElementById("sistema-nen")!.parentElement!;
    let scrollTop = 0;
    Object.defineProperty(reading, "scrollTop", { get: () => scrollTop, set: (v: number) => (scrollTop = v) });

    mountNext();
    expect(reading.scrollTop).toBe(500);
    mountNext();
    expect(reading.scrollTop).toBe(1000);
    expect(document.getElementById("sistema-nen")!.getBoundingClientRect().top).toBe(0);
  });

  it("a chip to a chapter not mounted yet mounts everything and scrolls to it", async () => {
    const user = userEvent.setup();
    await renderPanel("criacao");
    mountNext();
    expect(sectionIds()).toEqual(["criacao"]);

    const nav = screen.getByRole("navigation", { name: "Sumário das regras" });
    await user.click(within(nav).getByRole("link", { name: /Nen/ }));

    expect(sectionIds()).toEqual(["criacao", "atributos", "sistema-nen"]);
    const last = lastOf(scrollIntoView.mock.contexts) as HTMLElement;
    expect(last.id).toBe("sistema-nen");
    expect(lastOf(scrollIntoView.mock.calls)?.[0]).toEqual({ block: "start", behavior: "smooth" });
  });

  it("a cross-chapter link in the text reaches a chapter not mounted yet", async () => {
    const user = userEvent.setup();
    await renderPanel("criacao");
    mountNext();

    const criacao = document.getElementById("criacao")!;
    await user.click(within(criacao).getByRole("link", { name: "Atributos" }));

    expect(document.getElementById("atributos")).toBeInTheDocument();
    expect((lastOf(scrollIntoView.mock.contexts) as HTMLElement).id).toBe("atributos");
  });
});
