import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import CharacterBarsStrip from "../CharacterBarsStrip";
import { barsRows } from "../barsMath";
import type { BarsPayload } from "../combatMessages";
import { colors } from "../../../../styles/tokens";

// D7 (2026-11-06-stacked-moves): estes testes substituem os da faixa antiga em
// combatOrganisms.test.tsx, que fixavam o medidor centrado no zero e o "x̄" — a barra agora mostra
// o total da PRÓXIMA ação, alinhada numa grade, nas cores das barras.

const nameOf = (id: string) => ({ c1: "Gon", c2: "Killua" }[id] ?? id);
/** U+2212 MINUS SIGN — o mesmo caractere que `fmt` usa, não um hífen. */
const MINUS = "−";

type Row = BarsPayload["characters"][number];
const empty: Omit<Row, "characterId"> = {
  actionCarry: 0, moveCarry: 0, actionBalance: 0, moveBalance: 0, actionSpeeds: [], moveSpeeds: [],
  pendingActionSpeeds: [], pendingMoveSpeeds: [], deferredActionSpeeds: [], deferredMoveSpeeds: [],
};
const row = (characterId: string, over: Partial<Row> = {}): Row => ({ characterId, ...empty, ...over });
const payload = (characters: Row[], prices: BarsPayload["prices"] = { action: 9, move: 12 }): BarsPayload => ({
  seq: 1, prices, provisionalPrices: {}, characters, order: [],
});

function Strip({ bars, mode = "Race" }: { bars: BarsPayload; mode?: "Race" | "Free" }) {
  return <CharacterBarsStrip rows={barsRows(bars, mode)} bars={bars} roundMode={mode} nameOf={nameOf} />;
}

// Saldos coerentes com o servidor (D7): saldo = total − (agiram + próxima) × preço.
// Gon: 3 + mean(12) = 15; paga 1 × 9 → saldo 6. A pendente 30 (segunda) não conta.
const gon = row("c1", { actionCarry: 3, actionBalance: 6, pendingActionSpeeds: [12, 30] });
// Killua: 0 + mean(20, 22) = 21; paga 2 × 9 → saldo 3.
const killua = row("c2", { actionBalance: 3, actionSpeeds: [20, 22] });

const rowOf = (name: string) => screen.getAllByTestId("bars-row").find((r) => within(r).queryByText(name))!;
const barOf = (name: string, label: "ação" | "movimento") =>
  within(rowOf(name)).getByRole("group", { name: `Barra de ${label}` });
const numberOf = (bar: HTMLElement) => within(bar).getByTestId("bar-number");

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

describe("CharacterBarsStrip — the next action's total", () => {
  it("shows the total beside the bar, counting only the first pending speed", () => {
    render(<Strip bars={payload([gon])} />);
    const bar = barOf("Gon", "ação");
    expect(numberOf(bar)).toHaveTextContent(/^15$/);
    expect(within(bar).getByRole("meter")).toHaveAttribute("aria-valuenow", "15");
    // As pendentes continuam listadas, mais fracas, depois das que agiram.
    expect(within(rowOf("Gon")).getByTestId("action-pending")).toHaveTextContent("12 · 30");
  });

  it("a player row (no pending) totals carry plus the mean of the acted", () => {
    const player = row("c1", { actionCarry: 2, actionBalance: -7, actionSpeeds: [8, 10] });
    render(<Strip bars={payload([player])} />);
    expect(numberOf(barOf("Gon", "ação"))).toHaveTextContent(/^11$/);
    expect(within(rowOf("Gon")).getByTestId("action-acted")).toHaveTextContent("8 · 10");
  });

  it("the mean text is gone", () => {
    render(<Strip bars={payload([gon, killua])} />);
    expect(screen.queryByText(/x̄/)).toBeNull();
  });
});

