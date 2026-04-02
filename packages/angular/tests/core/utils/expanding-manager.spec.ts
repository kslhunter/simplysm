import { describe, it, expect } from "vitest";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { useExpandingManager } from "../../../src/core/utils/useExpandingManager";

interface IItem {
  name: string;
  children?: IItem[];
}

function createFlatManager(items: IItem[]) {
  TestBed.configureTestingModule({});
  const itemsSignal = signal(items);
  const expandedItems = signal<IItem[]>([]);
  const getChildrenFn = signal<((item: IItem, index: number) => IItem[] | undefined) | undefined>(
    undefined,
  );

  return useExpandingManager({
    items: itemsSignal,
    expandedItems,
    getChildrenFn,
    sort: (arr) => arr,
  });
}

function createTreeManager(items: IItem[]) {
  TestBed.configureTestingModule({});
  const itemsSignal = signal(items);
  const expandedItems = signal<IItem[]>([]);
  const getChildrenFn = signal<
    ((item: IItem, index: number) => IItem[] | undefined) | undefined
  >((item: IItem) => item.children);

  return {
    manager: useExpandingManager({
      items: itemsSignal,
      expandedItems,
      getChildrenFn,
      sort: (arr) => arr,
    }),
    expandedItems,
  };
}

describe("Feature 3.3 Slice 1: isVisible expandedSet 캐싱", () => {
  it("filter에서 isVisible을 N번 호출해도 expandedItems 변경이 반영된다", () => {
    const grandchild: IItem = { name: "Grandchild" };
    const child: IItem = { name: "Child", children: [grandchild] };
    const parent: IItem = { name: "Parent", children: [child] };
    const lone: IItem = { name: "Lone" };
    const { manager, expandedItems } = createTreeManager([parent, lone]);

    const allItems = manager.displayItems();

    // 초기: 부모 미펼침 → child, grandchild는 isVisible=false
    const visible1 = allItems.filter((item) => manager.isVisible(item));
    expect(visible1).toEqual([parent, lone]);

    // 부모 펼침 → child가 보여야 함
    expandedItems.set([parent]);
    const visible2 = allItems.filter((item) => manager.isVisible(item));
    expect(visible2).toEqual([parent, child, lone]);

    // 부모+자식 펼침 → grandchild도 보여야 함
    expandedItems.set([parent, child]);
    const visible3 = allItems.filter((item) => manager.isVisible(item));
    expect(visible3).toEqual([parent, child, grandchild, lone]);
  });
});

describe("FIX-1 Slice 5: useExpandingManager Set 기반 비교", () => {
  it("isAllExpanded가 Set.has()를 사용하여 O(n)으로 비교한다", () => {
    // 1000개 항목으로 성능 검증
    const items: IItem[] = [];
    for (let i = 0; i < 1000; i++) {
      items.push({ name: `Item${i}`, children: [{ name: `Child${i}` }] });
    }

    const { manager } = createTreeManager(items);

    // 모든 expandable 항목을 펼침
    manager.toggleAll();
    expect(manager.isAllExpanded()).toBe(true);

    // 성능 측정: isAllExpanded 호출이 빠르게 완료되어야 한다
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      manager.isAllExpanded();
    }
    const elapsed = performance.now() - start;

    // Set 기반이면 1000 * 100 = 100,000 has() 호출 → 매우 빠름
    // Array.includes 기반이면 1000 * 1000 * 100 = O(n^2) → 느림
    // 타��아웃보다는 동�� 검증에 집중
    expect(elapsed).toBeLessThan(1000); // 1초 이내
  });
});

