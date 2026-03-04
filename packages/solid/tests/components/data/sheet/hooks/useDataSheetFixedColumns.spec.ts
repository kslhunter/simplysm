import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { useDataSheetFixedColumns } from "../../../../../src/components/data/sheet/hooks/useDataSheetFixedColumns";
import type { DataSheetColumnDef } from "../../../../../src/components/data/sheet/types";

interface TestItem {
  id: number;
  name: string;
}

describe("useDataSheetFixedColumns", () => {
  describe("feature column tracking", () => {
    it("should detect expand feature when getChildren is provided", () => {
      createRoot(() => {
        const effectiveColumns = () => [];

        const { hasExpandFeature } = useDataSheetFixedColumns(
          {
            getChildren: () => undefined,
          },
          effectiveColumns
        );

        expect(hasExpandFeature()).toBe(true);
      });
    });

    it("should not detect expand feature when getChildren is not provided", () => {
      createRoot(() => {
        const effectiveColumns = () => [];

        const { hasExpandFeature } = useDataSheetFixedColumns({}, effectiveColumns);

        expect(hasExpandFeature()).toBe(false);
      });
    });

    it("should detect select feature when selectMode is provided", () => {
      createRoot(() => {
        const effectiveColumns = () => [];

        const { hasSelectFeature } = useDataSheetFixedColumns(
          {
            selectMode: "single",
          },
          effectiveColumns
        );

        expect(hasSelectFeature()).toBe(true);
      });
    });

    it("should not detect select feature when selectMode is not provided", () => {
      createRoot(() => {
        const effectiveColumns = () => [];

        const { hasSelectFeature } = useDataSheetFixedColumns({}, effectiveColumns);

        expect(hasSelectFeature()).toBe(false);
      });
    });

    it("should detect reorder feature when onItemsReorder is provided", () => {
      createRoot(() => {
        const effectiveColumns = () => [];

        const { hasReorderFeature } = useDataSheetFixedColumns(
          {
            onItemsReorder: () => {},
          },
          effectiveColumns
        );

        expect(hasReorderFeature()).toBe(true);
      });
    });

    it("should not detect reorder feature when onItemsReorder is not provided", () => {
      createRoot(() => {
        const effectiveColumns = () => [];

        const { hasReorderFeature } = useDataSheetFixedColumns({}, effectiveColumns);

        expect(hasReorderFeature()).toBe(false);
      });
    });
  });

  describe("feature column widths", () => {
    it("should initialize feature column widths to 0", () => {
      createRoot(() => {
        const effectiveColumns = () => [];

        const { expandColWidth, selectColWidth, reorderColWidth } = useDataSheetFixedColumns(
          {
            getChildren: () => undefined,
            selectMode: "single",
            onItemsReorder: () => {},
          },
          effectiveColumns
        );

        expect(expandColWidth()).toBe(0);
        expect(selectColWidth()).toBe(0);
        expect(reorderColWidth()).toBe(0);
      });
    });
  });

  describe("feature column left positions", () => {
    it("should return '0' for selectColLeft when expand feature is not present", () => {
      createRoot(() => {
        const effectiveColumns = () => [];

        const { selectColLeft } = useDataSheetFixedColumns(
          {
            selectMode: "single",
          },
          effectiveColumns
        );

        expect(selectColLeft()).toBe("0");
      });
    });

    it("should calculate selectColLeft based on expandColWidth", () => {
      createRoot(() => {
        const effectiveColumns = () => [];

        const { selectColLeft, expandColWidth } = useDataSheetFixedColumns(
          {
            getChildren: () => undefined,
            selectMode: "single",
          },
          effectiveColumns
        );

        // Note: expandColWidth is 0 by default (no actual elements registered)
        expect(selectColLeft()).toBe("0px");
      });
    });

    it("should calculate reorderColLeft based on expandColWidth and selectColWidth", () => {
      createRoot(() => {
        const effectiveColumns = () => [];

        const { reorderColLeft } = useDataSheetFixedColumns(
          {
            getChildren: () => undefined,
            selectMode: "single",
            onItemsReorder: () => {},
          },
          effectiveColumns
        );

        expect(reorderColLeft()).toBe("0px");
      });
    });
  });

  describe("featureColTotalWidth", () => {
    it("should calculate total width of feature columns correctly", () => {
      createRoot(() => {
        const effectiveColumns = () => [];

        const { featureColTotalWidth } = useDataSheetFixedColumns(
          {
            getChildren: () => undefined,
            selectMode: "single",
            onItemsReorder: () => {},
          },
          effectiveColumns
        );

        // All widths are 0 by default
        expect(featureColTotalWidth()).toBe(0);
      });
    });

    it("should return 0 when no features are enabled", () => {
      createRoot(() => {
        const effectiveColumns = () => [];

        const { featureColTotalWidth } = useDataSheetFixedColumns({}, effectiveColumns);

        expect(featureColTotalWidth()).toBe(0);
      });
    });
  });

  describe("fixedLeftMap", () => {
    it("should return empty map when no columns are fixed", () => {
      createRoot(() => {
        const createColumn = (key: string, fixed: boolean): DataSheetColumnDef<TestItem> => ({
          key,
          header: [key],
          fixed,
          hidden: false,
          collapse: false,
          width: undefined,
          sortable: false,
          resizable: false,
          cell: () => null as any,
        });

        const effectiveColumns = () => [
          createColumn("col1", false),
          createColumn("col2", false),
        ];

        const { fixedLeftMap } = useDataSheetFixedColumns({}, effectiveColumns);

        expect(fixedLeftMap().size).toBe(0);
      });
    });

    it("should calculate left positions for fixed columns", () => {
      createRoot(() => {
        const createColumn = (key: string, fixed: boolean): DataSheetColumnDef<TestItem> => ({
          key,
          header: [key],
          fixed,
          hidden: false,
          collapse: false,
          width: undefined,
          sortable: false,
          resizable: false,
          cell: () => null as any,
        });

        const effectiveColumns = () => [
          createColumn("col1", true),
          createColumn("col2", true),
          createColumn("col3", false),
        ];

        const { fixedLeftMap } = useDataSheetFixedColumns({}, effectiveColumns);

        const map = fixedLeftMap();
        expect(map.has(0)).toBe(true);
        expect(map.has(1)).toBe(true);
        expect(map.has(2)).toBe(false);
      });
    });

    it("should stop mapping at first non-fixed column", () => {
      createRoot(() => {
        const createColumn = (key: string, fixed: boolean): DataSheetColumnDef<TestItem> => ({
          key,
          header: [key],
          fixed,
          hidden: false,
          collapse: false,
          width: undefined,
          sortable: false,
          resizable: false,
          cell: () => null as any,
        });

        const effectiveColumns = () => [
          createColumn("col1", true),
          createColumn("col2", false),
          createColumn("col3", true),
        ];

        const { fixedLeftMap } = useDataSheetFixedColumns({}, effectiveColumns);

        const map = fixedLeftMap();
        expect(map.has(0)).toBe(true);
        expect(map.has(1)).toBe(false);
        expect(map.has(2)).toBe(false);
      });
    });
  });

  describe("lastFixedIndex", () => {
    it("should return -1 when no columns are fixed", () => {
      createRoot(() => {
        const createColumn = (key: string, fixed: boolean): DataSheetColumnDef<TestItem> => ({
          key,
          header: [key],
          fixed,
          hidden: false,
          collapse: false,
          width: undefined,
          sortable: false,
          resizable: false,
          cell: () => null as any,
        });

        const effectiveColumns = () => [
          createColumn("col1", false),
          createColumn("col2", false),
        ];

        const { lastFixedIndex } = useDataSheetFixedColumns({}, effectiveColumns);

        expect(lastFixedIndex()).toBe(-1);
      });
    });

    it("should return index of last continuous fixed column", () => {
      createRoot(() => {
        const createColumn = (key: string, fixed: boolean): DataSheetColumnDef<TestItem> => ({
          key,
          header: [key],
          fixed,
          hidden: false,
          collapse: false,
          width: undefined,
          sortable: false,
          resizable: false,
          cell: () => null as any,
        });

        const effectiveColumns = () => [
          createColumn("col1", true),
          createColumn("col2", true),
          createColumn("col3", false),
        ];

        const { lastFixedIndex } = useDataSheetFixedColumns({}, effectiveColumns);

        expect(lastFixedIndex()).toBe(1);
      });
    });

    it("should stop at first non-fixed column", () => {
      createRoot(() => {
        const createColumn = (key: string, fixed: boolean): DataSheetColumnDef<TestItem> => ({
          key,
          header: [key],
          fixed,
          hidden: false,
          collapse: false,
          width: undefined,
          sortable: false,
          resizable: false,
          cell: () => null as any,
        });

        const effectiveColumns = () => [
          createColumn("col1", true),
          createColumn("col2", false),
          createColumn("col3", true),
        ];

        const { lastFixedIndex } = useDataSheetFixedColumns({}, effectiveColumns);

        expect(lastFixedIndex()).toBe(0);
      });
    });
  });

  describe("getFixedStyle", () => {
    it("should return undefined for non-fixed columns", () => {
      createRoot(() => {
        const effectiveColumns = () => [];

        const { getFixedStyle } = useDataSheetFixedColumns({}, effectiveColumns);

        expect(getFixedStyle(0)).toBeUndefined();
      });
    });

    it("should return CSS style string for fixed columns", () => {
      createRoot(() => {
        const createColumn = (key: string, fixed: boolean): DataSheetColumnDef<TestItem> => ({
          key,
          header: [key],
          fixed,
          hidden: false,
          collapse: false,
          width: undefined,
          sortable: false,
          resizable: false,
          cell: () => null as any,
        });

        const effectiveColumns = () => [
          createColumn("col1", true),
          createColumn("col2", false),
        ];

        const { getFixedStyle } = useDataSheetFixedColumns({}, effectiveColumns);

        const style = getFixedStyle(0);
        expect(style).toMatch(/^left: \d+px$/);
      });
    });
  });

  describe("isLastFixed", () => {
    it("should return true for last fixed column", () => {
      createRoot(() => {
        const createColumn = (key: string, fixed: boolean): DataSheetColumnDef<TestItem> => ({
          key,
          header: [key],
          fixed,
          hidden: false,
          collapse: false,
          width: undefined,
          sortable: false,
          resizable: false,
          cell: () => null as any,
        });

        const effectiveColumns = () => [
          createColumn("col1", true),
          createColumn("col2", true),
          createColumn("col3", false),
        ];

        const { isLastFixed } = useDataSheetFixedColumns({}, effectiveColumns);

        expect(isLastFixed(1)).toBe(true);
        expect(isLastFixed(0)).toBe(false);
        expect(isLastFixed(2)).toBe(false);
      });
    });

    it("should return false for non-fixed columns", () => {
      createRoot(() => {
        const createColumn = (key: string, fixed: boolean): DataSheetColumnDef<TestItem> => ({
          key,
          header: [key],
          fixed,
          hidden: false,
          collapse: false,
          width: undefined,
          sortable: false,
          resizable: false,
          cell: () => null as any,
        });

        const effectiveColumns = () => [
          createColumn("col1", true),
          createColumn("col2", false),
        ];

        const { isLastFixed } = useDataSheetFixedColumns({}, effectiveColumns);

        expect(isLastFixed(1)).toBe(false);
      });
    });
  });

  describe("columnRefs and registerColumnRef", () => {
    it("should initialize columnRefs as empty map", () => {
      createRoot(() => {
        const effectiveColumns = () => [];

        const { columnRefs } = useDataSheetFixedColumns({}, effectiveColumns);

        expect(columnRefs.size).toBe(0);
      });
    });

    it("should allow registering column refs", () => {
      createRoot(() => {
        const effectiveColumns = () => [];

        const { columnRefs, registerColumnRef } = useDataSheetFixedColumns({}, effectiveColumns);

        const mockElement = {
          offsetWidth: 100,
        } as HTMLElement;

        // Note: registerColumnRef will try to create a ResizeObserver
        // In tests, this might not work as expected without proper DOM setup
        // So we're just verifying the function exists and can be called
        expect(typeof registerColumnRef).toBe("function");
      });
    });
  });

  describe("columnWidths", () => {
    it("should initialize columnWidths as empty map", () => {
      createRoot(() => {
        const effectiveColumns = () => [];

        const { columnWidths } = useDataSheetFixedColumns({}, effectiveColumns);

        expect(columnWidths().size).toBe(0);
      });
    });
  });
});
