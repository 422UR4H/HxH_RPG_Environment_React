import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { HOLD_MS } from "../../tactical-map/hooks/useHoldGesture";
import MatchCharactersSidebar from "../MatchCharactersSidebar";
import type { Participant } from "../../../types/match";

const participants: Participant[] = [
  {
    uuid: "p1",
    joinedAt: "2026-06-01T00:00:00Z",
    characterSheet: {
      uuid: "c1",
      playerUuid: "user-1",
      masterUuid: "master-1",
      campaignUuid: "campaign-1",
      nickName: "Gon",
      createdAt: "2026-06-01T00:00:00Z",
      updatedAt: "2026-06-01T00:00:00Z",
    },
  },
];

const props = {
  gameStarted: true,
  enrollments: [],
  participants,
  isMaster: true,
  actionLoading: {},
  onAccept: () => {},
  onReject: () => {},
  onSelectCharacterSheet: () => {},
};

describe("MatchCharactersSidebar", () => {
  it("o `footer` aparece depois dos cards", () => {
    render(<MatchCharactersSidebar {...props} footer={<p>rodapé</p>} />);
    const footer = screen.getByText("rodapé");
    const card = screen.getByText("Gon");
    expect(card.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("`fluid` ocupa a largura toda do painel", () => {
    render(<MatchCharactersSidebar {...props} fluid />);
    expect(screen.getByRole("complementary")).toHaveStyle({ width: "100%" });
  });

  describe("drag to the map", () => {
    const offBoardIds = new Set(["c1"]);
    const row = () => screen.getByTestId("character-row-c1");
    const down = (type = "mouse") =>
      fireEvent.pointerDown(row(), { pointerId: 1, button: 0, pointerType: type, clientX: 10, clientY: 10 });
    const move = (x: number, y: number, type = "mouse") =>
      fireEvent.pointerMove(window, { pointerId: 1, pointerType: type, clientX: x, clientY: y });

    it("shows the off-board badge only for off-board participants, on the master view", () => {
      const { rerender } = render(<MatchCharactersSidebar {...props} offBoardIds={offBoardIds} />);
      expect(row()).toHaveTextContent("Fora do mapa");
      rerender(<MatchCharactersSidebar {...props} offBoardIds={new Set()} />);
      expect(row()).not.toHaveTextContent("Fora do mapa");
      rerender(<MatchCharactersSidebar {...props} isMaster={false} offBoardIds={offBoardIds} />);
      expect(row()).not.toHaveTextContent("Fora do mapa");
    });

    it("calls onCardDragStart after moving past the tolerance and swallows the click", () => {
      const onCardDragStart = vi.fn();
      const onSelect = vi.fn();
      render(
        <MatchCharactersSidebar
          {...props}
          onSelectCharacterSheet={onSelect}
          offBoardIds={offBoardIds}
          onCardDragStart={onCardDragStart}
        />,
      );
      down();
      move(12, 10);
      expect(onCardDragStart).not.toHaveBeenCalled();
      move(40, 10);
      expect(onCardDragStart).toHaveBeenCalledWith(participants[0], { x: 40, y: 10 });
      fireEvent.pointerUp(window);
      fireEvent.click(row());
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("keeps a plain click opening the sheet", () => {
      const onCardDragStart = vi.fn();
      const onSelect = vi.fn();
      render(
        <MatchCharactersSidebar
          {...props}
          onSelectCharacterSheet={onSelect}
          offBoardIds={offBoardIds}
          onCardDragStart={onCardDragStart}
        />,
      );
      down();
      fireEvent.pointerUp(window);
      fireEvent.click(row());
      expect(onSelect).toHaveBeenCalledWith("c1");
      expect(onCardDragStart).not.toHaveBeenCalled();
    });

    it("does not drag on-board cards, non-master views or participants that left", () => {
      const onCardDragStart = vi.fn();
      const { rerender } = render(
        <MatchCharactersSidebar {...props} offBoardIds={new Set()} onCardDragStart={onCardDragStart} />,
      );
      down();
      move(60, 10);
      expect(onCardDragStart).not.toHaveBeenCalled();

      rerender(
        <MatchCharactersSidebar {...props} isMaster={false} offBoardIds={offBoardIds} onCardDragStart={onCardDragStart} />,
      );
      down();
      move(60, 10);
      expect(onCardDragStart).not.toHaveBeenCalled();

      rerender(
        <MatchCharactersSidebar
          {...props}
          participants={[{ ...participants[0], leftAt: "2026-06-02T00:00:00Z" }]}
          offBoardIds={offBoardIds}
          onCardDragStart={onCardDragStart}
        />,
      );
      down();
      move(60, 10);
      expect(onCardDragStart).not.toHaveBeenCalled();
    });

    describe("touch", () => {
      beforeEach(() => vi.useFakeTimers());
      afterEach(() => vi.useRealTimers());

      it("starts after the hold and blocks page scrolling until the release", () => {
        const onCardDragStart = vi.fn();
        render(<MatchCharactersSidebar {...props} offBoardIds={offBoardIds} onCardDragStart={onCardDragStart} />);
        down("touch");
        act(() => vi.advanceTimersByTime(HOLD_MS));
        expect(onCardDragStart).toHaveBeenCalledWith(participants[0], { x: 10, y: 10 });

        const blocked = new Event("touchmove", { cancelable: true });
        document.dispatchEvent(blocked);
        expect(blocked.defaultPrevented).toBe(true);

        fireEvent.pointerUp(window);
        const free = new Event("touchmove", { cancelable: true });
        document.dispatchEvent(free);
        expect(free.defaultPrevented).toBe(false);
      });

      it("abandons the gesture when the finger moves first (list scroll)", () => {
        const onCardDragStart = vi.fn();
        render(<MatchCharactersSidebar {...props} offBoardIds={offBoardIds} onCardDragStart={onCardDragStart} />);
        down("touch");
        move(10, 50, "touch");
        act(() => vi.advanceTimersByTime(HOLD_MS * 2));
        expect(onCardDragStart).not.toHaveBeenCalled();
      });
    });
  });
});
