import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { useDataSheetExpansion } from "../../../../../src/components/data/sheet/hooks/useDataSheetExpansion";

interface TestNode {
  id: string;
  children?: TestNode[];
}

const flatListData: TestNode[] = [
  { id: "a" },
  { id: "b" },
  { id: "c" },
];

const treeData: TestNode[] = [
  {
    id: "root1",
    children: [
      { id: "child1-1" },
      { id: "child1-2", children: [{ id: "child1-2-1" }] },
    ],
  },
  {
    id: "root2",
    children: [{ id: "child2-1" }],
  },
  { id: "root3" },
];

function itemChildren(item: TestNode, _index: number): TestNode[] | undefined {
  return item.children;
}

describe("useDataSheetExpansion", () => {
  it("should initialize with empty expanded items by default", () => {
    createRoot(() => {
      const createIndexMap = () => new Map<TestNode, number>();
      const result = useDataSheetExpansion(
        { itemChildren },
        () => treeData,
        createIndexMap,
      );

      expect(result.expandedItems()).toEqual([]);
    });
  });

  it("should initialize with provided expanded items", () => {
    createRoot(() => {
      const createIndexMap = () => new Map<TestNode, number>();
      const expandedItems = [treeData[0]];
      const result = useDataSheetExpansion(
        { expandedItems, itemChildren },
        () => treeData,
        createIndexMap,
      );

      expect(result.expandedItems()).toEqual(expandedItems);
    });
  });

  it("toggleExpand should add item when not expanded", () => {
    createRoot(() => {
      const createIndexMap = () => new Map<TestNode, number>();
      const result = useDataSheetExpansion(
        { itemChildren },
        () => treeData,
        createIndexMap,
      );

      const item = treeData[0];
      result.toggleExpand(item);

      expect(result.expandedItems()).toContain(item);
    });
  });

  it("toggleExpand should remove item when already expanded", () => {
    createRoot(() => {
      const createIndexMap = () => new Map<TestNode, number>();
      const expandedItems = [treeData[0]];
      const result = useDataSheetExpansion(
        { expandedItems: [...expandedItems], itemChildren },
        () => treeData,
        createIndexMap,
      );

      result.toggleExpand(treeData[0]);

      expect(result.expandedItems()).not.toContain(treeData[0]);
    });
  });

  it("flatItems should include children when item is expanded", () => {
    createRoot(() => {
      const createIndexMap = () => new Map<TestNode, number>();
      const result = useDataSheetExpansion(
        { expandedItems: [treeData[0]], itemChildren },
        () => treeData,
        createIndexMap,
      );

      const items = result.flatItems();

      expect(items.length).toBeGreaterThan(treeData.length);
      const itemIds = items.map((f) => f.item.id);
      expect(itemIds).toContain("root1");
      expect(itemIds).toContain("child1-1");
      expect(itemIds).toContain("child1-2");
    });
  });

  it("flatItems should not include children when item is not expanded", () => {
    createRoot(() => {
      const createIndexMap = () => new Map<TestNode, number>();
      const result = useDataSheetExpansion(
        { itemChildren },
        () => treeData,
        createIndexMap,
      );

      const items = result.flatItems();

      expect(items.length).toBe(treeData.length);
      const itemIds = items.map((f) => f.item.id);
      expect(itemIds).toEqual(["root1", "root2", "root3"]);
    });
  });

  it("isAllExpanded should be false when no items are expanded", () => {
    createRoot(() => {
      const createIndexMap = () => new Map<TestNode, number>();
      const result = useDataSheetExpansion(
        { itemChildren },
        () => treeData,
        createIndexMap,
      );

      expect(result.isAllExpanded()).toBe(false);
    });
  });

  it("isAllExpanded should be true when all expandable items are expanded", () => {
    createRoot(() => {
      const createIndexMap = () => new Map<TestNode, number>();
      // collectAllExpandable will find root1, child1-2, and root2 as expandable
      const allExpandable = [treeData[0], treeData[0].children![1], treeData[1]];
      const result = useDataSheetExpansion(
        { expandedItems: allExpandable, itemChildren },
        () => treeData,
        createIndexMap,
      );

      expect(result.isAllExpanded()).toBe(true);
    });
  });

  it("isAllExpanded should be false when only some items are expanded", () => {
    createRoot(() => {
      const createIndexMap = () => new Map<TestNode, number>();
      const result = useDataSheetExpansion(
        { expandedItems: [treeData[0]], itemChildren },
        () => treeData,
        createIndexMap,
      );

      expect(result.isAllExpanded()).toBe(false);
    });
  });

  it("toggleExpandAll should expand all items when not all are expanded", () => {
    createRoot(() => {
      const createIndexMap = () => new Map<TestNode, number>();
      const result = useDataSheetExpansion(
        { itemChildren },
        () => treeData,
        createIndexMap,
      );

      result.toggleExpandAll();

      expect(result.isAllExpanded()).toBe(true);
      expect(result.expandedItems().length).toBeGreaterThan(0);
    });
  });

  it("toggleExpandAll should collapse all items when all are expanded", () => {
    createRoot(() => {
      const createIndexMap = () => new Map<TestNode, number>();
      // collectAllExpandable will find root1, child1-2, and root2 as expandable
      const allExpandable = [treeData[0], treeData[0].children![1], treeData[1]];
      const result = useDataSheetExpansion(
        { expandedItems: allExpandable, itemChildren },
        () => treeData,
        createIndexMap,
      );

      result.toggleExpandAll();

      expect(result.expandedItems()).toEqual([]);
      expect(result.isAllExpanded()).toBe(false);
    });
  });

  it("flatItems should have correct depth values", () => {
    createRoot(() => {
      const createIndexMap = () => new Map<TestNode, number>();
      const result = useDataSheetExpansion(
        { expandedItems: [treeData[0]], itemChildren },
        () => treeData,
        createIndexMap,
      );

      const items = result.flatItems();

      const root = items.find((f) => f.item.id === "root1");
      const child = items.find((f) => f.item.id === "child1-1");

      expect(root?.depth).toBe(0);
      expect(child?.depth).toBe(1);
    });
  });

  it("should work with flat list (no children)", () => {
    createRoot(() => {
      const createIndexMap = () => new Map<TestNode, number>();
      const result = useDataSheetExpansion({}, () => flatListData, createIndexMap);

      expect(result.flatItems().length).toBe(flatListData.length);
      expect(result.isAllExpanded()).toBe(false);
    });
  });

  it("should respect controlled mode with onChange callback", () => {
    createRoot(() => {
      const createIndexMap = () => new Map<TestNode, number>();
      let lastCalledWith: TestNode[] | null = null;
      const onExpandedItemsChange = (items: TestNode[]) => {
        lastCalledWith = items;
      };

      const result = useDataSheetExpansion(
        { itemChildren, onExpandedItemsChange },
        () => treeData,
        createIndexMap,
      );

      result.toggleExpand(treeData[0]);

      expect(lastCalledWith).toEqual([treeData[0]]);
    });
  });
});
