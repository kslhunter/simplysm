import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Kanban } from "../../../../src/components/data/kanban/Kanban";

describe("Kanban selection system", () => {
  function renderKanban(options?: {
    selectedValues?: unknown[];
    onSelectedValuesChange?: (v: unknown[]) => void;
    selectable?: boolean;
  }) {
    return render(() => (
      <Kanban
        selectedValues={options?.selectedValues}
        onSelectedValuesChange={options?.onSelectedValuesChange}
        class="h-[400px]"
      >
        <Kanban.Lane value="lane-1">
          <Kanban.LaneTitle>Lane 1</Kanban.LaneTitle>
          <Kanban.Card value={1} selectable={options?.selectable ?? true} contentClass="p-2">
            Card 1
          </Kanban.Card>
          <Kanban.Card value={2} selectable={options?.selectable ?? true} contentClass="p-2">
            Card 2
          </Kanban.Card>
          <Kanban.Card value={3} selectable={false} contentClass="p-2">
            Card 3 (not selectable)
          </Kanban.Card>
        </Kanban.Lane>
        <Kanban.Lane value="lane-2">
          <Kanban.LaneTitle>Lane 2</Kanban.LaneTitle>
          <Kanban.Card value={4} selectable contentClass="p-2">
            Card 4
          </Kanban.Card>
        </Kanban.Lane>
      </Kanban>
    ));
  }

  describe("Shift+Click selection", () => {
    it("selects a card with Shift+Click", () => {
      const handleChange = vi.fn();
      const { getByText } = renderKanban({
        selectedValues: [],
        onSelectedValuesChange: handleChange,
      });
      const card1 = getByText("Card 1").closest("[data-kanban-card]") as HTMLElement;
      fireEvent.click(card1, { shiftKey: true });
      expect(handleChange).toHaveBeenCalledWith([1]);
    });

    it("deselects an already selected card with Shift+Click", () => {
      const handleChange = vi.fn();
      const { getByText } = renderKanban({
        selectedValues: [1],
        onSelectedValuesChange: handleChange,
      });
      const card1 = getByText("Card 1").closest("[data-kanban-card]") as HTMLElement;
      fireEvent.click(card1, { shiftKey: true });
      expect(handleChange).toHaveBeenCalledWith([]);
    });

    it("click without Shift does not change selection", () => {
      const handleChange = vi.fn();
      const { getByText } = renderKanban({
        selectedValues: [],
        onSelectedValuesChange: handleChange,
      });
      const card1 = getByText("Card 1").closest("[data-kanban-card]") as HTMLElement;
      fireEvent.click(card1);
      expect(handleChange).not.toHaveBeenCalled();
    });

    it("does not select card with selectable=false on Shift+Click", () => {
      const handleChange = vi.fn();
      const { getByText } = renderKanban({
        selectedValues: [],
        onSelectedValuesChange: handleChange,
      });
      const card3 = getByText("Card 3 (not selectable)").closest(
        "[data-kanban-card]",
      ) as HTMLElement;
      fireEvent.click(card3, { shiftKey: true });
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe("selection visual feedback", () => {
    it("applies ring + shadow classes to selected card", () => {
      const { getByText } = renderKanban({ selectedValues: [1] });
      const card1Content = getByText("Card 1").closest("[data-card]") as HTMLElement;
      expect(card1Content.classList.contains("ring-2")).toBe(true);
      expect(card1Content.className).toContain("ring-primary-500/50");
      expect(card1Content.classList.contains("shadow-md")).toBe(true);
    });

    it("unselected card has no ring class", () => {
      const { getByText } = renderKanban({ selectedValues: [1] });
      const card2Content = getByText("Card 2").closest("[data-card]") as HTMLElement;
      expect(card2Content.classList.contains("ring-2")).toBe(false);
    });
  });

  describe("per-lane select-all checkbox", () => {
    it("displays select-all checkbox in lanes that have selectable cards", () => {
      const { container } = renderKanban({ selectedValues: [] });
      const checkboxes = container.querySelectorAll("[role='checkbox']");
      expect(checkboxes.length).toBe(2);
    });

    it("selects all selectable cards in lane when select-all checkbox is clicked", () => {
      const handleChange = vi.fn();
      const { container } = renderKanban({
        selectedValues: [],
        onSelectedValuesChange: handleChange,
      });
      const firstLane = container.querySelector("[data-kanban-lane]") as HTMLElement;
      const checkbox = firstLane.querySelector("[role='checkbox']") as HTMLElement;
      fireEvent.click(checkbox);
      expect(handleChange).toHaveBeenCalledWith([1, 2]);
    });

    it("deselects only cards in the lane when clicking checkbox in fully-selected state", () => {
      const handleChange = vi.fn();
      const { container } = renderKanban({
        selectedValues: [1, 2, 4],
        onSelectedValuesChange: handleChange,
      });
      const firstLane = container.querySelector("[data-kanban-lane]") as HTMLElement;
      const checkbox = firstLane.querySelector("[role='checkbox']") as HTMLElement;
      fireEvent.click(checkbox);
      expect(handleChange).toHaveBeenCalledWith([4]);
    });

    it("checkbox is checked when all selectable cards are selected", () => {
      const { container } = renderKanban({ selectedValues: [1, 2] });
      const firstLane = container.querySelector("[data-kanban-lane]") as HTMLElement;
      const checkbox = firstLane.querySelector("[role='checkbox']") as HTMLElement;
      expect(checkbox.getAttribute("aria-checked")).toBe("true");
    });

    it("checkbox is unchecked when only some cards are selected", () => {
      const { container } = renderKanban({ selectedValues: [1] });
      const firstLane = container.querySelector("[data-kanban-lane]") as HTMLElement;
      const checkbox = firstLane.querySelector("[role='checkbox']") as HTMLElement;
      expect(checkbox.getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("long press exclusive selection", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("exclusively selects that card when pressed for 500ms or more", () => {
      const handleChange = vi.fn();
      const { getByText } = renderKanban({
        selectedValues: [2, 4],
        onSelectedValuesChange: handleChange,
      });

      const card1 = getByText("Card 1").closest("[data-kanban-card]") as HTMLElement;
      fireEvent.pointerDown(card1);
      vi.advanceTimersByTime(500);

      expect(handleChange).toHaveBeenCalledWith([1]);
    });

    it("does not change selection when pressed for less than 500ms", () => {
      const handleChange = vi.fn();
      const { getByText } = renderKanban({
        selectedValues: [],
        onSelectedValuesChange: handleChange,
      });

      const card1 = getByText("Card 1").closest("[data-kanban-card]") as HTMLElement;
      fireEvent.pointerDown(card1);
      vi.advanceTimersByTime(400);
      fireEvent.pointerUp(card1);

      expect(handleChange).not.toHaveBeenCalled();
    });

    it("does not select card with selectable=false on long press", () => {
      const handleChange = vi.fn();
      const { getByText } = renderKanban({
        selectedValues: [],
        onSelectedValuesChange: handleChange,
      });

      const card3 = getByText("Card 3 (not selectable)").closest(
        "[data-kanban-card]",
      ) as HTMLElement;
      fireEvent.pointerDown(card3);
      vi.advanceTimersByTime(500);

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe("uncontrolled mode", () => {
    it("Shift+Click selection works without onSelectedValuesChange", () => {
      const { getByText } = renderKanban();
      const card1 = getByText("Card 1").closest("[data-kanban-card]") as HTMLElement;
      fireEvent.click(card1, { shiftKey: true });
      const card1Content = getByText("Card 1").closest("[data-card]") as HTMLElement;
      expect(card1Content.classList.contains("ring-2")).toBe(true);
    });
  });
});
