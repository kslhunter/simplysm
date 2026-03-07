import { createMemo, type Accessor } from "solid-js";
import { createControllableSignal } from "../../../../hooks/createControllableSignal";
import { applySorting } from "../DataSheet.utils";
import type { SortingDef } from "../DataSheet.types";

export interface UseDataSheetSortingOptions<TItem> {
  sorts: Accessor<SortingDef[] | undefined>;
  onSortsChange: Accessor<((sorts: SortingDef[]) => void) | undefined>;
  items: Accessor<TItem[] | undefined>;
  autoSort: Accessor<boolean | undefined>;
}

export interface UseDataSheetSortingReturn<TItem> {
  sorts: Accessor<SortingDef[]>;
  setSorts: (newValue: SortingDef[] | ((prev: SortingDef[]) => SortingDef[])) => SortingDef[];
  toggleSort: (key: string, multiple: boolean) => void;
  sortIndex: (key: string) => number | undefined;
  sortedItems: Accessor<TItem[]>;
}

export function useDataSheetSorting<TItem>(
  options: UseDataSheetSortingOptions<TItem>,
): UseDataSheetSortingReturn<TItem> {
  const [sorts, setSorts] = createControllableSignal({
    value: () => options.sorts() ?? [],
    onChange: () => options.onSortsChange(),
  });

  function toggleSort(key: string, multiple: boolean): void {
    const current = sorts();
    const existing = current.find((s) => s.key === key);

    if (existing) {
      if (!existing.desc) {
        // asc → desc
        const updated = current.map((s) => (s.key === key ? { ...s, desc: true } : s));
        setSorts(multiple ? updated : [{ key, desc: true }]);
      } else {
        // desc → remove
        const updated = current.filter((s) => s.key !== key);
        setSorts(multiple ? updated : []);
      }
    } else {
      // none → add asc
      const newSort: SortingDef = { key, desc: false };
      setSorts(multiple ? [...current, newSort] : [newSort]);
    }
  }

  function sortIndex(key: string): number | undefined {
    if (sorts().length <= 1) return undefined;
    const idx = sorts().findIndex((s) => s.key === key);
    return idx >= 0 ? idx + 1 : undefined;
  }

  const sortedItems = createMemo(() => {
    if (!options.autoSort()) return options.items() ?? [];
    return applySorting(options.items() ?? [], sorts());
  });

  return {
    sorts,
    setSorts,
    toggleSort,
    sortIndex,
    sortedItems,
  };
}
