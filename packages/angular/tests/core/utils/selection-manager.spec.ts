import { describe, it, expect } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { useSelectionManager } from "../../../src/core/utils/useSelectionManager";

interface Item {
  name: string;
  selectable?: boolean;
  reason?: string;
}

function createManager(
  items: Item[],
  mode: "single" | "multi" | undefined,
  getItemSelectableFn?: (item: Item) => boolean | string,
) {
  TestBed.configureTestingModule({});
  const displayItems = signal(items);
  const selectedItems = signal<Item[]>([]);
  const selectMode = signal<"single" | "multi" | undefined>(mode);
  const selectableFn = signal<((item: Item) => boolean | string) | undefined>(
    getItemSelectableFn,
  );

  const manager = useSelectionManager({
    displayItems,
    selectedItems,
    selectMode,
    getItemSelectableFn: selectableFn,
  });

  return { manager, selectedItems, selectMode };
}

describe("FIX-1 Slice 5: useSelectionManager Set 기반 비교", () => {
  it("isAllSelected가 Set.has()를 사용하여 O(n)으로 비교한다", () => {
    const items: Item[] = [];
    for (let i = 0; i < 1000; i++) {
      items.push({ name: `Item${i}` });
    }

    const { manager } = createManager(items, "multi");

    // 모든 항목을 선택
    manager.toggleAll();
    expect(manager.isAllSelected()).toBe(true);

    // 성능 측정
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      manager.isAllSelected();
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000);
  });
});

describe("useSelectionManager", () => {
  it("단일 선택: select 시 이전 선택이 해제된다", () => {
    const A: Item = { name: "A" };
    const B: Item = { name: "B" };
    const { manager, selectedItems } = createManager([A, B], "single");

    manager.select(A);
    expect(selectedItems()).toEqual([A]);

    manager.select(B);
    expect(selectedItems()).toEqual([B]);
  });

  it("다중 선택: select 시 기존 선택에 추가된다", () => {
    const A: Item = { name: "A" };
    const B: Item = { name: "B" };
    const { manager, selectedItems } = createManager([A, B], "multi");

    manager.select(A);
    expect(selectedItems()).toEqual([A]);

    manager.select(B);
    expect(selectedItems()).toEqual([A, B]);
  });

  it("toggle: 선택된 아이템은 해제, 미선택 아이템은 선택", () => {
    const A: Item = { name: "A" };
    const { manager, selectedItems } = createManager([A], "multi");

    manager.toggle(A);
    expect(selectedItems()).toEqual([A]);

    manager.toggle(A);
    expect(selectedItems()).toEqual([]);
  });

  it("toggleAll: 전체 선택 후 전체 해제", () => {
    const A: Item = { name: "A" };
    const B: Item = { name: "B" };
    const { manager, selectedItems } = createManager([A, B], "multi");

    manager.toggleAll();
    expect(selectedItems()).toEqual([A, B]);
    expect(manager.isAllSelected()).toBe(true);

    manager.toggleAll();
    expect(selectedItems()).toEqual([]);
    expect(manager.isAllSelected()).toBe(false);
  });

  it("선택 불가 아이템: getSelectable이 문자열 사유를 반환한다", () => {
    const A: Item = { name: "A" };
    const B: Item = { name: "B", reason: "권한 없음" };
    const { manager, selectedItems } = createManager([A, B], "multi", (item) => {
      if (item.reason != null) return item.reason;
      return true;
    });

    expect(manager.getSelectable(A)).toBe(true);
    expect(manager.getSelectable(B)).toBe("권한 없음");

    manager.select(B);
    expect(selectedItems()).toEqual([]); // Cannot select
  });

  it("selectMode가 undefined이면 hasSelectable이 false", () => {
    const A: Item = { name: "A" };
    const { manager } = createManager([A], undefined);

    expect(manager.hasSelectable()).toBe(false);
  });

  it("isSelected: 아이템의 선택 상태를 반환한다", () => {
    const A: Item = { name: "A" };
    const { manager } = createManager([A], "multi");

    expect(manager.isSelected(A)).toBe(false);
    manager.select(A);
    expect(manager.isSelected(A)).toBe(true);
  });

  it("deselect: 선택된 아이템을 해제한다", () => {
    const A: Item = { name: "A" };
    const { manager, selectedItems } = createManager([A], "multi");

    manager.select(A);
    expect(selectedItems()).toEqual([A]);

    manager.deselect(A);
    expect(selectedItems()).toEqual([]);
  });

  it("getCanChangeFn: 선택 가능하면 true를 반환하는 함수", () => {
    const A: Item = { name: "A" };
    const B: Item = { name: "B", reason: "권한 없음" };
    const { manager } = createManager([A, B], "multi", (item) => {
      if (item.reason != null) return item.reason;
      return true;
    });

    expect(manager.getCanChangeFn(A)()).toBe(true);
    expect(manager.getCanChangeFn(B)()).toBe(false);
  });

  it("toggleAll: 선택 불가 아이템은 제외하고 전체 선택", () => {
    const A: Item = { name: "A" };
    const B: Item = { name: "B", reason: "권한 없음" };
    const { manager, selectedItems } = createManager([A, B], "multi", (item) => {
      if (item.reason != null) return item.reason;
      return true;
    });

    manager.toggleAll();
    expect(selectedItems()).toEqual([A]);
  });

  it("중복 select: 이미 선택된 아이템을 다시 select하면 중복되지 않는다", () => {
    const A: Item = { name: "A" };
    const { manager, selectedItems } = createManager([A], "multi");

    manager.select(A);
    manager.select(A);
    expect(selectedItems()).toEqual([A]);
  });
});
