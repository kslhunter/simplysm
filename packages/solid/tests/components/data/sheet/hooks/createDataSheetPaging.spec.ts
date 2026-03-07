import { describe, it, expect } from "vitest";
import { createRoot, createSignal } from "solid-js";
import { createDataSheetPaging } from "../../../../../src/components/data/sheet/hooks/createDataSheetPaging";

interface TestItem {
  id: number;
  name: string;
}

const testData: TestItem[] = [
  { id: 1, name: "Item 1" },
  { id: 2, name: "Item 2" },
  { id: 3, name: "Item 3" },
  { id: 4, name: "Item 4" },
  { id: 5, name: "Item 5" },
  { id: 6, name: "Item 6" },
];

describe("createDataSheetPaging", () => {
  it("initializes with page 1", () => {
    createRoot(() => {
      const [page] = createSignal<number | undefined>(undefined);
      const [onPageChange] = createSignal<((page: number) => void) | undefined>(undefined);
      const [pageSize] = createSignal<number | undefined>(undefined);
      const [totalPageCount] = createSignal<number | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [sortedItems] = createSignal<TestItem[]>(testData);

      const { currentPage } = createDataSheetPaging({
        page,
        onPageChange,
        pageSize,
        totalPageCount,
        items,
        sortedItems,
      });

      expect(currentPage()).toBe(1);
    });
  });

  it("calculates pageCount from pageSize and items length", () => {
    createRoot(() => {
      const [page] = createSignal<number | undefined>(1);
      const [onPageChange] = createSignal<((page: number) => void) | undefined>(undefined);
      const [pageSize] = createSignal<number | undefined>(2);
      const [totalPageCount] = createSignal<number | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [sortedItems] = createSignal<TestItem[]>(testData);

      const { pageCount } = createDataSheetPaging({
        page,
        onPageChange,
        pageSize,
        totalPageCount,
        items,
        sortedItems,
      });

      // 6 items / 2 per page = 3 pages
      expect(pageCount()).toBe(3);
    });
  });

  it("returns totalPageCount when pageSize is not set", () => {
    createRoot(() => {
      const [page] = createSignal<number | undefined>(1);
      const [onPageChange] = createSignal<((page: number) => void) | undefined>(undefined);
      const [pageSize] = createSignal<number | undefined>(undefined);
      const [totalPageCount] = createSignal<number | undefined>(5);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [sortedItems] = createSignal<TestItem[]>(testData);

      const { pageCount } = createDataSheetPaging({
        page,
        onPageChange,
        pageSize,
        totalPageCount,
        items,
        sortedItems,
      });

      expect(pageCount()).toBe(5);
    });
  });

  it("returns 0 pageCount when items are empty", () => {
    createRoot(() => {
      const [page] = createSignal<number | undefined>(1);
      const [onPageChange] = createSignal<((page: number) => void) | undefined>(undefined);
      const [pageSize] = createSignal<number | undefined>(2);
      const [totalPageCount] = createSignal<number | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>([]);
      const [sortedItems] = createSignal<TestItem[]>([]);

      const { pageCount } = createDataSheetPaging({
        page,
        onPageChange,
        pageSize,
        totalPageCount,
        items,
        sortedItems,
      });

      expect(pageCount()).toBe(0);
    });
  });

  it("returns pageCount 0 when pageSize is 0", () => {
    createRoot(() => {
      const [page] = createSignal<number | undefined>(1);
      const [onPageChange] = createSignal<((page: number) => void) | undefined>(undefined);
      const [pageSize] = createSignal<number | undefined>(0);
      const [totalPageCount] = createSignal<number | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [sortedItems] = createSignal<TestItem[]>(testData);

      const { pageCount } = createDataSheetPaging({
        page,
        onPageChange,
        pageSize,
        totalPageCount,
        items,
        sortedItems,
      });

      expect(pageCount()).toBe(0);
    });
  });

  it("slices items correctly for current page", () => {
    createRoot(() => {
      const [page] = createSignal<number | undefined>(2);
      const [onPageChange] = createSignal<((page: number) => void) | undefined>(undefined);
      const [pageSize] = createSignal<number | undefined>(2);
      const [totalPageCount] = createSignal<number | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [sortedItems] = createSignal<TestItem[]>(testData);

      const { pagedItems } = createDataSheetPaging({
        page,
        onPageChange,
        pageSize,
        totalPageCount,
        items,
        sortedItems,
      });

      // Page 2 with 2 items per page should return items 3-4
      const result = pagedItems();
      expect(result).toEqual([
        { id: 3, name: "Item 3" },
        { id: 4, name: "Item 4" },
      ]);
    });
  });

  it("returns all sortedItems when pageSize is not set", () => {
    createRoot(() => {
      const [page] = createSignal<number | undefined>(1);
      const [onPageChange] = createSignal<((page: number) => void) | undefined>(undefined);
      const [pageSize] = createSignal<number | undefined>(undefined);
      const [totalPageCount] = createSignal<number | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [sortedItems] = createSignal<TestItem[]>(testData);

      const { pagedItems } = createDataSheetPaging({
        page,
        onPageChange,
        pageSize,
        totalPageCount,
        items,
        sortedItems,
      });

      expect(pagedItems()).toEqual(testData);
    });
  });

  it("returns all sortedItems when pageSize is 0", () => {
    createRoot(() => {
      const [page] = createSignal<number | undefined>(1);
      const [onPageChange] = createSignal<((page: number) => void) | undefined>(undefined);
      const [pageSize] = createSignal<number | undefined>(0);
      const [totalPageCount] = createSignal<number | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [sortedItems] = createSignal<TestItem[]>(testData);

      const { pagedItems } = createDataSheetPaging({
        page,
        onPageChange,
        pageSize,
        totalPageCount,
        items,
        sortedItems,
      });

      expect(pagedItems()).toEqual(testData);
    });
  });

  it("returns all sortedItems when items are empty", () => {
    createRoot(() => {
      const [page] = createSignal<number | undefined>(1);
      const [onPageChange] = createSignal<((page: number) => void) | undefined>(undefined);
      const [pageSize] = createSignal<number | undefined>(2);
      const [totalPageCount] = createSignal<number | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>([]);
      const [sortedItems] = createSignal<TestItem[]>([]);

      const { pagedItems } = createDataSheetPaging({
        page,
        onPageChange,
        pageSize,
        totalPageCount,
        items,
        sortedItems,
      });

      expect(pagedItems()).toEqual([]);
    });
  });

  it("clamps currentPage to 1 when negative", () => {
    createRoot(() => {
      const [page] = createSignal<number | undefined>(-5);
      const [onPageChange] = createSignal<((page: number) => void) | undefined>(undefined);
      const [pageSize] = createSignal<number | undefined>(2);
      const [totalPageCount] = createSignal<number | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [sortedItems] = createSignal<TestItem[]>(testData);

      const { pagedItems } = createDataSheetPaging({
        page,
        onPageChange,
        pageSize,
        totalPageCount,
        items,
        sortedItems,
      });

      // Should clamp to page 1, returning first 2 items
      const result = pagedItems();
      expect(result).toEqual([
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ]);
    });
  });

  it("clamps currentPage to 1 when 0", () => {
    createRoot(() => {
      const [page] = createSignal<number | undefined>(0);
      const [onPageChange] = createSignal<((page: number) => void) | undefined>(undefined);
      const [pageSize] = createSignal<number | undefined>(2);
      const [totalPageCount] = createSignal<number | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [sortedItems] = createSignal<TestItem[]>(testData);

      const { pagedItems } = createDataSheetPaging({
        page,
        onPageChange,
        pageSize,
        totalPageCount,
        items,
        sortedItems,
      });

      // Should clamp to page 1, returning first 2 items
      const result = pagedItems();
      expect(result).toEqual([
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ]);
    });
  });

  it("handles last page with fewer items than pageSize", () => {
    createRoot(() => {
      const [page] = createSignal<number | undefined>(3);
      const [onPageChange] = createSignal<((page: number) => void) | undefined>(undefined);
      const [pageSize] = createSignal<number | undefined>(2);
      const [totalPageCount] = createSignal<number | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [sortedItems] = createSignal<TestItem[]>(testData);

      const { pagedItems } = createDataSheetPaging({
        page,
        onPageChange,
        pageSize,
        totalPageCount,
        items,
        sortedItems,
      });

      // Page 3 with 2 items per page should return items 5-6
      const result = pagedItems();
      expect(result).toEqual([
        { id: 5, name: "Item 5" },
        { id: 6, name: "Item 6" },
      ]);
    });
  });

  it("can change page using setCurrentPage", () => {
    createRoot(() => {
      const [page, _setPage] = createSignal<number | undefined>(1);
      const [onPageChange] = createSignal<((page: number) => void) | undefined>(undefined);
      const [pageSize] = createSignal<number | undefined>(2);
      const [totalPageCount] = createSignal<number | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [sortedItems] = createSignal<TestItem[]>(testData);

      const { setCurrentPage, pagedItems } = createDataSheetPaging({
        page,
        onPageChange,
        pageSize,
        totalPageCount,
        items,
        sortedItems,
      });

      // Initial page
      expect(pagedItems()[0].id).toBe(1);

      // Change to page 2
      setCurrentPage(2);
      expect(pagedItems()[0].id).toBe(3);

      // Change to page 3
      setCurrentPage(3);
      expect(pagedItems()[0].id).toBe(5);
    });
  });

  it("supports functional setter for setCurrentPage", () => {
    createRoot(() => {
      const [page] = createSignal<number | undefined>(2);
      const [onPageChange] = createSignal<((page: number) => void) | undefined>(undefined);
      const [pageSize] = createSignal<number | undefined>(2);
      const [totalPageCount] = createSignal<number | undefined>(undefined);
      const [items] = createSignal<TestItem[] | undefined>(testData);
      const [sortedItems] = createSignal<TestItem[]>(testData);

      const { setCurrentPage, pagedItems } = createDataSheetPaging({
        page,
        onPageChange,
        pageSize,
        totalPageCount,
        items,
        sortedItems,
      });

      // Increment page using functional setter
      setCurrentPage((prev) => prev + 1);
      expect(pagedItems()[0].id).toBe(5);
    });
  });
});
