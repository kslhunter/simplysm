import { describe, it, expect } from "vitest";
import { createRoot, createSignal, type Accessor } from "solid-js";
import { useDataSheetSorting } from "../../../../../src/components/data/sheet/hooks/useDataSheetSorting";
import type { SortingDef } from "../../../../../src/components/data/sheet/types";

interface TestItem {
  id: number;
  name: string;
  age: number;
}

const testData: TestItem[] = [
  { id: 1, name: "Alice", age: 30 },
  { id: 2, name: "Bob", age: 25 },
  { id: 3, name: "Charlie", age: 35 },
];

describe("useDataSheetSorting", () => {
  it("initializes with empty sorts", () => {
    createRoot(() => {
      const [sorts, setSorts] = createSignal<SortingDef[] | undefined>(undefined);
      const [onSortsChange, setOnSortsChange] = createSignal<((sorts: SortingDef[]) => void) | undefined>(
        undefined,
      );
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [autoSort] = createSignal<boolean | undefined>(true);

      const { sorts: resultSorts } = useDataSheetSorting({
        sorts,
        onSortsChange,
        items,
        autoSort,
      });

      expect(resultSorts()).toEqual([]);
    });
  });

  it("toggleSort adds ascending sort when no sort exists", () => {
    createRoot(() => {
      const [sorts, setSorts] = createSignal<SortingDef[] | undefined>(undefined);
      const [onSortsChange] = createSignal<((sorts: SortingDef[]) => void) | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [autoSort] = createSignal<boolean | undefined>(true);

      const { toggleSort, sorts: resultSorts } = useDataSheetSorting({
        sorts,
        onSortsChange,
        items,
        autoSort,
      });

      toggleSort("name", false);

      expect(resultSorts()).toEqual([{ key: "name", desc: false }]);
    });
  });

  it("toggleSort cycles asc -> desc -> remove", () => {
    createRoot(() => {
      const [sorts, setSorts] = createSignal<SortingDef[]>([]);
      const [onSortsChange] = createSignal<((sorts: SortingDef[]) => void) | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [autoSort] = createSignal<boolean | undefined>(true);

      const { toggleSort, sorts: resultSorts } = useDataSheetSorting({
        sorts,
        onSortsChange,
        items,
        autoSort,
      });

      // Step 1: none -> asc
      toggleSort("name", false);
      expect(resultSorts()).toEqual([{ key: "name", desc: false }]);

      // Step 2: asc -> desc
      toggleSort("name", false);
      expect(resultSorts()).toEqual([{ key: "name", desc: true }]);

      // Step 3: desc -> remove
      toggleSort("name", false);
      expect(resultSorts()).toEqual([]);
    });
  });

  it("toggleSort in multiple mode preserves other sorts", () => {
    createRoot(() => {
      const [sorts, setSorts] = createSignal<SortingDef[]>([{ key: "id", desc: false }]);
      const [onSortsChange] = createSignal<((sorts: SortingDef[]) => void) | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [autoSort] = createSignal<boolean | undefined>(true);

      const { toggleSort, sorts: resultSorts } = useDataSheetSorting({
        sorts,
        onSortsChange,
        items,
        autoSort,
      });

      // Add name sort in multiple mode
      toggleSort("name", true);
      expect(resultSorts()).toEqual([
        { key: "id", desc: false },
        { key: "name", desc: false },
      ]);

      // Toggle name to desc in multiple mode
      toggleSort("name", true);
      expect(resultSorts()).toEqual([
        { key: "id", desc: false },
        { key: "name", desc: true },
      ]);

      // Remove name in multiple mode
      toggleSort("name", true);
      expect(resultSorts()).toEqual([{ key: "id", desc: false }]);
    });
  });

  it("sortIndex returns undefined for single sort", () => {
    createRoot(() => {
      const [sorts, setSorts] = createSignal<SortingDef[]>([{ key: "name", desc: false }]);
      const [onSortsChange] = createSignal<((sorts: SortingDef[]) => void) | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [autoSort] = createSignal<boolean | undefined>(true);

      const { sortIndex } = useDataSheetSorting({
        sorts,
        onSortsChange,
        items,
        autoSort,
      });

      expect(sortIndex("name")).toBeUndefined();
    });
  });

  it("sortIndex returns 1-based index for multi sort", () => {
    createRoot(() => {
      const [sorts, setSorts] = createSignal<SortingDef[]>([
        { key: "id", desc: false },
        { key: "name", desc: false },
        { key: "age", desc: false },
      ]);
      const [onSortsChange] = createSignal<((sorts: SortingDef[]) => void) | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [autoSort] = createSignal<boolean | undefined>(true);

      const { sortIndex } = useDataSheetSorting({
        sorts,
        onSortsChange,
        items,
        autoSort,
      });

      expect(sortIndex("id")).toBe(1);
      expect(sortIndex("name")).toBe(2);
      expect(sortIndex("age")).toBe(3);
      expect(sortIndex("nonexistent")).toBeUndefined();
    });
  });

  it("sortedItems applies sorting when autoSort is true", () => {
    createRoot(() => {
      const [sorts, setSorts] = createSignal<SortingDef[]>([{ key: "age", desc: false }]);
      const [onSortsChange] = createSignal<((sorts: SortingDef[]) => void) | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [autoSort] = createSignal<boolean | undefined>(true);

      const { sortedItems } = useDataSheetSorting({
        sorts,
        onSortsChange,
        items,
        autoSort,
      });

      // Should be sorted by age ascending: 25, 30, 35
      const result = sortedItems();
      expect(result[0].age).toBe(25);
      expect(result[1].age).toBe(30);
      expect(result[2].age).toBe(35);
    });
  });

  it("sortedItems returns original items when autoSort is false", () => {
    createRoot(() => {
      const [sorts, setSorts] = createSignal<SortingDef[]>([{ key: "age", desc: false }]);
      const [onSortsChange] = createSignal<((sorts: SortingDef[]) => void) | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [autoSort] = createSignal<boolean | undefined>(false);

      const { sortedItems } = useDataSheetSorting({
        sorts,
        onSortsChange,
        items,
        autoSort,
      });

      // Should return original order despite sort definition
      const result = sortedItems();
      expect(result).toEqual(testData);
    });
  });

  it("sortedItems applies descending sort", () => {
    createRoot(() => {
      const [sorts, setSorts] = createSignal<SortingDef[]>([{ key: "age", desc: true }]);
      const [onSortsChange] = createSignal<((sorts: SortingDef[]) => void) | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [autoSort] = createSignal<boolean | undefined>(true);

      const { sortedItems } = useDataSheetSorting({
        sorts,
        onSortsChange,
        items,
        autoSort,
      });

      // Should be sorted by age descending: 35, 30, 25
      const result = sortedItems();
      expect(result[0].age).toBe(35);
      expect(result[1].age).toBe(30);
      expect(result[2].age).toBe(25);
    });
  });

  it("sortedItems applies multiple sorts in order", () => {
    createRoot(() => {
      const multiData: TestItem[] = [
        { id: 1, name: "Alice", age: 30 },
        { id: 2, name: "Bob", age: 25 },
        { id: 3, name: "Alice", age: 25 },
      ];

      const [sorts, setSorts] = createSignal<SortingDef[]>([
        { key: "name", desc: false },
        { key: "age", desc: false },
      ]);
      const [onSortsChange] = createSignal<((sorts: SortingDef[]) => void) | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(multiData);
      const [autoSort] = createSignal<boolean | undefined>(true);

      const { sortedItems } = useDataSheetSorting({
        sorts,
        onSortsChange,
        items,
        autoSort,
      });

      const result = sortedItems();
      // Primary sort by name, secondary by age
      // Alice(25), Alice(30), Bob(25)
      expect(result[0].name).toBe("Alice");
      expect(result[0].age).toBe(25);
      expect(result[1].name).toBe("Alice");
      expect(result[1].age).toBe(30);
      expect(result[2].name).toBe("Bob");
    });
  });

  it("handles undefined items", () => {
    createRoot(() => {
      const [sorts, setSorts] = createSignal<SortingDef[] | undefined>(undefined);
      const [onSortsChange] = createSignal<((sorts: SortingDef[]) => void) | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(undefined);
      const [autoSort] = createSignal<boolean | undefined>(true);

      const { sortedItems } = useDataSheetSorting({
        sorts,
        onSortsChange,
        items,
        autoSort,
      });

      expect(sortedItems()).toEqual([]);
    });
  });
});
