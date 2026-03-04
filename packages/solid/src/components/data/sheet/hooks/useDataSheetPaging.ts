import { createMemo, type Accessor } from "solid-js";
import { createControllableSignal } from "../../../hooks/createControllableSignal";

export interface UseDataSheetPagingOptions<TItem> {
  page: Accessor<number | undefined>;
  onPageChange: Accessor<((page: number) => void) | undefined>;
  itemsPerPage: Accessor<number | undefined>;
  totalPageCount: Accessor<number | undefined>;
  items: Accessor<TItem[] | undefined>;
  sortedItems: Accessor<TItem[]>;
}

export interface UseDataSheetPagingReturn<TItem> {
  currentPage: Accessor<number>;
  setCurrentPage: (newValue: number | ((prev: number) => number)) => number;
  pageCount: Accessor<number>;
  pagedItems: Accessor<TItem[]>;
}

export function useDataSheetPaging<TItem>(
  options: UseDataSheetPagingOptions<TItem>,
): UseDataSheetPagingReturn<TItem> {
  const [currentPage, setCurrentPage] = createControllableSignal({
    value: () => options.page() ?? 1,
    onChange: () => options.onPageChange(),
  });

  const pageCount = createMemo(() => {
    const ipp = options.itemsPerPage();
    if (ipp != null && ipp !== 0 && (options.items() ?? []).length > 0) {
      return Math.ceil((options.items() ?? []).length / ipp);
    }
    return options.totalPageCount() ?? 0;
  });

  const pagedItems = createMemo(() => {
    const ipp = options.itemsPerPage();
    if (ipp == null || ipp === 0) return options.sortedItems();
    if ((options.items() ?? []).length <= 0) return options.sortedItems();

    const page = Math.max(1, currentPage());
    return options.sortedItems().slice((page - 1) * ipp, page * ipp);
  });

  return {
    currentPage,
    setCurrentPage,
    pageCount,
    pagedItems,
  };
}
