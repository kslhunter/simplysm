import { computed, type Signal, type WritableSignal } from "@angular/core";
import "@simplysm/core-common";

export interface ISortingDef {
  key: string;
  desc: boolean;
}

export function useSortingManager(options: {
  sorts: WritableSignal<ISortingDef[]>;
}): {
  defMap: Signal<Map<string, { indexText?: string; desc: boolean }>>;
  toggle(key: string, multiple: boolean): void;
  sort<T>(items: T[]): T[];
} {
  const defMap = computed(() => {
    const map = new Map<string, { indexText?: string; desc: boolean }>();
    const sorts = options.sorts();
    for (let i = 0; i < sorts.length; i++) {
      map.set(sorts[i].key, {
        indexText: sorts.length > 1 ? String(i + 1) : undefined,
        desc: sorts[i].desc,
      });
    }
    return map;
  });

  function toggle(key: string, multiple: boolean): void {
    options.sorts.update((prev) => {
      const existing = prev.find((s) => s.key === key);

      if (multiple) {
        if (existing == null) {
          return [...prev, { key, desc: false }];
        } else if (!existing.desc) {
          return prev.map((s) => (s.key === key ? { ...s, desc: true } : s));
        } else {
          return prev.filter((s) => s.key !== key);
        }
      } else {
        if (existing == null) {
          return [{ key, desc: false }];
        } else if (!existing.desc) {
          return [{ key, desc: true }];
        } else {
          return [];
        }
      }
    });
  }

  function sort<T>(items: T[]): T[] {
    const sorts = options.sorts();
    if (sorts.length === 0) return items;

    return [...items].sort((a, b) => {
      for (const s of sorts) {
        const aVal = (a as Record<string, unknown>)[s.key];
        const bVal = (b as Record<string, unknown>)[s.key];

        let cmp = 0;
        if (aVal == null && bVal == null) {
          cmp = 0;
        } else if (aVal == null) {
          cmp = -1;
        } else if (bVal == null) {
          cmp = 1;
        } else if (typeof aVal === "string" && typeof bVal === "string") {
          cmp = aVal.localeCompare(bVal);
        } else if (typeof aVal === "number" && typeof bVal === "number") {
          cmp = aVal - bVal;
        } else {
          cmp = String(aVal).localeCompare(String(bVal));
        }

        if (cmp !== 0) {
          return s.desc ? -cmp : cmp;
        }
      }
      return 0;
    });
  }

  return {
    defMap,
    toggle,
    sort,
  };
}
