import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  inject,
  input,
  resource,
  signal,
  ViewEncapsulation,
} from "@angular/core";
import { SdDockContainerControl } from "../sd-dock-container.control";
import { SdDockControl } from "../sd-dock.control";
import { SdAnchorControl } from "../sd-anchor.control";
import { SdPaginationControl } from "../sd-pagination.control";
import { SdPaneControl } from "../sd-pane.control";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { SdIconControl } from "../sd-icon.control";
import { NgTemplateOutlet } from "@angular/common";
import { SdSheet2ColumnDirective } from "./sd-sheet2-column.directive";
import { SdSystemConfigProvider } from "../../providers/sd-system-config.provider";
import { SdEventsDirective } from "../../directives/sd-events.directive";
import { ISdResizeEvent } from "../../plugins/events/sd-resize.event-plugin";

@Component({
  selector: "sd-sheet2",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdDockContainerControl,
    SdDockControl,
    SdAnchorControl,
    SdPaginationControl,
    SdPaneControl,
    SdIconControl,
    NgTemplateOutlet,
    SdEventsDirective,
  ],
  templateUrl: "./sd-sheet2.control.html",
  styleUrl: "./sd-sheet2.control.scss",
})
export class SdSheet2Control<T> {
  protected icons = inject(SdAngularConfigProvider).icons;

  private _sdSystemConfig = inject(SdSystemConfigProvider);

  key = input.required<string>();
  items = input<T[]>([]);

  columnControls = contentChildren<SdSheet2ColumnDirective<T>>(SdSheet2ColumnDirective);

  config = resource({
    request: () => this.key(),
    loader: async ({ request }) => (
      await this._sdSystemConfig.getAsync(`sd-sheet2.${request}`)
    ) as ISdSheet2Config,
  });

  // column def

  columnDefs = computed(() => {
    const conf = this.config.value();

    return this.columnControls()
      .map(columnControl => {
        const colConf = conf?.columnRecord?.[columnControl.key()];
        return {
          control: columnControl,
          fixed: colConf?.fixed ?? columnControl.fixed(),
          width: colConf?.width ?? columnControl.width(),
          displayOrder: colConf?.displayOrder,
          hidden: colConf?.hidden ?? columnControl.hidden(),
        };
      });
  });

  displayColumnDefs = computed(() => {
    return this.columnDefs()
      .filter(item => !item.hidden && !item.control.collapse())
      .orderBy(item => item.displayOrder ?? 999)
      .orderBy((item) => (item.fixed ? -1 : 0))
      .map(item => ({
        control: item.control,
        fixed: item.fixed,
        width: item.width,
      }));
  });

  // header def

  headerDefTable = computed(() => {
    const result: (Omit<IHeaderDef<T>, "colspan" | "rowspan" | "isLastRow"> | undefined)[][] = [];

    const displayColumnDefs = this.displayColumnDefs();

    for (let c = 1; c <= displayColumnDefs.length; c++) {
      const columnDef = displayColumnDefs[c];

      const colHeader = columnDef.control.header();
      const headers = colHeader == null ? [""] : colHeader === "string" ? [colHeader] : colHeader;

      for (let r = 0; r < headers.length; r++) {
        result[r] ??= [];

        result[r][c] = {
          control: columnDef.control,
          width: columnDef.width,
          fixed: columnDef.fixed,
          text: headers[r],
        };
      }
    }

    return result;
  });

  // text는 물론 fixed가 다른경우 컬럼이 분리되야 하므로, fixed도 함께 체크
  private _getHeaderIsSame(r: number, c: number, cc: number) {
    const headerDefTable = this.headerDefTable();

    const currColHeaderDef = headerDefTable[r][c];
    const prevColHeaderDef = headerDefTable[r][cc];

    return currColHeaderDef?.text === prevColHeaderDef?.text
      && currColHeaderDef?.fixed === prevColHeaderDef?.fixed;
  }

  // 앞컬럼과 같으면, 컬럼 무시(앞컬럼의 colspan으로 합쳐져야하는 컬럼)
  // 앞ROW(parent)의 text도 함께 체크해야하므로, 모든 상위 row체크
  private _getHeaderIsSpanned(r: number, c: number, cc: number) {
    if (c === 1) return false;

    for (let rr = 0; rr <= r; rr++) {
      if (!this._getHeaderIsSame(rr, c, cc)) {
        return false;
      }
    }

    return true;
  }

  private _getHeaderRowspan(r: number, c: number) {
    const headerDefTable = this.headerDefTable();

    let result = 1;
    for (let rr = r + 1; rr < headerDefTable.length; rr++) {
      if (headerDefTable[rr][c] !== undefined) break;
      result++;
    }

    return result;
  }

  private _getHeaderColspan(r: number, c: number) {
    const headerDefTable = this.headerDefTable();

    // colspan

    let result = 1;
    for (let cc = c + 2; cc <= headerDefTable[r].length; cc++) {
      if (!this._getHeaderIsSpanned(r, c, cc)) break;
      result++;
    }
    return result;
  }

  displayHeaderDefTable = computed(() => {
    const result: (IHeaderDef<T> | undefined)[][] = [];

    const headerDefTable = this.headerDefTable();
    for (let r = 0; r < headerDefTable.length; r++) {
      result[r] = [];

      for (let c = 1; c <= headerDefTable[r].length; c++) {
        const headerDef = headerDefTable[r][c];
        if (!headerDef) continue;

        const rowspan = this._getHeaderRowspan(r, c);
        const isLastRow = r + rowspan === headerDefTable.length;

        if (!isLastRow && this._getHeaderIsSpanned(r, c, c - 1)) continue;
        const colspan = isLastRow ? 1 : this._getHeaderColspan(r, c);

        result[r][c] = {
          control: headerDef.control,
          width: headerDef.width,
          fixed: headerDef.fixed,
          text: headerDef.text,

          rowspan,
          isLastRow,
          colspan,
        };
      }
    }

    return result;
  });

  //-- fixed left

  fixedHeaderWidths = signal<number[]>([]);

  onHeaderCellResize(event: ISdResizeEvent, r: number, c: number) {
    const headerDefTable = this.displayHeaderDefTable();
    const headerDef = headerDefTable[r][c]!;
    if (!headerDef.isLastRow) return;

    if (headerDef.fixed) {
      if (!this.fixedHeaderWidths()[c]) return;
      this.fixedHeaderWidths.update(v => {
        const vr = [...v];
        delete vr[c];
        return vr;
      });

      return;
    }
    else {
      const el = event.target as HTMLTableCellElement;
      const offsetWidth = el.offsetWidth;

      if (this.fixedHeaderWidths()[c] === offsetWidth) return;

      this.fixedHeaderWidths.update(v => {
        const vr = [...v];
        vr[c] = offsetWidth;
        return vr;
      });
    }
  }

  fixedCellLefts = computed(() => {
    const result: number[] = [];
    let nextLeft: number = 0;
    for (let c = 0; c < this.fixedHeaderWidths().length; c++) {
      result[c] = nextLeft;
      nextLeft += this.fixedHeaderWidths()[c];
    }

    return result;
  });
}

export interface ISdSheet2Config {
  columnRecord: Record<string, IConfigColumn | undefined> | undefined;
}

interface IConfigColumn {
  fixed: boolean | undefined;
  width: string | undefined;
  displayOrder: number | undefined;
  hidden: boolean | undefined;
}

interface IHeaderDef<T> {
  control: SdSheet2ColumnDirective<T>;
  fixed: boolean;
  width: string | undefined;

  text: string | undefined;

  colspan: number;
  rowspan: number;
  isLastRow: boolean;
}