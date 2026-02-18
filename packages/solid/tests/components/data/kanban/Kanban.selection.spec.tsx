import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Kanban } from "../../../../src/components/data/kanban/Kanban";

describe("Kanban 선택 시스템", () => {
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

  describe("Shift+Click 선택", () => {
    it("Shift+Click으로 카드가 선택된다", () => {
      const handleChange = vi.fn();
      const { getByText } = renderKanban({
        selectedValues: [],
        onSelectedValuesChange: handleChange,
      });
      const card1 = getByText("Card 1").closest("[data-kanban-card]") as HTMLElement;
      fireEvent.click(card1, { shiftKey: true });
      expect(handleChange).toHaveBeenCalledWith([1]);
    });

    it("이미 선택된 카드를 Shift+Click하면 선택 해제된다", () => {
      const handleChange = vi.fn();
      const { getByText } = renderKanban({
        selectedValues: [1],
        onSelectedValuesChange: handleChange,
      });
      const card1 = getByText("Card 1").closest("[data-kanban-card]") as HTMLElement;
      fireEvent.click(card1, { shiftKey: true });
      expect(handleChange).toHaveBeenCalledWith([]);
    });

    it("Shift 없는 클릭은 선택을 변경하지 않는다", () => {
      const handleChange = vi.fn();
      const { getByText } = renderKanban({
        selectedValues: [],
        onSelectedValuesChange: handleChange,
      });
      const card1 = getByText("Card 1").closest("[data-kanban-card]") as HTMLElement;
      fireEvent.click(card1);
      expect(handleChange).not.toHaveBeenCalled();
    });

    it("selectable=false인 카드는 Shift+Click해도 선택되지 않는다", () => {
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

  describe("선택 시각 피드백", () => {
    it("선택된 카드에 ring + shadow 클래스가 적용된다", () => {
      const { getByText } = renderKanban({ selectedValues: [1] });
      const card1Content = getByText("Card 1").closest("[data-card]") as HTMLElement;
      expect(card1Content.classList.contains("ring-2")).toBe(true);
      expect(card1Content.className).toContain("ring-primary-500/50");
      expect(card1Content.classList.contains("shadow-md")).toBe(true);
    });

    it("선택되지 않은 카드에는 ring 클래스가 없다", () => {
      const { getByText } = renderKanban({ selectedValues: [1] });
      const card2Content = getByText("Card 2").closest("[data-card]") as HTMLElement;
      expect(card2Content.classList.contains("ring-2")).toBe(false);
    });
  });

  describe("레인별 전체 선택 체크박스", () => {
    it("selectable 카드가 있는 레인에 전체 선택 체크박스가 표시된다", () => {
      const { container } = renderKanban({ selectedValues: [] });
      const checkboxes = container.querySelectorAll("[role='checkbox']");
      expect(checkboxes.length).toBe(2);
    });

    it("전체 선택 체크박스 클릭 시 레인 내 모든 selectable 카드가 선택된다", () => {
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

    it("전체 선택 상태에서 체크박스 클릭 시 레인 내 카드만 선택 해제된다", () => {
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

    it("모든 selectable 카드가 선택되면 체크박스가 체크 상태이다", () => {
      const { container } = renderKanban({ selectedValues: [1, 2] });
      const firstLane = container.querySelector("[data-kanban-lane]") as HTMLElement;
      const checkbox = firstLane.querySelector("[role='checkbox']") as HTMLElement;
      expect(checkbox.getAttribute("aria-checked")).toBe("true");
    });

    it("일부만 선택되면 체크박스가 미체크 상태이다", () => {
      const { container } = renderKanban({ selectedValues: [1] });
      const firstLane = container.querySelector("[data-kanban-lane]") as HTMLElement;
      const checkbox = firstLane.querySelector("[role='checkbox']") as HTMLElement;
      expect(checkbox.getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("Long press 단독 선택", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("500ms 이상 누르면 해당 카드만 단독 선택된다", () => {
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

    it("500ms 미만으로 누르면 선택이 변경되지 않는다", () => {
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

    it("selectable=false인 카드는 long press해도 선택되지 않는다", () => {
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

  describe("Uncontrolled 모드", () => {
    it("onSelectedValuesChange 없이도 Shift+Click 선택이 동작한다", () => {
      const { getByText } = renderKanban();
      const card1 = getByText("Card 1").closest("[data-kanban-card]") as HTMLElement;
      fireEvent.click(card1, { shiftKey: true });
      const card1Content = getByText("Card 1").closest("[data-card]") as HTMLElement;
      expect(card1Content.classList.contains("ring-2")).toBe(true);
    });
  });
});
