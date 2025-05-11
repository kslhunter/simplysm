import { computed, ResourceRef, ResourceStatus, Signal } from "@angular/core";
import { ISdSheetConfig } from "./sd-sheet.control";
import { SdSheetColumnDirective } from "../../directives/sd-sheet-column.directive";

export function useSdSheetLayoutEngine<T>(binding: {
  columnControls: Signal<ReadonlyArray<SdSheetColumnDirective<T>>>;
  config: ResourceRef<ISdSheetConfig | undefined>;
}) {
  const columnDefs = computed<IColumnDef<T>[]>(() => {
    if (
      binding.config.status() !== ResourceStatus.Resolved &&
      binding.config.status() !== ResourceStatus.Local
    ) return [];

    const conf = binding.config.value();

    return binding.columnControls()
      .map(columnControl => {
        const colConf = conf?.columnRecord?.[columnControl.key()];
        return {
          control: columnControl,
          fixed: colConf?.fixed ?? columnControl.fixed(),
          width: colConf?.width ?? columnControl.width(),
          displayOrder: colConf?.displayOrder,
          hidden: colConf?.hidden ?? columnControl.hidden(),
          headerStyle: columnControl.headerStyle(),
        };
      })
      .filter(item => !item.hidden && !item.control.collapse())
      .orderBy(item => item.displayOrder ?? 999)
      .orderBy((item) => (item.fixed ? -1 : 0))
      .map(item => ({
        control: item.control,
        fixed: item.fixed,
        width: item.width,
        headerStyle: item.headerStyle,
      }));
  });

  const rawHeaderDefTable = computed<(IRawHeaderDef | undefined)[][]>(() => {
    const result: (IRawHeaderDef | undefined)[][] = [];
    const defs = columnDefs();

    for (let c = 0; c < defs.length; c++) {
      const colDef = defs[c];
      const headers = typeof colDef.control.header() === "string"
        ? [colDef.control.header() as string]
        : colDef.control.header() ?? [""];

      for (let r = 0; r < headers.length; r++) {
        result[r] ??= [];
        result[r][c] = {
          control: colDef.control,
          fixed: colDef.fixed,
          width: colDef.width,
          style: colDef.headerStyle,
          text: headers[r],
        };
      }
    }

    return result;
  });

  const headerDefTable = computed<(ISdSheetHeaderDef | undefined)[][]>(() => {
    const rawTable = rawHeaderDefTable();

    const isSame = (r: number, currC: number, prevC: number) => {
      const currDef = rawTable[r][currC];
      const prevDef = rawTable[r][prevC];
      return currDef?.text === prevDef?.text && currDef?.fixed === prevDef?.fixed;
    };

    const isSpanned = (r: number, currC: number, prevC: number) => {
      if (currC === 0) return false;
      for (let rr = 0; rr <= r; rr++) {
        if (!isSame(rr, currC, prevC)) return false;
      }
      return true;
    };

    const getRowspan = (r: number, c: number) => {
      let rowspan = 1;
      for (let rr = r + 1; rr < rawTable.length; rr++) {
        if (rawTable[rr][c] !== undefined) break;
        rowspan++;
      }
      return rowspan;
    };

    const getColspan = (r: number, c: number) => {
      let colspan = 1;
      for (let cc = c + 1; cc < rawTable[r].length; cc++) {
        if (!isSpanned(r, c, cc)) break;
        colspan++;
      }
      return colspan;
    };

    const result: (ISdSheetHeaderDef | undefined)[][] = [];
    for (let r = 0; r < rawTable.length; r++) {
      result[r] = [];
      for (let c = 0; c < rawTable[r].length; c++) {
        const rawDef = rawTable[r][c];
        if (!rawDef) continue;

        const rowspan = getRowspan(r, c);
        const isLastRow = r + rowspan === rawTable.length;

        if (!isLastRow && isSpanned(r, c, c - 1)) continue;

        result[r][c] = {
          ...rawDef,
          rowspan,
          colspan: isLastRow ? 1 : getColspan(r, c),
          isLastRow,
        };
      }
    }

    return result;
  });

  const hasSummary = computed<boolean>(() =>
    binding.columnControls().some(item => item.summaryTemplateRef()),
  );

  const headerFeatureRowSpan = computed<number>(() =>
    rawHeaderDefTable().length + (hasSummary() ? 1 : 0),
  );

  return {
    columnDefs,
    headerDefTable,
    hasSummary,
    headerFeatureRowSpan,
  };
}

export interface IColumnDef<T> {
  control: SdSheetColumnDirective<T>;
  fixed: boolean;
  width: string | undefined;
  headerStyle: string | undefined;
}

interface IRawHeaderDef {
  control: SdSheetColumnDirective<any>;

  fixed: boolean;
  width: string | undefined;
  style: string | undefined;

  text: string;
}

export interface ISdSheetHeaderDef extends IRawHeaderDef {
  colspan: number;
  rowspan: number;
  isLastRow: boolean;
}