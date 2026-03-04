import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { useDataSheetSelection } from "../../../../src/components/data/sheet/hooks/useDataSheetSelection";
import type { FlatItem } from "../../../../src/components/data/sheet/types";

interface TestItem {
  id: string;
  name: string;
  selectable?: boolean;
  disabledReason?: string;
}

const testItems: TestItem[] = [
  { id: "a", name: "Item A" },
  { id: "b", name: "Item B" },
  { id: "c", name: "Item C", selectable: false, disabledReason: "Locked" },
  { id: "d", name: "Item D" },
];

function createTestFlatItems(items: TestItem[]): FlatItem<TestItem>[] {
  return items.map((item, index) => ({
    item,
    index,
    row: index,
    depth: 0,
    hasChildren: false,
  }));
}

describe("useDataSheetSelection", () => {
  it("should initialize with empty selected items by default", () => {
    createRoot(() => {
      const result = useDataSheetSelection({}, () => createTestFlatItems(testItems));

      expect(result.selectedItems()).toEqual([]);
    });
  });

  it("should initialize with provided selected items", () => {
    createRoot(() => {
      const selectedItems = [testItems[0]];
      const result = useDataSheetSelection(
        { selectedItems },
        () => createTestFlatItems(testItems),
      );

      expect(result.selectedItems()).toEqual(selectedItems);
    });
  });

  it("getItemSelectable should return true for selectable items", () => {
    createRoot(() => {
      const result = useDataSheetSelection({}, () => createTestFlatItems(testItems));

      expect(result.getItemSelectable(testItems[0])).toBe(true);
    });
  });

  it("getItemSelectable should return false when item is not selectable", () => {
    createRoot(() => {
      const isItemSelectable = (item: TestItem) => item.selectable !== false;
      const result = useDataSheetSelection(
        { isItemSelectable },
        () => createTestFlatItems(testItems),
      );

      expect(result.getItemSelectable(testItems[2])).toBe(false);
    });
  });

  it("getItemSelectable should return reason string when item is disabled", () => {
    createRoot(() => {
      const isItemSelectable = (item: TestItem) => item.disabledReason || true;
      const result = useDataSheetSelection(
        { isItemSelectable },
        () => createTestFlatItems(testItems),
      );

      expect(result.getItemSelectable(testItems[2])).toBe("Locked");
    });
  });

  it("toggleSelect should add item in multiple mode", () => {
    createRoot(() => {
      const result = useDataSheetSelection(
        { selectMode: "multiple" },
        () => createTestFlatItems(testItems),
      );

      result.toggleSelect(testItems[0]);

      expect(result.selectedItems()).toContain(testItems[0]);
    });
  });

  it("toggleSelect should remove item in multiple mode", () => {
    createRoot(() => {
      const result = useDataSheetSelection(
        { selectMode: "multiple", selectedItems: [testItems[0]] },
        () => createTestFlatItems(testItems),
      );

      result.toggleSelect(testItems[0]);

      expect(result.selectedItems()).not.toContain(testItems[0]);
    });
  });

  it("toggleSelect should replace selection in single mode", () => {
    createRoot(() => {
      const result = useDataSheetSelection(
        { selectMode: "single", selectedItems: [testItems[0]] },
        () => createTestFlatItems(testItems),
      );

      result.toggleSelect(testItems[1]);

      expect(result.selectedItems()).toEqual([testItems[1]]);
    });
  });

  it("toggleSelect should deselect in single mode when toggling selected item", () => {
    createRoot(() => {
      const result = useDataSheetSelection(
        { selectMode: "single", selectedItems: [testItems[0]] },
        () => createTestFlatItems(testItems),
      );

      result.toggleSelect(testItems[0]);

      expect(result.selectedItems()).toEqual([]);
    });
  });

  it("toggleSelect should not select non-selectable items", () => {
    createRoot(() => {
      const isItemSelectable = (item: TestItem) => item.selectable !== false;
      const result = useDataSheetSelection(
        { isItemSelectable },
        () => createTestFlatItems(testItems),
      );

      result.toggleSelect(testItems[2]);

      expect(result.selectedItems()).not.toContain(testItems[2]);
    });
  });

  it("toggleSelect should update lastClickAction to 'select' when selecting", () => {
    createRoot(() => {
      const result = useDataSheetSelection(
        { selectMode: "multiple" },
        () => createTestFlatItems(testItems),
      );

      result.toggleSelect(testItems[0]);

      expect(result.lastClickAction()).toBe("select");
    });
  });

  it("toggleSelect should update lastClickAction to 'deselect' when deselecting", () => {
    createRoot(() => {
      const result = useDataSheetSelection(
        { selectMode: "multiple", selectedItems: [testItems[0]] },
        () => createTestFlatItems(testItems),
      );

      result.toggleSelect(testItems[0]);

      expect(result.lastClickAction()).toBe("deselect");
    });
  });

  it("toggleSelectAll should select all selectable items", () => {
    createRoot(() => {
      const isItemSelectable = (item: TestItem) => item.selectable !== false;
      const result = useDataSheetSelection(
        { isItemSelectable },
        () => createTestFlatItems(testItems),
      );

      result.toggleSelectAll();

      const selectableItems = testItems.filter((i) => i.selectable !== false);
      expect(result.selectedItems()).toEqual(selectableItems);
    });
  });

  it("toggleSelectAll should deselect all items when all are selected", () => {
    createRoot(() => {
      const isItemSelectable = (item: TestItem) => item.selectable !== false;
      const selectableItems = testItems.filter((i) => i.selectable !== false);
      const result = useDataSheetSelection(
        { isItemSelectable, selectedItems: selectableItems },
        () => createTestFlatItems(testItems),
      );

      result.toggleSelectAll();

      expect(result.selectedItems()).toEqual([]);
    });
  });

  it("toggleSelectAll should only select selectable items", () => {
    createRoot(() => {
      const isItemSelectable = (item: TestItem) => item.selectable !== false;
      const result = useDataSheetSelection(
        { isItemSelectable },
        () => createTestFlatItems(testItems),
      );

      result.toggleSelectAll();

      expect(result.selectedItems()).not.toContain(testItems[2]);
    });
  });

  it("rangeSelect should do nothing if lastClickedRow is null", () => {
    createRoot(() => {
      const result = useDataSheetSelection(
        { selectMode: "multiple" },
        () => createTestFlatItems(testItems),
      );

      result.rangeSelect(2);

      expect(result.selectedItems()).toEqual([]);
    });
  });

  it("rangeSelect should select items in range when lastClickAction is 'select'", () => {
    createRoot(() => {
      const result = useDataSheetSelection(
        { selectMode: "multiple" },
        () => createTestFlatItems(testItems),
      );

      result.setLastClickedRow(0);
      result.setLastClickAction("select");
      result.rangeSelect(2);

      expect(result.selectedItems().length).toBe(3);
      expect(result.selectedItems()).toContain(testItems[0]);
      expect(result.selectedItems()).toContain(testItems[1]);
      expect(result.selectedItems()).toContain(testItems[2]);
    });
  });

  it("rangeSelect should select items in reverse range", () => {
    createRoot(() => {
      const result = useDataSheetSelection(
        { selectMode: "multiple" },
        () => createTestFlatItems(testItems),
      );

      result.setLastClickedRow(2);
      result.setLastClickAction("select");
      result.rangeSelect(0);

      expect(result.selectedItems().length).toBe(3);
      expect(result.selectedItems()).toContain(testItems[0]);
      expect(result.selectedItems()).toContain(testItems[1]);
      expect(result.selectedItems()).toContain(testItems[2]);
    });
  });

  it("rangeSelect should deselect items in range when lastClickAction is 'deselect'", () => {
    createRoot(() => {
      const result = useDataSheetSelection(
        { selectMode: "multiple", selectedItems: testItems },
        () => createTestFlatItems(testItems),
      );

      result.setLastClickedRow(0);
      result.setLastClickAction("deselect");
      result.rangeSelect(2);

      expect(result.selectedItems()).not.toContain(testItems[0]);
      expect(result.selectedItems()).not.toContain(testItems[1]);
      expect(result.selectedItems()).toContain(testItems[3]);
    });
  });

  it("rangeSelect should only select selectable items in range", () => {
    createRoot(() => {
      const isItemSelectable = (item: TestItem) => item.selectable !== false;
      const result = useDataSheetSelection(
        { selectMode: "multiple", isItemSelectable },
        () => createTestFlatItems(testItems),
      );

      result.setLastClickedRow(0);
      result.setLastClickAction("select");
      result.rangeSelect(3);

      expect(result.selectedItems()).not.toContain(testItems[2]);
      expect(result.selectedItems()).toContain(testItems[0]);
      expect(result.selectedItems()).toContain(testItems[1]);
      expect(result.selectedItems()).toContain(testItems[3]);
    });
  });

  it("should respect controlled mode with onChange callback", () => {
    createRoot(() => {
      let lastCalledWith: TestItem[] | null = null;
      const onSelectedItemsChange = (items: TestItem[]) => {
        lastCalledWith = items;
      };

      const result = useDataSheetSelection(
        { selectMode: "multiple", onSelectedItemsChange },
        () => createTestFlatItems(testItems),
      );

      result.toggleSelect(testItems[0]);

      expect(lastCalledWith).toEqual([testItems[0]]);
    });
  });

  it("should track last clicked row", () => {
    createRoot(() => {
      const result = useDataSheetSelection(
        { selectMode: "multiple" },
        () => createTestFlatItems(testItems),
      );

      result.setLastClickedRow(2);

      expect(result.lastClickedRow()).toBe(2);
    });
  });

  it("should default to 'select' action", () => {
    createRoot(() => {
      const result = useDataSheetSelection(
        { selectMode: "multiple" },
        () => createTestFlatItems(testItems),
      );

      expect(result.lastClickAction()).toBe("select");
    });
  });
});
