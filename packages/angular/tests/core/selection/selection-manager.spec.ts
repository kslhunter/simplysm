import { describe, it, expect } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { useSelectionManager } from "../../../src/core/selection/useSelectionManager";

interface Item {
  id?: number;
  tenant?: string;
  name: string;
  selectable?: boolean;
  reason?: string;
}

function createManager<TKey = Item>(
  items: Item[],
  mode: "single" | "multi" | undefined,
  getItemSelectableFn?: (item: Item) => boolean | string,
  trackByFn?: (item: Item, index: number) => TKey,
) {
  TestBed.configureTestingModule({});
  const displayItems = signal(items);
  const selectedKeys = signal<NonNullable<TKey>[]>([]);
  const selectMode = signal<"single" | "multi" | undefined>(mode);
  const selectableFn = signal<((item: Item) => boolean | string) | undefined>(
    getItemSelectableFn,
  );
  const trackBy = signal<(item: Item, index: number) => TKey>(
    (trackByFn ?? ((item: Item) => item)) as (item: Item, index: number) => TKey,
  );

  const manager = useSelectionManager({
    displayItems,
    selectedKeys,
    selectMode,
    getItemSelectableFn: selectableFn,
    trackByFn: trackBy,
  });

  return { manager, selectedKeys, selectMode, displayItems };
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
    const { manager, selectedKeys } = createManager([A, B], "single");

    manager.select(A);
    expect(selectedKeys()).toEqual([A]);

    manager.select(B);
    expect(selectedKeys()).toEqual([B]);
  });

  it("다중 선택: select 시 기존 선택에 추가된다", () => {
    const A: Item = { name: "A" };
    const B: Item = { name: "B" };
    const { manager, selectedKeys } = createManager([A, B], "multi");

    manager.select(A);
    expect(selectedKeys()).toEqual([A]);

    manager.select(B);
    expect(selectedKeys()).toEqual([A, B]);
  });

  it("toggle: 선택된 아이템은 해제, 미선택 아이템은 선택", () => {
    const A: Item = { name: "A" };
    const { manager, selectedKeys } = createManager([A], "multi");

    manager.toggle(A);
    expect(selectedKeys()).toEqual([A]);

    manager.toggle(A);
    expect(selectedKeys()).toEqual([]);
  });

  it("toggleAll: 전체 선택 후 전체 해제", () => {
    const A: Item = { name: "A" };
    const B: Item = { name: "B" };
    const { manager, selectedKeys } = createManager([A, B], "multi");

    manager.toggleAll();
    expect(selectedKeys()).toEqual([A, B]);
    expect(manager.isAllSelected()).toBe(true);

    manager.toggleAll();
    expect(selectedKeys()).toEqual([]);
    expect(manager.isAllSelected()).toBe(false);
  });

  it("선택 불가 아이템: getSelectable이 문자열 사유를 반환한다", () => {
    const A: Item = { name: "A" };
    const B: Item = { name: "B", reason: "권한 없음" };
    const { manager, selectedKeys } = createManager([A, B], "multi", (item) => {
      if (item.reason != null) return item.reason;
      return true;
    });

    expect(manager.getSelectable(A)).toBe(true);
    expect(manager.getSelectable(B)).toBe("권한 없음");

    manager.select(B);
    expect(selectedKeys()).toEqual([]); // Cannot select
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
    const { manager, selectedKeys } = createManager([A], "multi");

    manager.select(A);
    expect(selectedKeys()).toEqual([A]);

    manager.deselect(A);
    expect(selectedKeys()).toEqual([]);
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
    const { manager, selectedKeys } = createManager([A, B], "multi", (item) => {
      if (item.reason != null) return item.reason;
      return true;
    });

    manager.toggleAll();
    expect(selectedKeys()).toEqual([A]);
  });

  it("중복 select: 이미 선택된 아이템을 다시 select하면 중복되지 않는다", () => {
    const A: Item = { name: "A" };
    const { manager, selectedKeys } = createManager([A], "multi");

    manager.select(A);
    manager.select(A);
    expect(selectedKeys()).toEqual([A]);
  });
});