describe("CharacterBarsStrip — hover and focus show the balance", () => {
  it("hover swaps the number for the balance and darkens the spent part", () => {
    render(<Strip bars={payload([gon])} />);
    const bar = barOf("Gon", "ação");
    expect(within(bar).queryByTestId("bar-spent")).toBeNull();
    fireEvent.mouseEnter(bar);
    expect(numberOf(bar)).toHaveTextContent(/^saldo 6$/);
    // Gasto = 15 − 6 = 9 de um total de 15: 60% do preenchimento.
    expect(within(bar).getByTestId("bar-spent").style.width).toBe("60%");
    fireEvent.mouseLeave(bar);
    expect(numberOf(bar)).toHaveTextContent(/^15$/);
    expect(within(bar).queryByTestId("bar-spent")).toBeNull();
  });

  it("the bar is focusable and keyboard focus swaps too", () => {
    render(<Strip bars={payload([gon])} />);
    const bar = barOf("Gon", "ação");
    expect(bar).toHaveAttribute("tabindex", "0");
    fireEvent.focus(bar);
    expect(numberOf(bar)).toHaveTextContent(/^saldo 6$/);
    fireEvent.blur(bar);
    expect(numberOf(bar)).toHaveTextContent(/^15$/);
  });

  it("a negative balance darkens the whole fill and reads with the minus sign", () => {
    // 0 + mean(8, 6) = 7; paga 2 × 9 → saldo −11.
    const debt = row("c1", { actionBalance: -11, actionSpeeds: [8], pendingActionSpeeds: [6] });
    render(<Strip bars={payload([debt])} />);
    const bar = barOf("Gon", "ação");
    fireEvent.mouseEnter(bar);
    expect(numberOf(bar)).toHaveTextContent(new RegExp(`^saldo ${MINUS}11$`));
    expect(within(bar).getByTestId("bar-spent").style.width).toBe("100%");
  });

  it("the tooltip is the project Tooltip with today's wording, and no native title is left", () => {
    const { container } = render(<Strip bars={payload([gon])} />);
    const bar = barOf("Gon", "ação");
    // A descrição acessível do Tooltip existe desde o início (sr-only).
    expect(bar).toHaveAccessibleDescription("Ação: saldo 6 de 9");
    fireEvent.focus(bar);
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("Ação: saldo 6 de 9");
    expect(container.querySelector("[title]")).toBeNull();
  });
});

describe("CharacterBarsStrip — shared scale and ticks", () => {
  it("full width is the largest max(total, price) and one tick marks each price multiple", () => {
    render(<Strip bars={payload([gon, killua])} />);
    const gonBar = barOf("Gon", "ação");
    const killuaBar = barOf("Killua", "ação");
    // Escala 21 (o total de Killua): Gon enche 15/21, Killua inteiro.
    expect(within(gonBar).getByTestId("bar-fill").style.width).toBe(`${(15 / 21) * 100}%`);
    expect(within(killuaBar).getByTestId("bar-fill").style.width).toBe("100%");
    // Preço 9 dentro de 21: traços em 9 e 18, nas duas linhas.
    for (const bar of [gonBar, killuaBar]) {
      const ticks = within(bar).getAllByTestId("bar-tick");
      expect(ticks.map((t) => t.style.left)).toEqual([`${(9 / 21) * 100}%`, `${(18 / 21) * 100}%`]);
    }
  });

  it("a total below the price fills only its share of the price", () => {
    const low = row("c1", { actionBalance: -5, actionSpeeds: [4] });
    render(<Strip bars={payload([low])} />);
    const bar = barOf("Gon", "ação");
    expect(within(bar).getByTestId("bar-fill").style.width).toBe(`${(4 / 9) * 100}%`);
    expect(within(bar).queryAllByTestId("bar-tick")).toHaveLength(0);
  });
});

describe("CharacterBarsStrip — alignment", () => {
  it("every row renders every cell, so the move bars sit in the same column", () => {
    // Revisão D7: uma linha com velocidade na ação e outra sem nada nela.
    const withAction = row("c1", { actionSpeeds: [16], actionBalance: 7 });
    const nothing = row("c2");
    render(<Strip bars={payload([withAction, nothing], { move: 12 })} />);
    const [a, b] = [rowOf("Gon"), rowOf("Killua")];
    expect(a.children.length).toBe(b.children.length);
    const columnOfMove = (r: HTMLElement) =>
      Array.from(r.children).findIndex((cell) => within(cell as HTMLElement).queryByRole("group", { name: "Barra de movimento" }));
    expect(columnOfMove(a)).toBeGreaterThan(0);
    expect(columnOfMove(a)).toBe(columnOfMove(b));
  });

  it("the strip is one grid and rows do not box their cells", () => {
    render(<Strip bars={payload([gon])} />);
    expect(screen.getByLabelText("Barras de cada personagem")).toHaveStyle("display: grid");
    expect(rowOf("Gon")).toHaveStyle("display: contents");
  });
});

