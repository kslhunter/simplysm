import { computed, type Signal } from "@angular/core";
import type { SdSheetColumnDef } from "./types";

export function useSheetColumnFixing(options: {
  columnDefs: Signal<SdSheetColumnDef[]>;
  cellWidths: Signal<Map<number, number>>;
  hasExpandable: Signal<boolean>;
}) {
  const fixedLeftMap = computed((): Map<number, number> => {
    const widths = options.cellWidths();
    const fixedIndices: number[] = [];

    if (options.hasExpandable()) {
      fixedIndices.push(-2, -1);
    } else {
      fixedIndices.push(-1);
    }

    const defs = options.columnDefs();
    for (let i = 0; i < defs.length; i++) {
      if (defs[i].fixed && !defs[i].collapse) {
        fixedIndices.push(i);
      }
    }

    const map = new Map<number, number>();
    let accLeft = 0;
    for (const idx of fixedIndices) {
      map.set(idx, accLeft);
      accLeft += widths.get(idx) ?? 0;
    }
    return map;
  });

  return { fixedLeftMap };
}
