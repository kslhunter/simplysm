import type { ResourceRef, Signal } from "@angular/core";
import { $computed } from "../../../../core/utils/bindings/$computed";
import type { SdSheetColumnDirective } from "../directives/sd-sheet-column.directive";
import type { ISdSheetConfig } from "../types/ISdSheetConfig";
import type { ISdSheetColumnDef } from "../types/ISdSheetColumnDef";
import type { ISdSheetHeaderDef } from "../types/ISdSheetHeaderDef";

export class SdSheetLayoutEngine<T> {
  constructor(
    private readonly _options: {
      columnControls: Signal<ReadonlyArray<SdSheetColumnDirective<T>>>;
      config: ResourceRef<ISdSheetConfig | undefined>;
    },
  ) {}

  columnDefs = $computed<ISdSheetColumnDef<T>[]>(() => {
    if (this._options.config.status() !== "resolved" && this._options.config.status() !== "local")
      return [];

    const conf = this._options.config.value();

    return this._options
      .columnControls()
      .map((columnControl) => {
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
      .filter((item) => !item.hidden && !item.control.collapse())
      .orderBy((item) => item.displayOrder ?? 999)
      .orderBy((item) => (item.fixed ? -1 : 0))
      .map((item) => ({
        control: item.control,
        fixed: item.fixed,
        width: item.width,
        headerStyle: item.headerStyle,
      }));
  });

  private readonly _rawHeaderDefTable = $computed<(IRawHeaderDef | undefined)[][]>(() => {
    const result: (IRawHeaderDef | undefined)[][] = [];
    const defs = this.columnDefs();

    for (let c = 0; c < defs.length; c++) {
      const colDef = defs[c];
      const headers =
        typeof colDef.control.header() === "string"
          ? [colDef.control.header() as string]
          : (colDef.control.header() ?? [""]);

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

  headerDefTable = $computed<(ISdSheetHeaderDef | undefined)[][]>(() => {
    const rawTable = this._rawHeaderDefTable();

    const isSame = (r: number, currC: number, targetC: number) => {
      const currDef = rawTable[r][currC];
      const nextDef = rawTable[r][targetC];
      return currDef?.text === nextDef?.text && currDef?.fixed === nextDef?.fixed;
    };

    const isSpanned = (r: number, currC: number, targetC: number) => {
      if (currC < 0 || targetC < 0) return false;
      for (let rr = 0; rr <= r; rr++) {
        if (!isSame(rr, currC, targetC)) return false;
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

  hasSummary = $computed<boolean>(() =>
    this._options.columnControls().some((item) => item.summaryTplRef()),
  );

  headerFeatureRowSpan = $computed<number>(
    () => this._rawHeaderDefTable().length + (this.hasSummary() ? 1 : 0),
  );
}

interface IRawHeaderDef {
  control: SdSheetColumnDirective<any>;

  fixed: boolean;
  width: string | undefined;
  style: string | undefined;

  text: string;
}