describe("Feature 4.1 Slice 3: useExpandingManager", () => {
  it("flat 아이템 목록: displayItems가 동일하고 depth=0, hasExpandable=false", () => {
    const A: IItem = { name: "A" };
    const B: IItem = { name: "B" };
    const C: IItem = { name: "C" };
    const manager = createFlatManager([A, B, C]);

    expect(manager.displayItems()).toEqual([A, B, C]);
    expect(manager.hasExpandable()).toBe(false);

    const defA = manager.def(A);
    expect(defA.depth).toBe(0);
    expect(defA.hasChildren).toBe(false);
    expect(defA.parentDef).toBeUndefined();
  });

  it("계층 아이템의 트리 순회: Parent -> [Child1, Child2]", () => {
    const child1: IItem = { name: "Child1" };
    const child2: IItem = { name: "Child2" };
    const parent: IItem = { name: "Parent", children: [child1, child2] };
    const { manager } = createTreeManager([parent]);

    expect(manager.displayItems()).toEqual([parent, child1, child2]);
    expect(manager.hasExpandable()).toBe(true);

    const parentDef = manager.def(parent);
    expect(parentDef.depth).toBe(0);
    expect(parentDef.hasChildren).toBe(true);

    const child1Def = manager.def(child1);
    expect(child1Def.depth).toBe(1);
    expect(child1Def.parentDef?.item).toBe(parent);

    const child2Def = manager.def(child2);
    expect(child2Def.depth).toBe(1);
    expect(child2Def.parentDef?.item).toBe(parent);
  });

  it("단일 아이템 토글: toggle으로 추가/제거", () => {
    const child1: IItem = { name: "Child1" };
    const parent: IItem = { name: "Parent", children: [child1] };
    const { manager, expandedItems } = createTreeManager([parent]);

    expect(expandedItems()).toEqual([]);

    manager.toggle(parent);
    expect(expandedItems()).toContain(parent);

    manager.toggle(parent);
    expect(expandedItems()).not.toContain(parent);
  });

  it("전체 펼치기/접기: toggleAll", () => {
    const child1: IItem = { name: "Child1" };
    const parent: IItem = { name: "Parent", children: [child1] };
    const { manager, expandedItems } = createTreeManager([parent]);

    expect(manager.isAllExpanded()).toBe(false);

    manager.toggleAll();
    expect(manager.isAllExpanded()).toBe(true);
    expect(expandedItems().length).toBeGreaterThan(0);

    manager.toggleAll();
    expect(manager.isAllExpanded()).toBe(false);
    expect(expandedItems()).toEqual([]);
  });

  it("가시성 판단: 3단계 계층에서 isVisible", () => {
    const grandchild: IItem = { name: "Grandchild" };
    const child: IItem = { name: "Child", children: [grandchild] };
    const parent: IItem = { name: "Parent", children: [child] };
    const { manager, expandedItems } = createTreeManager([parent]);

    // 초기에는 아무것도 펼쳐지지 않음
    expect(manager.isVisible(child)).toBe(false);
    expect(manager.isVisible(grandchild)).toBe(false);

    // 부모 펼치기 -> 자식 표시됨
    expandedItems.set([parent]);
    expect(manager.isVisible(child)).toBe(true);
    // 손자 아직 미표시 (자식 미펼침)
    expect(manager.isVisible(grandchild)).toBe(false);

    // 자식도 펼치기 -> 손자 표시됨
    expandedItems.set([parent, child]);
    expect(manager.isVisible(grandchild)).toBe(true);
  });

  it("아이템 정의 조회: def()가 item, depth, hasChildren, parentDef를 반환", () => {
    const child: IItem = { name: "Child" };
    const parent: IItem = { name: "Parent", children: [child] };
    const { manager } = createTreeManager([parent]);

    const parentDef = manager.def(parent);
    expect(parentDef.item).toBe(parent);
    expect(parentDef.depth).toBe(0);
    expect(parentDef.hasChildren).toBe(true);
    expect(parentDef.parentDef).toBeUndefined();

    const childDef = manager.def(child);
    expect(childDef.item).toBe(child);
    expect(childDef.depth).toBe(1);
    expect(childDef.hasChildren).toBe(false);
    expect(childDef.parentDef?.item).toBe(parent);
  });
});
