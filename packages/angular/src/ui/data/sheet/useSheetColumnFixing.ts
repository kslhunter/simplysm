import { computed, type Signal } from "@angular/core";
import type { ISdSheetColumnDef } from "./types";

/**
 * Fixed column의 left offset을 계산한다.
 *
 * **주의:** fixed column의 `width`는 반드시 px 단위여야 정확한 offset이 계산된다.
 * em, rem, % 등 non-px 단위의 width는 offset 누적에 반영되지 않는다 (0으로 처리).
 */
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