describe("Feature 5.1 Slice 1: useSelectionManager key+obj.equal 기반 비교", () => {
  it("같은 key의 다른 reference item도 isSelected=true로 복원된다", () => {
    const A1: Item = { id: 1, name: "A" };
    const { manager, selectedKeys, displayItems } = createManager(
      [A1],
      "multi",
      undefined,
      (item) => item.id,
    );
    manager.select(A1);
    expect(selectedKeys().length).toBe(1);

    const A2: Item = { id: 1, name: "A-updated" };
    displayItems.set([A2]);

    expect(manager.isSelected(A2)).toBe(true);
  });

  it("같은 key의 다른 reference를 select하면 중복 추가되지 않는다", () => {
    const A1: Item = { id: 1, name: "A" };
    const A2: Item = { id: 1, name: "A-copy" };
    const { manager, selectedKeys } = createManager(
      [A1, A2],
      "multi",
      undefined,
      (item) => item.id,
    );
    manager.select(A1);
    manager.select(A2);
    expect(selectedKeys().length).toBe(1);
    expect(selectedKeys()[0]).toBe(1);
  });

  it("같은 key의 다른 reference를 deselect하면 selectedKeys에서 제거된다", () => {
    const A1: Item = { id: 1, name: "A" };
    const A2: Item = { id: 1, name: "A-copy" };
    const { manager, selectedKeys } = createManager(
      [A1, A2],
      "multi",
      undefined,
      (item) => item.id,
    );
    manager.select(A1);
    expect(selectedKeys()).toEqual([1]);
    manager.deselect(A2);
    expect(selectedKeys()).toEqual([]);
  });

  it("복합(object) key도 obj.equal deep 비교로 매칭된다", () => {
    const A1: Item = { id: 1, tenant: "a", name: "A" };
    const { manager, displayItems } = createManager(
      [A1],
      "multi",
      undefined,
      (item) => ({ id: item.id, tenant: item.tenant }),
    );
    manager.select(A1);

    const A2: Item = { id: 1, tenant: "a", name: "A-updated" };
    displayItems.set([A2]);
    expect(manager.isSelected(A2)).toBe(true);
  });

  it("isAllSelected: selectedKeys가 displayItems 전체를 커버하면 true", () => {
    const A: Item = { id: 1, name: "A" };
    const B: Item = { id: 2, name: "B" };
    const { manager, displayItems } = createManager(
      [A, B],
      "multi",
      undefined,
      (item) => item.id,
    );
    manager.toggleAll();
    expect(manager.isAllSelected()).toBe(true);

    const A2: Item = { id: 1, name: "A-updated" };
    const B2: Item = { id: 2, name: "B-updated" };
    displayItems.set([A2, B2]);
    expect(manager.isAllSelected()).toBe(true);
  });

  it("toggleAll(누적 모드 의미): 현재 displayItems selectable만 추가하고 기존 선택 유지", () => {
    const A: Item = { id: 1, name: "A" };
    const B: Item = { id: 2, name: "B" };
    const { manager, selectedKeys, displayItems } = createManager(
      [A],
      "multi",
      undefined,
      (item) => item.id,
    );
    manager.select(A);
    expect(selectedKeys().length).toBe(1);

    // displayItems 교체(누적 상황 재현): selectedKeys는 건드리지 않고 B만 displayItems에
    displayItems.set([B]);
    manager.toggleAll();
    expect(selectedKeys().length).toBe(2);
    expect(selectedKeys().some((k) => k === 1)).toBe(true);
    expect(selectedKeys().some((k) => k === 2)).toBe(true);
  });

  it("toggleAll(누적 모드 의미): isAllSelected 상태에서 현재 displayItems만 해제하고 기존은 유지", () => {
    const A: Item = { id: 1, name: "A" };
    const B: Item = { id: 2, name: "B" };
    const { manager, selectedKeys, displayItems } = createManager(
      [A],
      "multi",
      undefined,
      (item) => item.id,
    );
    manager.select(A);
    displayItems.set([B]);
    manager.select(B);
    expect(selectedKeys().length).toBe(2);

    // 현재 displayItems는 [B]. toggleAll → B만 해제, A 유지
    manager.toggleAll();
    expect(selectedKeys().length).toBe(1);
    expect(selectedKeys()[0]).toBe(1);
  });
});
