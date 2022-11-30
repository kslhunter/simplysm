import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  DoCheck,
  forwardRef,
  Input,
  IterableDiffer,
  IterableDiffers,
  QueryList,
  TemplateRef
} from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { SdSheet2ColumnControl } from "./SdSheet2ColumnControl";

@Component({
  selector: "sd-sheet2",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-busy-container>
      <sd-dock-container>
        <sd-dock>
          <sd-flex direction="row" gap="sm">
            <sd-anchor class="_cog-btn">
              <fa-icon [icon]="icons.fasCog | async" [fixedWidth]="true"></fa-icon>
            </sd-anchor>
            <sd-pagination [page]="1" [pageLength]="30"></sd-pagination>
          </sd-flex>
        </sd-dock>

        <sd-pane class="_sheet-container">
          <table class="_sheet">
            <thead>
            <ng-container *ngFor="let headerDefRow of headerDefTable; let r = index">
              <tr>
                <th class="_fixed _feature-cell" *ngIf="r === 0"
                    [attr.rowspan]="headerDefTable.length"></th>
                <ng-container *ngFor="let headerDefCell of headerDefRow">
                  <th *ngIf="!headerDefCell.isSpanned"
                      [attr.colspan]="headerDefCell.colspan"
                      [attr.rowspan]="headerDefCell.rowspan"
                      [class._fixed]="headerDefCell.fixed">
                    <div class="_contents">
                      <ng-container *ngIf="!headerDefCell.templateRef">
                        <div class="_text">{{ headerDefCell.text }}</div>
                      </ng-container>
                      <ng-container *ngIf="headerDefCell.templateRef">
                        <ng-template [ngTemplateOutlet]="headerDefCell.templateRef"></ng-template>
                      </ng-container>
                    </div>
                  </th>
                </ng-container>
              </tr>
            </ng-container>
            </thead>
            <tbody>
            <ng-container *ngFor="let itemDef of itemDefs;">
              <tr>
                <td class="_fixed _feature-cell"></td>
                <ng-container *ngFor="let columnDef of columnDefs;">
                  <td>
                    <div class="_contents">
                      <ng-template [ngTemplateOutlet]="columnDef.cellTemplateRef"
                                   [ngTemplateOutletContext]="{item: itemDef.item }"></ng-template>
                    </div>
                  </td>
                </ng-container>
              </tr>
            </ng-container>
            </tbody>
          </table>
        </sd-pane>
      </sd-dock-container>
    </sd-busy-container>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    $z-index-fixed: 1;
    $z-index-head: 2;
    $z-index-head-fixed: 3;
    $z-index-focus-row-indicator: 4;
    $z-index-row-select-indicator: 5;
    $z-index-focus-cell-indicator: 6;

    $border-color: var(--theme-color-blue-grey-lightest);
    $border-color-dark: var(--theme-color-grey-light);

    :host {
      ::ng-deep > sd-busy-container {
        border-radius: var(--border-radius-default);

        > ._screen {
          border-radius: var(--border-radius-default);
        }

        > sd-dock-container > ._content {
          border: 1px solid $border-color-dark;
          border-radius: var(--border-radius-default);

          > sd-dock > ._content {
            background: white;
            border-top-left-radius: var(--border-radius-default);
            border-top-right-radius: var(--border-radius-default);
            border-bottom: 1px solid $border-color-dark;

            ._cog-btn {
              padding: var(--gap-xs) var(--gap-sm);
              margin: var(--gap-xs);
              border-radius: var(--border-radius-default);

              &:hover {
                background: var(--theme-color-grey-lightest);
              }
            }
          }
        }

        ._sheet-container {
          background: var(--background-color);
          border-radius: var(--border-radius-default);

          > ._sheet {
            border-spacing: 0;
            table-layout: fixed;
            border-right: 1px solid $border-color-dark;
            border-bottom: 1px solid $border-color-dark;
            margin-right: 2px;
            margin-bottom: 2px;

            > * > tr > * {
              border-right: 1px solid $border-color;
              border-bottom: 1px solid $border-color;
              white-space: nowrap;
              overflow: hidden;
              padding: 0;

              &._feature-cell {
                background: var(--theme-color-grey-lightest);
                min-width: 2em;
              }

              &._fixed:has(+:not(._fixed)) {
                border-right: 1px solid $border-color-dark;
              }
            }

            > thead {
              z-index: $z-index-head;

              > tr > th {
                position: relative;
                background: var(--theme-color-grey-lightest);
                vertical-align: bottom;

                &._fixed {
                  z-index: $z-index-head-fixed;
                }

                &._last-depth {
                  border-bottom: 1px solid $border-color-dark;
                }

                &._feature-cell {
                  border-bottom: 1px solid $border-color-dark;
                }

                > ._contents {
                  > ._text {
                    padding: var(--sd-sheet-padding-v) var(--sd-sheet-padding-h);
                  }

                  &._clickable {
                    cursor: pointer;

                    &:hover {
                      text-decoration: underline;
                    }
                  }

                  > ._sort-icon {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    display: inline-block;
                    padding: var(--gap-xs);
                    background-color: var(--theme-color-grey-lightest);
                  }
                }

                > ._resizer {
                  position: absolute;
                  top: 0;
                  right: 0;
                  bottom: 0;
                  width: 2px;
                  cursor: ew-resize;
                }
              }

              > tr._summary-row > th {
                background: var(--theme-color-warning-lightest);
                text-align: left;
              }

              > tr:last-child > th {
                border-bottom: 1px solid $border-color-dark;
              }
            }

            > tbody > tr > td {
              background: white;

              &._fixed {
                z-index: $z-index-fixed;
              }

              > ._contents > ._depth-indicator {
                display: inline-block;
                margin-top: .4em;
                width: .5em;
                height: .5em;
                border-left: 1px solid var(--text-brightness-default);
                border-bottom: 1px solid var(--text-brightness-default);
                vertical-align: top;
              }
            }
          }

          > ._focus-cell-indicator {
            display: none;
            position: absolute;
            border: 2px solid var(--theme-color-primary-default);
            pointer-events: none;

            z-index: $z-index-focus-cell-indicator;
          }

          > ._focus-row-indicator {
            display: none;
            position: absolute;
            pointer-events: none;
            background: var(--theme-color-grey-default);
            opacity: .1;

            z-index: $z-index-focus-row-indicator;
          }

          > ._row-select-indicator {
            position: absolute;
            pointer-events: none;
            background: var(--theme-color-primary-default);
            opacity: .1;

            z-index: $z-index-row-select-indicator;
          }
        }
      }

      &[sd-inset=true] {
        ::ng-deep > sd-busy-container > sd-dock-container > ._content {
          border: none;
          border-radius: 0;
        }
      }
    }
  `]
})
export class SdSheet2Control<T> implements DoCheck {
  public icons = {
    fasCog: import("@fortawesome/pro-solid-svg-icons/faCog").then(m => m.faCog)
  };

  @Input()
  @SdInputValidate({
    type: Array,
    notnull: true
  })
  public items: T[] = [];

  public trackByFn = (index: number, item: T): any => item;

  @ContentChildren(forwardRef(() => SdSheet2ColumnControl))
  public columnControls?: QueryList<SdSheet2ColumnControl<T>>;

  public headerDefTable: IHeaderDef[][] = [];

  private readonly _itemsDiffer: IterableDiffer<T>;
  private _prevColumnControls?: SdSheet2ColumnControl<T>[];

  public constructor(private readonly _iterableDiffers: IterableDiffers) {
    this._itemsDiffer = this._iterableDiffers.find([]).create((i, item) => this.trackByFn(i, item));
  }

  public columnDefs: {
    headerArr: (string | TemplateRef<{}>)[];
    cellTemplateRef?: TemplateRef<{ item: T }>;
    fixed?: boolean;
  }[] = [];

  public itemDefs: { item: T }[] = [];

  private _getIsColumnControlsChanged(): boolean {
    if (this._prevColumnControls?.length !== this.columnControls?.length) return true;

    for (const columnControl of this.columnControls?.toArray() ?? []) {
      const prevColumnControl = this._prevColumnControls?.single((item) => item.guid === columnControl.guid);
      if (!prevColumnControl) return true;

      if (
        prevColumnControl.header !== columnControl.header
        || prevColumnControl.fixed !== columnControl.fixed
      ) {
        return true;
      }
    }

    return false;
  }

  public ngDoCheck(): void {
    const itemsChanges = this._itemsDiffer.diff(this.items);

    const isColumnControlsChanged = this._getIsColumnControlsChanged();

    if (isColumnControlsChanged) {
      this._reloadColumnDefs();
    }

    if (isColumnControlsChanged) {
      this._reloadHeaderDefTable();
    }

    if (itemsChanges) {
      this._reloadItemDefs();
    }
  }

  private _reloadColumnDefs(): void {
    this.columnDefs = (
      this.columnControls?.toArray().map((item) => ({
        headerArr: [
          ...(typeof item.header === "string" ? [item.header] : item.header ?? []),
          ...item.headerTemplateRef ? [item.headerTemplateRef] : []
        ],
        cellTemplateRef: item.cellTemplateRef,
        fixed: item.fixed
      })) ?? []
    ).orderBy((item) => item.fixed ? 0 : 1);
  }

  private _reloadHeaderDefTable(): void {
    const maxDepth = this.columnDefs.max((item) => Math.max(item.headerArr.length, 1)) ?? 1;
    const depthArr = Array(maxDepth).fill(0).map((a, b) => b);

    const headerDefTable: IHeaderDef[][] = [];

    for (const depth of depthArr) {
      const headerDefRow: IHeaderDef[] = [];
      for (const colDef of this.columnDefs) {
        headerDefRow.push({
          text: (typeof colDef.headerArr[depth] === "string" ? colDef.headerArr[depth] : undefined) as string | undefined,
          fixed: colDef.fixed,
          templateRef: typeof colDef.headerArr[depth] === "string" ? undefined : colDef.headerArr[depth] as TemplateRef<{}> | undefined
        });
      }
      headerDefTable.push(headerDefRow);
    }

    for (let r = 0; r < headerDefTable.length; r++) {
      for (let c = 0; c < headerDefTable[r].length; c++) {
        if (
          headerDefTable.slice(0, r + 1).every((headerDefRow) => (
            headerDefRow[c - 1]?.text === headerDefRow[c].text
            && headerDefRow[c - 1]?.fixed === headerDefRow[c].fixed
            && !headerDefRow[c - 1]?.templateRef && !headerDefRow[c].templateRef
          ))
          || (headerDefTable[r][c].text === undefined && headerDefTable[r][c].templateRef === undefined)
        ) {
          headerDefTable[r][c].isSpanned = true;
          continue;
        }

        let colspan = 1;
        for (let cc = c; cc < headerDefTable[r].length; cc++) {
          if (
            headerDefTable.slice(0, r + 1).every((headerDefRow) => (
              headerDefRow[cc].text === headerDefRow[cc + 1]?.text
              && headerDefRow[cc].fixed === headerDefRow[cc + 1]?.fixed
              && !headerDefRow[cc]?.templateRef && !headerDefRow[cc + 1].templateRef
            ))
          ) {
            colspan++;
          }
          else {
            break;
          }
        }
        headerDefTable[r][c].colspan = colspan === 1 ? undefined : colspan;

        let rowspan = 1;
        for (let rr = r + 1; rr < headerDefTable.length; rr++) {
          if (headerDefTable[rr][c].text === undefined && headerDefTable[rr][c].templateRef === undefined) {
            rowspan++;
          }
          else {
            break;
          }
        }
        headerDefTable[r][c].rowspan = rowspan === 1 ? undefined : rowspan;
      }
    }

    this.headerDefTable = headerDefTable;
  }

  private _reloadItemDefs(): void {
    this.itemDefs = this.items.map((item) => ({ item }));
  }
}

interface IHeaderDef {
  isSpanned?: boolean;
  colspan?: number;
  rowspan?: number;
  fixed?: boolean;
  templateRef?: TemplateRef<{}>;
  text?: string;
}
