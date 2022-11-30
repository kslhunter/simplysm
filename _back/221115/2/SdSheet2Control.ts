import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  Output,
  QueryList,
  ViewChild
} from "@angular/core";
import { SdSheet2ColumnControl } from "./SdSheet2ColumnControl";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { NumberUtil, ObjectUtil } from "@simplysm/sd-core-common";

@Component({
  selector: "sd-sheet2",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dock-container>
      <sd-dock>
        <sd-flex direction="row" gap="sm">
          <sd-anchor class="_cog-btn">
            <fa-icon [icon]="icons.fasCog | async" [fixedWidth]="true"></fa-icon>
          </sd-anchor>
          <sd-pagination [page]="1" [pageLength]="30"></sd-pagination>
        </sd-flex>
      </sd-dock>

      <sd-pane #sheetContainer class="_sheet-container">
        <table class="_sheet">
          <thead>
          <ng-container *ngFor="let depth of createArrayByLength(maxHeaderDepth)">
            <tr>
              <th class="_fixed _feature-cell" *ngIf="depth === 0"
                  [attr.rowspan]="maxHeaderDepth">
              </th>
              <ng-container *ngFor="let columnControl of displayColumnControls;">
                <ng-container *ngIf="getColumnControlHeader(columnControl, depth) as header">
                  <th #th
                      [attr.rowspan]="getColumnControlHeaderRowSpan(columnControl, depth)"
                      [attr.colspan]="getColumnControlHeaderColSpan(columnControl, depth)"
                      [class._fixed]="columnControl.fixed"
                      [class._last-depth]="getIsLastHeaderDepth(columnControl, depth)"
                      [style]="!getColumnControlHeaderColSpan(columnControl, depth) ? {width: columnControl.width, minWidth: columnControl.width, maxWidth: columnControl.width} : undefined">
                    <div class="_contents"
                         [class._clickable]="columnControl.useOrdering && columnControl.key"
                         (click)="onHeaderClick($event, columnControl)">
                      {{ header }}
                      <div
                        *ngIf="columnControl.useOrdering && columnControl.key && getIsLastHeaderDepth(columnControl, depth)"
                        class="_sort-icon">
                        <fa-layers>
                          <fa-icon [icon]="icons.fasSort | async" class="sd-text-brightness-lightest"></fa-icon>
                          <fa-icon [icon]="icons.fasSortDown | async"
                                   *ngIf="getIsColumnControlOrderingDesc(columnControl) === false"></fa-icon>
                          <fa-icon [icon]="icons.fasSortUp | async"
                                   *ngIf="getIsColumnControlOrderingDesc(columnControl) === true"></fa-icon>
                        </fa-layers>
                        <sub *ngIf="getColumnControlOrderingIndexText(columnControl) as text">{{ text }}</sub>
                      </div>
                    </div>

                    <div class="_resizer" *ngIf="columnControl.resizable && getIsLastHeaderDepth(columnControl, depth)"
                         (mousedown)="onResizerMousedown($event, columnControl)"></div>
                  </th>
                </ng-container>
              </ng-container>
            </tr>
          </ng-container>
          </thead>
          <tbody>
          <ng-container *ngFor="let item of displayItems; let r = index;">
            <tr>
              <td class="_fixed _feature-cell"></td>
              <ng-container *ngFor="let columnControl of displayColumnControls; let c = index;">
                <td #td
                    tabindex="0"
                    [class._fixed]="columnControl.fixed"
                    [style]="{width: columnControl.width, minWidth: columnControl.width, maxWidth: columnControl.width}"
                    [attr.r]="r" [attr.c]="c"
                    (focus)="onCellFocusChange()"
                    (blur)="onCellFocusChange()"
                    (keydown)="onCellKeydown($event)">
                  <div class="_contents">
                    <ng-template [ngTemplateOutlet]="columnControl.contentsTemplateRef"
                                 [ngTemplateOutletContext]="{item: item }"></ng-template>
                  </div>
                </td>
              </ng-container>
            </tr>
          </ng-container>
          </tbody>
        </table>

        <div class="_focus-cell-indicator"></div>
        <div class="_focus-row-indicator"></div>
      </sd-pane>
    </sd-dock-container>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    $z-index-fixed: 1;
    $z-index-head: 2;
    $z-index-head-fixed: 3;
    $z-index-row-select-indicator: 4;
    $z-index-focus-cell-indicator: 5;

    $border-color: var(--theme-color-blue-grey-lightest);
    $border-color-dark: var(--theme-color-grey-light);

    :host {
      ::ng-deep > sd-dock-container > ._content {
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
        border-bottom-right-radius: var(--border-radius-default);
        border-bottom-left-radius: var(--border-radius-default);

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

              &._fixed {
                z-index: $z-index-head-fixed;
              }

              &._last-depth {
                border-bottom: 1px solid $border-color-dark;
              }

              > ._contents {
                padding: var(--sd-sheet-padding-v) var(--sd-sheet-padding-h);

                &._clickable {
                  cursor: pointer;

                  &:hover {
                    text-decoration: underline;
                  }
                }

                > ._sort-icon {
                  position: absolute;
                  right: 0;
                  display: inline-block;
                  padding: 0 var(--gap-xs);
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
          }

          > tbody > tr > td {
            background: white;

            &._fixed {
              z-index: $z-index-fixed;
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

          z-index: $z-index-focus-cell-indicator;
        }

        ::ng-deep > ._row-select-indicator {
          position: absolute;
          pointer-events: none;
          background: var(--theme-color-primary-default);
          opacity: .1;

          z-index: $z-index-row-select-indicator;
        }
      }
    }
  `]
})
export class SdSheet2Control implements AfterViewChecked {
  public icons = {
    fasCog: import("@fortawesome/pro-solid-svg-icons/faCog").then(m => m.faCog),
    fasTable: import("@fortawesome/pro-solid-svg-icons/faTable").then(m => m.faTable),
    fasSort: import("@fortawesome/pro-solid-svg-icons/faSort").then(m => m.faSort),
    fasSortDown: import("@fortawesome/pro-solid-svg-icons/faSortDown").then(m => m.faSortDown),
    fasSortUp: import("@fortawesome/pro-solid-svg-icons/faSortUp").then(m => m.faSortUp),
    fasArrowRight: import("@fortawesome/pro-solid-svg-icons/faArrowRight").then(m => m.faArrowRight)
  };

  @Input()
  @SdInputValidate({ type: Array, notnull: true })
  public items: any[] = [];

  public get displayItems(): any[] {
    return this.items;
  }

  @ContentChildren(forwardRef(() => SdSheet2ColumnControl))
  public columnControls?: QueryList<SdSheet2ColumnControl>;

  @ViewChild("sheetContainer", { static: true, read: ElementRef })
  public sheetContainerElRef?: ElementRef<HTMLElement>;

  @Input()
  public ordering: ISdSheet2ColumnOrderingVM[] = [];

  @Output()
  public readonly orderingChange = new EventEmitter<ISdSheet2ColumnOrderingVM[]>();

  public get displayColumnControls(): SdSheet2ColumnControl[] | undefined {
    return this.columnControls?.toArray().orderBy((item) => item.fixed ? 0 : 1);
  }

  public get maxHeaderDepth(): number {
    return this.columnControls
      ?.map((item) => item.header instanceof Array ? item.header.length : 1)
      .max() ?? 1;
  }

  public get endCellAddr(): { r: number; c: number } {
    return {
      r: this.displayItems.length - 1,
      c: (this.displayColumnControls?.length ?? 0) - 1
    };
  }

  public constructor(private readonly _cdr: ChangeDetectorRef) {
  }

  public ngAfterViewChecked(): void {
    if (!this.sheetContainerElRef) return;

    // Fixed 컬럼 설정

    const fixedEls = this.sheetContainerElRef.nativeElement.findAll("> ._sheet > * > tr > *._fixed");
    for (const fixedEl of fixedEls) {
      fixedEl.style.left = "";
    }

    for (const fixedEl of fixedEls) {
      fixedEl.style.position = "sticky";
      fixedEl.style.left = fixedEl.offsetLeft + "px";
    }

    // Fixed 헤더 설정

    const theadEl = this.sheetContainerElRef.nativeElement.findFirst("> ._sheet > thead")!;
    theadEl.style.position = "sticky";
    theadEl.style.top = theadEl.offsetTop + "px";
  }

  public getIsLastHeaderDepth(columnControl: SdSheet2ColumnControl, depth: number): boolean {
    if (columnControl.header instanceof Array) {
      return depth === columnControl.header.length - 1;
    }
    else {
      return true;
    }
  }

  public getIsColumnControlOrderingDesc(columnControl: SdSheet2ColumnControl): boolean | undefined {
    return this.ordering.single((item) => item.key === columnControl.key)?.desc;
  }

  public getColumnControlOrderingIndexText(columnControl: SdSheet2ColumnControl): string | undefined {
    if (this.ordering.length < 2) {
      return undefined;
    }
    const index = this.ordering.findIndex((item) => item.key === columnControl.key);
    return index >= 0 ? (index + 1).toString() : undefined;
  }

  public createArrayByLength(count: number): number[] {
    return Array(count).fill(0).map((a, b) => b);
  }

  public getColumnControlHeader(columnControl: SdSheet2ColumnControl, depth: number): string | null | undefined {
    const displayColumnControls = this.displayColumnControls;
    if (!displayColumnControls) return;

    const rawFn = (header: string[] | string | undefined, d: number): string | undefined => {
      if (header instanceof Array) {
        return header[d];
      }
      else if (d === 0) {
        return header;
      }
      else {
        return undefined;
      }
    };

    if (columnControl.header instanceof Array) {
      const currColumnControlIndex = displayColumnControls.indexOf(columnControl);

      if (currColumnControlIndex > 0) {
        const currColumnControlPrevHeaders = columnControl.header.slice(0, depth + 1);
        const prevColumnControl = displayColumnControls[currColumnControlIndex - 1];

        if (columnControl.fixed === prevColumnControl.fixed && currColumnControlPrevHeaders.every((item, d) => item === rawFn(prevColumnControl.header, d))) {
          return null;
        }
        else {
          return rawFn(columnControl.header, depth);
        }
      }
      else {
        return rawFn(columnControl.header, depth);
      }
    }
    else {
      return rawFn(columnControl.header, depth);
    }
  }

  public getColumnControlHeaderRowSpan(columnControl: SdSheet2ColumnControl, depth: number): number | undefined {
    if (columnControl.header === undefined) return;

    if (columnControl.header instanceof Array) {
      if (depth === columnControl.header.length - 1) {
        return this.maxHeaderDepth - depth;
      }
      else {
        return undefined;
      }
    }
    else {
      return this.maxHeaderDepth;
    }
  }

  public getColumnControlHeaderColSpan(columnControl: SdSheet2ColumnControl, depth: number): number | undefined {
    const displayColumnControls = this.displayColumnControls;
    if (!displayColumnControls) return;
    if (columnControl.header === undefined) return;
    if (typeof columnControl.header === "string") return;

    // const currentHeader = this.getColumnControlHeader(columnControl, depth);

    const index = displayColumnControls.indexOf(columnControl);
    const nextColumnControls = displayColumnControls.slice(index + 1);

    let count = 1;
    for (const nextColumnControl of nextColumnControls) {
      if (this.getColumnControlHeader(nextColumnControl, depth) !== null) {
        break;
      }
      count++;
    }

    return count > 1 ? count : undefined;
  }

  public onHeaderClick(event: MouseEvent, columnControl: SdSheet2ColumnControl): void {
    if (!columnControl.useOrdering) return;
    if (columnControl.key === undefined) return;

    let ordering = ObjectUtil.clone(this.ordering);

    if (event.shiftKey || event.ctrlKey) {
      const orderingItem = ordering.single((item) => item.key === columnControl.key);
      if (orderingItem) {
        if (orderingItem.desc) {
          ordering.remove(orderingItem);
        }
        else {
          orderingItem.desc = !orderingItem.desc;
        }
      }
      else {
        ordering.push({ key: columnControl.key, desc: false });
      }
    }
    else {
      if (ordering.length === 1 && ordering[0].key === columnControl.key) {
        if (ordering[0].desc) {
          ordering = [];
        }
        else {
          ordering[0].desc = !ordering[0].desc;
        }
      }
      else {
        ordering = [{ key: columnControl.key, desc: false }];
      }
    }

    if (this.orderingChange.observed) {
      this.orderingChange.emit(ordering);
    }
    else {
      this.ordering = ordering;
    }
  }

  public onResizerMousedown(event: MouseEvent, columnControl: SdSheet2ColumnControl): void {
    if (!columnControl.resizable) return;
    if (!(event.target instanceof HTMLElement)) return;

    const thEl = event.target.findParent("th");
    if (!thEl) return;

    const displayColumnControls = this.displayColumnControls;
    if (!displayColumnControls) return;
    const currColumnControlIndex = displayColumnControls.indexOf(columnControl);
    const tdEls = this.sheetContainerElRef!.nativeElement.findAll(`> ._sheet > tbody > tr > td:nth-child(${currColumnControlIndex + 2})`);

    const startX = event.clientX;
    const startWidth = thEl.clientWidth;

    const doDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      const width = startWidth + e.clientX - startX;

      thEl.style.width = `${width}px`;
      thEl.style.minWidth = `${width}px`;
      thEl.style.maxWidth = `${width}px`;

      for (const tdEl of tdEls) {
        tdEl.style.width = `${width}px`;
        tdEl.style.minWidth = `${width}px`;
        tdEl.style.maxWidth = `${width}px`;
      }
    };

    const stopDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);

      columnControl.width = thEl.style.width;
      this._cdr.markForCheck();
    };

    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }

  public onCellFocusChange(): void {
    if (!this.sheetContainerElRef) return;

    //-- Cell 포커싱에 따른 Cell/Row Indicator 설정

    const focusCellIndicatorEl = this.sheetContainerElRef.nativeElement.findFirst("> ._focus-cell-indicator")!;
    const focusRowIndicatorEl = this.sheetContainerElRef.nativeElement.findFirst("> ._focus-row-indicator")!;

    if (
      document.activeElement instanceof HTMLElement &&
      document.activeElement.tagName === "TD" &&
      document.activeElement.findParent(this.sheetContainerElRef.nativeElement)
    ) {
      // Cell Indicator
      focusCellIndicatorEl.style.display = "block";

      focusCellIndicatorEl.style.top = document.activeElement.offsetTop - 2 + "px";
      focusCellIndicatorEl.style.left = document.activeElement.offsetLeft - 2 + "px";
      focusCellIndicatorEl.style.height = document.activeElement.offsetHeight + 3 + "px";
      focusCellIndicatorEl.style.width = document.activeElement.offsetWidth + 3 + "px";

      // Row Indicator
      const trEl = document.activeElement.findParent("tr")!;
      focusRowIndicatorEl.style.display = "block";

      focusRowIndicatorEl.style.top = trEl.offsetTop - 2 + "px";
      focusRowIndicatorEl.style.left = trEl.offsetLeft - 2 + "px";
      focusRowIndicatorEl.style.height = trEl.offsetHeight + 3 + "px";
      focusRowIndicatorEl.style.width = trEl.offsetWidth + 3 + "px";
    }
    else {
      focusCellIndicatorEl.style.display = "none";
      focusRowIndicatorEl.style.display = "none";
    }
  }

  public onCellKeydown(event: KeyboardEvent): void {
    if (!this.sheetContainerElRef) return;
    if (!(event.target instanceof HTMLElement)) return;
    if (!event.target.findParent(this.sheetContainerElRef.nativeElement)) return;

    /*const currAddr = { r: NumberUtil.parseInt(tdEl.getAttribute("r")), c: NumberUtil.parseInt(tdEl.getAttribute("c")) };
    const endAddr = this.endCellAddr;*/

    if (event.target.tagName === "TD") {
      if (event.key === "ArrowDown") {
        const currAddr = this._getCellAddr(event.target);
        const endAddr = this.endCellAddr;

        if (currAddr.r >= endAddr.r) return;
        event.preventDefault();

        this._focusCell(currAddr.r + 1, currAddr.c);
      }
      else if (event.key === "ArrowUp") {
        const currAddr = this._getCellAddr(event.target);
        if (currAddr.r <= 0) return;
        event.preventDefault();

        this._focusCell(currAddr.r - 1, currAddr.c);
      }
      else if (event.key === "ArrowRight") {
        const currAddr = this._getCellAddr(event.target);
        const endAddr = this.endCellAddr;

        if (currAddr.c >= endAddr.c) return;
        event.preventDefault();

        this._focusCell(currAddr.r, currAddr.c + 1);
      }
      else if (event.key === "ArrowLeft") {
        const currAddr = this._getCellAddr(event.target);
        if (currAddr.c <= 0) return;
        event.preventDefault();

        this._focusCell(currAddr.r, currAddr.c - 1);
      }
    }
  }

  private _getCellAddr(cellEl: HTMLElement): { r: number; c: number } {
    return {
      r: NumberUtil.parseInt(cellEl.getAttribute("r"))!,
      c: NumberUtil.parseInt(cellEl.getAttribute("c"))!
    };
  }

  private _focusCell(r: number, c: number): void {
    if (!this.sheetContainerElRef) return;

    const el = this.sheetContainerElRef.nativeElement.findFirst(`> ._sheet > tbody > tr > td[r="${r}"][c="${c}"]`);
    if (!el) return;

    el.focus();
  }
}

export interface ISdSheet2ColumnOrderingVM {
  key: string;
  desc: boolean;
}
