import { describe, it, expect } from "vitest";
import { signal } from "@angular/core";
import { useSheetDisplayPipeline } from "../../../../src/ui/data/sheet/useSheetDisplayPipeline";

interface Item {
  name: string;
  children?: Item[];
}

function setup(overrides: {
  items?: Item[];
  useAutoSort?: boolean;
  itemsPerPage?: number;
  totalPageCount?: number;
  currentPage?: number;
  getChildrenFn?: (item: Item, index: number) => Item[] | undefined;
} = {}) {
  const items = signal<Item[]>(overrides.items ?? [
    { name: "Charlie" },
    { name: "Alice" },
    { name: "Bob" },
  ]);
  const useAutoSort = signal(overrides.useAutoSort ?? false);
  const itemsPerPage = signal(overrides.itemsPerPage ?? 0);
  const totalPageCount = signal(overrides.totalPageCount ?? 0);
  const currentPage = signal(overrides.currentPage ?? 0);
  const expandedItems = signal<Item[]>([]);
  const getChildrenFn = signal<((item: Item, index: number) => Item[] | undefined) | undefined>(
    overrides.getChildrenFn,
  );

  const pipeline = useSheetDisplayPipeline<Item>({
    items,
    useAutoSort,
    sortItems: (arr) => [...arr].sort((a, b) => a.name.localeCompare(b.name)),
    itemsPerPage,
    currentPage,
    totalPageCount,
    expandedItems,
    getChildrenFn,
  });

  return { pipeline, items, useAutoSort, itemsPerPage, totalPageCount, currentPage, expandedItems, getChildrenFn };
}

describe("useSheetDisplayPipeline", () => {
  describe("Rule: effectivePageCount 계산", () => {
    it("totalPageCount > 0이면 totalPageCount를 그대로 반환한다", () => {
      const { pipeline } = setup({ totalPageCount: 5 });
      expect(pipeline.effectivePageCount()).toBe(5);
    });

    it("totalPageCount가 0이고 itemsPerPage > 0이면 items 기반으로 계산한다", () => {
      const { pipeline } = setup({
        items: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }, { name: "E" }],
        itemsPerPage: 2,
      });
      expect(pipeline.effectivePageCount()).toBe(3); // ceil(5/2)
    });

    it("totalPageCount와 itemsPerPage 모두 0이면 0을 반환한다", () => {
      const { pipeline } = setup();
      expect(pipeline.effectivePageCount()).toBe(0);
    });
  });

  describe("Rule: 페이지네이션", () => {
    it("itemsPerPage에 따라 해당 페이지 아이템만 표시한다", () => {
      const { pipeline, currentPage } = setup({
        items: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }],
        itemsPerPage: 2,
      });
      expect(pipeline.displayItems().map((i) => i.name)).toEqual(["A", "B"]);

      currentPage.set(1);
      expect(pipeline.displayItems().map((i) => i.name)).toEqual(["C", "D"]);
    });
  });

  describe("Rule: 자동 정렬", () => {
    it("useAutoSort가 true이면 displayItems가 정렬된다", () => {
      const { pipeline } = setup({ useAutoSort: true });
      expect(pipeline.displayItems().map((i) => i.name)).toEqual(["Alice", "Bob", "Charlie"]);
    });

    it("useAutoSort가 false이면 원래 순서 유지", () => {
      const { pipeline } = setup({ useAutoSort: false });
      expect(pipeline.displayItems().map((i) => i.name)).toEqual(["Charlie", "Alice", "Bob"]);
    });
  });

  describe("Rule: 트리 확장", () => {
    it("getChildrenFn 설정 시 확장되지 않은 부모만 표시한다", () => {
      const parent: Item = { name: "Parent", children: [{ name: "Child" }] };
      const { pipeline } = setup({
        items: [parent, { name: "Sibling" }],
        getChildrenFn: (item) => item.children,
      });
      expect(pipeline.displayItems().map((i) => i.name)).toEqual(["Parent", "Sibling"]);
    });

    it("부모 확장 시 자식이 displayItems에 포함된다", () => {
      const child: Item = { name: "Child" };
      const parent: Item = { name: "Parent", children: [child] };
      const { pipeline, expandedItems } = setup({
        items: [parent, { name: "Sibling" }],
        getChildrenFn: (item) => item.children,
      });

      expandedItems.set([parent]);
      expect(pipeline.displayItems().map((i) => i.name)).toEqual(["Parent", "Child", "Sibling"]);
    });

    it("expanding.hasExpandable — 자식이 있는 아이템이 존재하면 true", () => {
      const parent: Item = { name: "Parent", children: [{ name: "Child" }] };
      const { pipeline } = setup({
        items: [parent],
        getChildrenFn: (item) => item.children,
      });
      expect(pipeline.expanding.hasExpandable()).toBe(true);
    });
  });
});
