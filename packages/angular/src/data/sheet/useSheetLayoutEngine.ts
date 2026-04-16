import { computed, type Signal } from "@angular/core";
import type { SdSheetColumn } from "./sd-sheet-column";
import type { SdSheetColumnDef, SdSheetConfig, SdSheetHeaderDef } from "./types";

export function useSheetLayoutEngine(options: {
  columnControls: Signal<readonly SdSheetColumn[]>;
  config: Signal<SdSheetConfig | undefined>;
}) {
  const columnDefs = computed((): SdSheetColumnDef[] => {
    const cfg = options.config();
    const cols = options.columnControls();

    return cols
      .map((col): SdSheetColumnDef => {
        const key = col.key();
        const cfgCol = cfg?.columnRecord[key];
        return {
          key,
          header: col.header(),
          headerStyle: col.headerStyle(),
          tooltip: col.tooltip(),
          width: cfgCol?.width ?? col.width(),
          fixed: cfgCol?.fixed ?? col.fixed(),
          hidden: cfgCol?.hidden ?? col.hidden(),
          collapse: col.collapse(),
          disableSorting: col.disableSorting(),
          disableResizing: col.disableResizing(),
          ordering: cfgCol?.ordering ?? col.ordering(),
        };
      })
      .filter((def) => !def.hidden)
      .orderBy((a) => a.ordering);
  });

  const hasSummary = computed((): boolean => {
    return options.columnControls().some((col) => col.summaryTplRef() != null);
  });

  const headerDepth = computed((): number => {
    let maxDepth = 1;
    for (const def of columnDefs()) {
      const header = def.header;
      if (Array.isArray(header)) {
        maxDepth = Math.max(maxDepth, header.length);
      }
    }
    return maxDepth;
  });

  const headerDefTable = computed((): SdSheetHeaderDef[][] => {
    const depth = headerDepth();
    const cols = columnDefs();
    const table: SdSheetHeaderDef[][] = [];

    for (let row = 0; row < depth; row++) {
      table.push([]);
    }

    // Track the header array of the first column in each cell span per row
    const spanStartHeaders: (string[])[] = new Array(depth);

    for (const colDef of cols) {
      const headers: string[] = Array.isArray(colDef.header)
        ? colDef.header
        : [colDef.header];

      for (let row = 0; row < depth; row++) {
        const isLastRow = row === depth - 1 || row === headers.length - 1;
        const text = row < headers.length ? headers[row] : headers[headers.length - 1];

        if (isLastRow && row < depth - 1) {
          const rowspan = depth - row;
          table[row].push({
            text,
            colspan: 1,
            rowspan,
            isLastRow: true,
            colDef,
          });
          spanStartHeaders[row] = headers;
          break;
        } else {
          const prevCells = table[row];
          const lastCell = prevCells.length > 0 ? prevCells[prevCells.length - 1] : undefined;

          let canMerge = false;
          if (lastCell != null && lastCell.text === text) {
            if (!lastCell.isLastRow && !isLastRow) {
              // Non-final rows: also check parent levels match
              canMerge = true;
              const prev = spanStartHeaders[row];
              for (let r = 0; r < row; r++) {
                const prevText = r < prev.length ? prev[r] : prev[prev.length - 1];
                const curText = r < headers.length ? headers[r] : headers[headers.length - 1];
                if (prevText !== curText) {
                  canMerge = false;
                  break;
                }
              }
            } else if (lastCell.isLastRow && isLastRow) {
              // Last-row cells: only merge if all parent levels also match
              canMerge = true;
              const prev = spanStartHeaders[row];
              for (let r = 0; r < row; r++) {
                const prevText = r < prev.length ? prev[r] : prev[prev.length - 1];
                const curText = r < headers.length ? headers[r] : headers[headers.length - 1];
                if (prevText !== curText) {
                  canMerge = false;
                  break;
                }
              }
            }
          }

          if (canMerge && lastCell != null) {
            lastCell.colspan += 1;
            spanStartHeaders[row] = headers;
          } else {
            table[row].push({
              text,
              colspan: 1,
              rowspan: 1,
              isLastRow,
              colDef: isLastRow ? colDef : undefined,
            });
            spanStartHeaders[row] = headers;
          }
        }
      }
    }

    return table;
  });

  const headerFeatureRowSpan = computed((): number => {
    return headerDepth();
  });

  return {
    columnDefs,
    hasSummary,
    headerDefTable,
    headerDepth,
    headerFeatureRowSpan,
  };
}
