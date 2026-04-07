import { computed, type Signal, type WritableSignal } from "@angular/core";
import { useExpandingManager } from "../../../core/utils/useExpandingManager";

export function useSheetDisplayPipeline<T>(options: {
  items: Signal<T[]>;
  useAutoSort: Signal<boolean>;
  sortItems: (items: T[]) => T[];
  itemsPerPage: Signal<number>;
  currentPage: Signal<number>;
  totalPageCount: Signal<number>;
  expandedItems: WritableSignal<T[]>;
  getChildrenFn: Signal<((item: T, index: number) => T[] | undefined) | undefined>;
}) {
  const effectivePageCount = computed(() => {
    const total = options.totalPageCount();
    if (total > 0) return total;
    const perPage = options.itemsPerPage();
    if (perPage <= 0) return 0;
    return Math.ceil(options.items().length / perPage);
  });

  const sortedItems = computed(() => {
    const items = options.items();
    if (options.useAutoSort()) {
      return options.sortItems(items);
    }
    return items;
  });

  const pagedItems = computed(() => {
    const items = sortedItems();
    const perPage = options.itemsPerPage();
    if (perPage <= 0) return items;
    const page = options.currentPage();
    const start = page * perPage;
    return items.slice(start, start + perPage);
  });

  const expanding = useExpandingManager<T>({
    items: pagedItems,
    expandedItems: options.expandedItems,
    getChildrenFn: options.getChildrenFn,
    sort: (items) => {
      if (options.useAutoSort()) {
        return options.sortItems(items);
      }
      return items;
    },
  });

  const displayItems = computed(() => {
    const getChildrenFn = options.getChildrenFn();
    if (getChildrenFn != null) {
      return expanding.displayItems().filter((item) => expanding.isVisible(item));
    }
    return pagedItems();
  });

  return {
    effectivePageCount,
    displayItems,
    expanding,
  };
}
