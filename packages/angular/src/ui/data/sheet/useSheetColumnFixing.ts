import { computed, type Signal } from "@angular/core";
import type { ISdSheetColumnDef } from "./types";

export function useSheetColumnFixing(options: {
  columnDefs: Signal<ISdSheetColumnDef[]>;
}) {
  const fixedLeftMap = computed((): Map<string, number> => {
    const map = new Map<string, number>();
    let accumulatedLeft = 0;

    for (const colDef of options.columnDefs()) {
      if (!colDef.fixed) continue;
      if (colDef.collapse) continue;

      map.set(colDef.key, accumulatedLeft);

      const width = colDef.width;
      if (width != null && width.endsWith("px")) {
        const px = parseFloat(width);
        if (!Number.isNaN(px)) {
          accumulatedLeft += px;
        }
      }
    }

    return map;
  });

  const hasFixed = computed((): boolean => {
    return fixedLeftMap().size > 0;
  });

  return {
    fixedLeftMap,
    hasFixed,
  };
}