describe("CharacterBarsStrip — bars without price", () => {
  it("keeps the cells: empty track, no ticks, the total as number and no hover swap", () => {
    const b = payload([row("c1", { actionSpeeds: [16], actionBalance: 16 })], {});
    render(<Strip bars={b} />);
    const bar = barOf("Gon", "ação");
    expect(numberOf(bar)).toHaveTextContent(/^16$/);
    expect(within(bar).queryByTestId("bar-fill")).toBeNull();
    expect(within(bar).queryAllByTestId("bar-tick")).toHaveLength(0);
    expect(bar).not.toHaveAttribute("tabindex");
    fireEvent.mouseEnter(bar);
    expect(numberOf(bar)).toHaveTextContent(/^16$/);
    expect(bar).not.toHaveAccessibleDescription();
  });

  it("a bar with no price and no speed still renders icon and empty track", () => {
    // Antes: sem nada, nem o ícone (a coluna colapsava e as barras de movimento pulavam depois).
    const b = payload([row("c1", { moveSpeeds: [16], moveBalance: 2 })], { move: 14 });
    render(<Strip bars={b} />);
    const bar = barOf("Gon", "ação");
    expect(within(bar).getByRole("img", { name: "ação" })).toHaveTextContent("⚔");
    expect(within(bar).getByRole("meter")).toHaveAttribute("aria-valuenow", "0");
    expect(within(bar).queryByTestId("bar-fill")).toBeNull();
    expect(within(bar).queryAllByTestId("bar-tick")).toHaveLength(0);
    expect(bar).not.toHaveAttribute("tabindex");
    expect(bar).not.toHaveAccessibleDescription();
  });

  it("with no action-bar data anywhere, every row keeps the action icon and the move bar cell index", () => {
    const moveOnly = payload([row("c1", { moveSpeeds: [16], moveBalance: 2 }), row("c2", { moveSpeeds: [9], moveBalance: 1 })], { move: 14 });
    const withAction = payload([row("c1", { moveSpeeds: [16], moveBalance: 2, actionSpeeds: [10], actionBalance: 1 }), row("c2", { moveSpeeds: [9], moveBalance: 1 })], { move: 14 });
    const moveColumn = (b: BarsPayload) => {
      const { unmount } = render(<Strip bars={b} />);
      const rows = screen.getAllByTestId("bars-row");
      rows.forEach((r) => expect(within(r).getByRole("img", { name: "ação" })).toBeInTheDocument());
      const cols = rows.map((r) =>
        Array.from(r.children).findIndex((cell) => within(cell as HTMLElement).queryByRole("group", { name: "Barra de movimento" })));
      unmount();
      return cols;
    };
    expect(moveColumn(moveOnly)).toEqual(moveColumn(withAction));
  });
});

describe("CharacterBarsStrip — colours", () => {
  it("fills in the bar colours, and no green anywhere", () => {
    const both = row("c1", { actionSpeeds: [10], actionBalance: 1, moveSpeeds: [12], moveBalance: 0 });
    const { container } = render(<Strip bars={payload([both])} />);
    expect(within(barOf("Gon", "ação")).getByTestId("bar-fill")).toHaveStyle(`background-color: ${rgb(colors.mapAttackIntent)}`);
    expect(within(barOf("Gon", "movimento")).getByTestId("bar-fill")).toHaveStyle(`background-color: ${rgb(colors.mapMoveIntent)}`);
    fireEvent.mouseEnter(barOf("Gon", "ação"));
    // Os verdes do produto (green900/700/500); o verde do medidor antigo era statusOngoing.
    const greens = [colors.statusOngoing, colors.brandPrimary, colors.brandAccent, colors.mapActiveTurn].map(rgb);
    for (const el of Array.from(container.querySelectorAll("*"))) {
      const s = getComputedStyle(el);
      for (const g of greens) {
        expect(s.backgroundColor).not.toBe(g);
        expect(s.color).not.toBe(g);
      }
    }
  });
});

describe("CharacterBarsStrip — kept behaviour", () => {
  it("renders nothing in the Free regime", () => {
    render(<Strip bars={payload([gon])} mode="Free" />);
    expect(screen.queryByText("Gon")).toBeNull();
    expect(screen.queryAllByRole("meter")).toHaveLength(0);
  });

  it("lists deferred speeds after a \"Próximo round\" separator", () => {
    render(<Strip bars={payload([row("c1", { actionSpeeds: [16], actionBalance: 7, deferredActionSpeeds: [9] })])} />);
    const label = screen.getByText("Próximo round");
    const nine = screen.getByText("9");
    expect(label.compareDocumentPosition(nine) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows a row the moment a master payload carries a pending speed", () => {
    const b: BarsPayload = { ...payload([row("c1", { actionBalance: 12, pendingActionSpeeds: [23] })], {}), provisionalPrices: { action: 11 } };
    render(<Strip bars={b} />);
    expect(screen.getByText("Gon")).toBeInTheDocument();
    expect(within(barOf("Gon", "ação")).getByRole("meter")).toHaveAttribute("aria-valuenow", "23");
  });

  it("keeps rows sorted by name across updates", () => {
    const a = payload([killua, gon]);
    const { rerender } = render(<Strip bars={a} />);
    const names = () => screen.getAllByTestId("bars-row").map((r) => within(r).queryByText(/Gon|Killua/)?.textContent);
    expect(names()).toEqual(["Gon", "Killua"]);
    rerender(<Strip bars={payload([gon, killua])} />);
    expect(names()).toEqual(["Gon", "Killua"]);
  });
});
