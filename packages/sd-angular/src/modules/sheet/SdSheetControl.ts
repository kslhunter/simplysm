import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  IterableDiffer,
  IterableDiffers,
  NgZone,
  OnInit,
  Output,
  QueryList,
  ViewEncapsulation
} from "@angular/core";
import {SdSheetColumnControl} from "./SdSheetColumnControl";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import {SdLocalStorageProvider} from "../shared/SdLocalStorageProvider";
import {ResizeEvent} from "../../commons/ResizeEvent";
import {SdMutationEvent} from "../..";

@Component({
  selector: "sd-sheet",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <sd-dock-container>
      <sd-dock class="_topbar" *ngIf="!!id || pageLength > 1">
        <div class="_options" *ngIf="!!id">
          <sd-dropdown>
            <a>
              <sd-icon icon="cog" fw></sd-icon>
            </a>
            <sd-dropdown-popup>
              <sd-form class="sd-padding-default">
                <!--<sd-form-item label="표시형식" *ngIf="!children">
                  <sd-checkbox radio inline [value]="getDisplayType() === 'sheet'"
                               (valueChange)="onDisplayTypeChange($event ? 'sheet' : 'card')">
                    시트형
                  </sd-checkbox>
                  <sd-checkbox radio inline [value]="getDisplayType() === 'card'"
                               (valueChange)="onDisplayTypeChange($event ? 'card' : 'sheet')">
                    카드형
                  </sd-checkbox>
                </sd-form-item>-->
                <ng-container *ngIf="getDisplayType() === 'card'">
                  <sd-form-item label="표시항목수">
                    <sd-textfield type="number" [value]="getCardItemCount()"
                                  (valueChange)="onCardItemCountChange($event)" required></sd-textfield>
                  </sd-form-item>
                </ng-container>
                <sd-form-item label="표시컬럼">
                  <div *ngFor="let columnControl of columnControls; trackBy: trackByColumnControlFn">
                    <sd-checkbox [value]="!getIsHideColumn(columnControl)"
                                 (valueChange)="onIsHideColumnChange(columnControl, !$event)"
                                 inline style="width: 100%">
                      <pre style="display: inline-block">{{ columnControl.header }}</pre>
                    </sd-checkbox>
                  </div>
                </sd-form-item>
              </sd-form>
            </sd-dropdown-popup>
          </sd-dropdown>
        </div>
        <div *ngIf="pageLength > 1">
          <sd-pagination [(page)]="page" [length]="pageLength"
                         (pageChange)="pageChange.emit($event)"></sd-pagination>
        </div>
      </sd-dock>

      <sd-pane style="position: relative;">
        <ng-container *ngIf="getDisplayType() === 'sheet'">
          <div class="_sheet" [style.padding-top.px]="paddingTop">
            <div #headerElRef class="_content _head">
              <div class="_row" *ngIf="hasHeaderGroup">
                <div class="_col-group _fixed-col-group">
                  <div class="_col _first-col" [class._double]="selectable && children">
                    <div class="_border"></div>
                  </div>
                  <div class="_col" *ngFor="let headerGroup of fixedHeaderGroups; trackBy: trackByIndexFn"
                       [style.width.px]="headerGroup.width">
                    <pre>{{ headerGroup.header }}</pre>
                    <div class="_border"></div>
                  </div>
                </div>
                <div class="_col-group" [style.padding-left.px]="fixedColumnWidth">
                  <div class="_col" *ngFor="let headerGroup of nonFixedHeaderGroups; trackBy: trackByIndexFn"
                       [style.width.px]="headerGroup.width">
                    <pre>{{ headerGroup.header }}</pre>
                    <div class="_border"></div>
                  </div>
                </div>
              </div>
              <div class="_row">
                <div class="_col-group _fixed-col-group">
                  <div class="_col _first-col" [class._double]="selectable && children">
                    <a (click)="onAllSelectIconClick()">
                      <sd-icon [icon]="'arrow-right'" *ngIf="selectable === 'multi'"
                               [ngClass]="{'sd-text-color-primary-default': allSelected, 'sd-text-color-grey-default': !allSelected}"></sd-icon>
                    </a>
                    <div class="_border"></div>
                  </div>
                  <div class="_col" *ngFor="let columnControl of fixedColumnControls; trackBy: trackByColumnControlFn"
                       [style.width.px]="getWidth(columnControl)"
                       [attr.col-index]="getIndex(columnControl)"
                       [attr.title]="columnControl.help"
                       [attr.sd-header]="columnControl.header">
                    <pre>{{ columnControl.header && columnControl.header!.split(".").last() }}</pre>
                    <ng-template [ngTemplateOutlet]="columnControl.headTemplateRef"></ng-template>
                    <div class="_border" [style.cursor]="id ? 'ew-resize' : undefined"
                         (mousedown)="onHeadBorderMousedown($event)"></div>
                  </div>
                </div>
                <div class="_col-group" [style.padding-left.px]="fixedColumnWidth">
                  <div class="_col"
                       *ngFor="let columnControl of nonFixedColumnControls; trackBy: trackByColumnControlFn"
                       [style.width.px]="getWidth(columnControl)"
                       [attr.col-index]="getIndex(columnControl)"
                       [attr.title]="columnControl.help"
                       [attr.sd-header]="columnControl.header">
                    <pre>{{ columnControl.header && columnControl.header.split(".").last() }}</pre>
                    <ng-template [ngTemplateOutlet]="columnControl.headTemplateRef"></ng-template>
                    <div class="_border" [style.cursor]="id ? 'ew-resize' : undefined"
                         (mousedown)="onHeadBorderMousedown($event)"></div>
                  </div>
                </div>
              </div>
              <div class="_row _summary" *ngIf="hasSummary">
                <div class="_col-group _fixed-col-group">
                  <div class="_col _first-col">
                    <div class="_border"></div>
                  </div>
                  <div class="_col sd-background-warning-lightest"
                       *ngFor="let columnControl of fixedColumnControls; trackBy: trackByColumnControlFn"
                       [style.width.px]="getWidth(columnControl)">
                    <ng-template [ngTemplateOutlet]="columnControl.summaryTemplateRef"
                                 [ngTemplateOutletContext]="{items: items}"></ng-template>
                    <div class="_border"></div>
                  </div>
                </div>
                <div class="_col-group" [style.padding-left.px]="fixedColumnWidth">
                  <div class="_col sd-background-warning-lightest"
                       *ngFor="let columnControl of nonFixedColumnControls; trackBy: trackByColumnControlFn"
                       [style.width.px]="getWidth(columnControl)">
                    <ng-template [ngTemplateOutlet]="columnControl.summaryTemplateRef"
                                 [ngTemplateOutletContext]="{items: items}"></ng-template>
                    <div class="_border"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="_content _body" [style.width.px]="headerElRef.offsetWidth">
              <ng-template #rowOfList let-items="items">
                <ng-container *ngFor="let item of items; let i = index; trackBy: trackByItemFn">
                  <div class="_row" [class._selected]="getIsItemSelected(item)"> <!-- [@rowState]="'in'" -->
                    <div class="_col-group _fixed-col-group">
                      <div class="_col _first-col"
                           [class._double]="selectable && children"
                           [class._selectable]="selectable"
                           [class._selected]="getIsItemSelected(item)"
                           [class._expandable]="getHasChildren(i, item)"
                           [class._expanded]="getIsExpended(i, item)">
                        <a class="_expand-icon" *ngIf="!!children" (click)="onExpandIconClick($event, i, item)"
                           [style.visibility]="getHasChildren(i, item) ? undefined : 'hidden'">
                          <sd-icon [icon]="getHasChildren(i, item) ? 'caret-right' : undefined"
                                   [fw]="true"></sd-icon>
                        </a>
                        <a class="_select-icon" (click)="onSelectIconClick($event, i, item)" *ngIf="selectable">
                          <sd-icon icon="arrow-right"
                                   *ngIf="(!itemSelectableFn || itemSelectableFn!(i, item)) && (selectable === true || selectable === 'manual')"
                                   [fw]="true"></sd-icon>
                          <sd-icon icon="arrow-right"
                                   *ngIf="(!itemSelectableFn || itemSelectableFn!(i, item)) && (selectable === 'multi')"
                                   [fw]="true"></sd-icon>
                        </a>
                      </div>
                      <div
                          [class]="'_col' + (itemThemeFn && itemThemeFn(item) ? ' sd-background-' + itemThemeFn(item) + '-lightest' : '')"
                          *ngFor="let columnControl of fixedColumnControls; trackBy: trackByColumnControlFn"
                          [style.width.px]="getWidth(columnControl)" tabindex="0"
                          (keydown)="onCellKeydown($event)">
                        <ng-template [ngTemplateOutlet]="columnControl.cellTemplateRef"
                                     [ngTemplateOutletContext]="{items: items, item: item, index: i}"></ng-template>
                        <div class="_focus-indicator"></div>
                      </div>
                    </div>
                    <div class="_col-group" [style.padding-left.px]="fixedColumnWidth">
                      <div
                          [class]="'_col' + (itemThemeFn && itemThemeFn(item) ? ' sd-background-' + itemThemeFn(item) + '-lightest' : '')"
                          *ngFor="let columnControl of nonFixedColumnControls; trackBy: trackByColumnControlFn"
                          [style.width.px]="getWidth(columnControl)" tabindex="0"
                          (keydown)="onCellKeydown($event)">
                        <ng-template [ngTemplateOutlet]="columnControl.cellTemplateRef"
                                     [ngTemplateOutletContext]="{items: items, item: item, index: i}"></ng-template>
                        <div class="_focus-indicator"></div>
                      </div>
                    </div>
                    <div class="_select-indicator"></div>
                  </div>
                  <ng-container *ngIf="getHasChildren(i, item) && getIsExpended(i, item)">
                    <ng-template [ngTemplateOutlet]="rowOfList"
                                 [ngTemplateOutletContext]="{items: children!(i, item)}"></ng-template>
                  </ng-container>
                </ng-container>
              </ng-template>
              <ng-template [ngTemplateOutlet]="rowOfList"
                           [ngTemplateOutletContext]="{items: getPagedItems()}"></ng-template>
            </div>
          </div>
        </ng-container>
        <ng-container *ngIf="getDisplayType() === 'card'">
          <sd-grid>
            <ng-container *ngFor="let item of items; let i = index; trackBy: trackByItemFn">
              <sd-grid-item [width]="(100 / getCardItemCount()) + '%'">
                <sd-card>
                  <div class="_select-bar" [class._selected]="getIsItemSelected(item)" *ngIf="selectable"
                       (click)="onSelectIconClick($event, i, item)">
                    <div class="_select-icon">
                      <sd-icon icon="arrow-right"
                               *ngIf="(!itemSelectableFn || itemSelectableFn!(i, item)) && (selectable === true || selectable === 'manual')"
                               [fw]="true"></sd-icon>
                      <sd-icon icon="arrow-right"
                               *ngIf="(!itemSelectableFn || itemSelectableFn!(i, item)) && (selectable === 'multi')"
                               [fw]="true"></sd-icon>
                    </div>
                  </div>

                  <div class="_content">
                    <table>
                      <thead>
                      <ng-container *ngFor="let columnControl of fixedColumnControls; trackBy: trackByColumnControlFn">
                        <tr>
                          <th>
                            <pre>{{ columnControl.header }}</pre>
                            <ng-template [ngTemplateOutlet]="columnControl.headTemplateRef"></ng-template>
                          </th>
                          <td>
                            <ng-template [ngTemplateOutlet]="columnControl.cellTemplateRef"
                                         [ngTemplateOutletContext]="{items: items, item: item, index: i}"></ng-template>
                          </td>
                        </tr>
                      </ng-container>
                      </thead>
                      <tbody>
                      <ng-container
                          *ngFor="let columnControl of nonFixedColumnControls; trackBy: trackByColumnControlFn">
                        <tr>
                          <th>
                            <pre>{{ columnControl.header }}</pre>
                            <ng-template [ngTemplateOutlet]="columnControl.headTemplateRef"></ng-template>
                          </th>
                          <td>
                            <ng-template [ngTemplateOutlet]="columnControl.cellTemplateRef"
                                         [ngTemplateOutletContext]="{items: items, item: item, index: i}"></ng-template>
                          </td>
                        </tr>
                      </ng-container>
                      </tbody>
                    </table>
                  </div>
                </sd-card>
              </sd-grid-item>
            </ng-container>
          </sd-grid>
        </ng-container>
      </sd-pane>
    </sd-dock-container>`,
  styles: [/* language=SCSS */ `
    sd-sheet {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      overflow: auto;
      background: var(--theme-grey-lightest);
      z-index: 0;

      border: 1px solid var(--sheet-border-color-dark);

      ._content {
        white-space: nowrap;
        width: fit-content;
        overflow: hidden;
      }

      ._topbar {
        width: 100%;
        
        > ._content {
          // background: var(--sheet-header-bg);
          background: white;
          padding: var(--sheet-padding-v) var(--sheet-padding-h);
          border-bottom: 1px solid var(--sheet-border-color);
          // border-right: 1px solid var(--sheet-border-color-dark);
          height: calc(var(--sheet-row-height) + 1px);
          overflow: hidden;
          white-space: normal;
          width: 100%;

          ._options {
            float: right;
            font-size: var(--font-size-sm);
          }
        }
      }

      ._head {
        display: block;
        position: absolute;
        z-index: 2;
        top: 0;
        left: 0;
        white-space: nowrap;
      }

      ._col-group {
        display: inline-block;
      }

      ._col {
        position: relative;
        display: inline-block;
        vertical-align: top;
        // TODO: height
        min-height: calc(var(--sheet-row-height) + 1px);

        &:focus {
          outline-color: transparent;
        }
      }

      ._head ._col {
        background: var(--sheet-header-bg);
        font-weight: bold;
        text-align: center;
        padding: var(--sheet-padding-v) var(--sheet-padding-h);
        border-bottom: 1px solid var(--sheet-border-color);
        user-select: none;

        > ._border {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 4px;
          border-right: 1px solid var(--sheet-border-color);
        }
      }

      ._head ._summary ._col {
        padding: 0;
        user-select: auto;
        text-align: left;
      }

      ._body ._col {
        background: white;
        border-right: 1px solid var(--sheet-border-color);
        border-bottom: 1px solid var(--sheet-border-color);

        sd-textfield > input {
          border: none;
          padding: var(--sheet-padding-v) var(--sheet-padding-h);

          &[type=year],
          &[type=month],
          &[type=date],
          &[type=datetime],
          &[type=time],
          &[type=datetime-local] {
            padding: calc(var(--sheet-padding-v) - 1px) var(--sheet-padding-h);
          }

          &[type=color] {
            height: var(--sheet-row-height);
          }

          &:disabled {
            background: transparent;
            color: var(--text-color-default);
          }
        }

        sd-combobox {
          > ._icon {
            top: 0;
            right: 0;
            width: var(--sheet-row-height);
            padding: var(--sheet-padding-v) 0;
          }

          > sd-textfield > input {
            padding-right: var(--sheet-row-height);
          }
        }

        sd-checkbox > label {
          display: inline-block;
          width: auto;
          border: none;
          padding: var(--sheet-padding-v) var(--sheet-padding-h);

          > input:disabled + ._indicator_rect {
            background: transparent;
          }
        }

        sd-button > button {
          border: none;
          padding: var(--sheet-padding-v) var(--sheet-padding-h);
          text-align: left;
          border-radius: 0;
        }

        sd-select,
        sd-multi-select {
          > sd-dropdown > div {
            border: none;
            padding: var(--sheet-padding-v) var(--sheet-padding-h);
            height: var(--sheet-row-height);
            background: var(--sheet-edit-cell-bg);
            border-radius: 0;

            > ._icon {
              top: 0;
              right: 0;
              width: var(--sheet-row-height);
              padding: var(--sheet-padding-v);
            }
          }

          &[sd-disabled=true] > sd-dropdown > div {
            background: transparent;
            color: var(--text-color-default);

            > ._icon {
              display: none;
            }
          }
        }

        > ._focus-indicator {
          display: none;
          position: absolute;
          pointer-events: none;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          outline: 1px solid var(--theme-primary-default);
          outline-offset: -1px;
          background: rgba(var(--theme-primary-default-rgb), .1);
        }

        &:focus {
          z-index: 3;
        }

        &:focus > ._focus-indicator {
          display: block;
        }
      }

      ._head > ._row > ._col-group:nth-child(2) > ._col:last-child > ._border,
      ._body > ._row > ._col-group:nth-child(2) > ._col:last-child {
        border-right-color: var(--sheet-border-color-dark);
      }

      ._head > ._row:last-child > ._col-group > ._col {
        border-bottom-color: var(--sheet-border-color-dark);
      }

      ._body > ._row:last-child > ._col-group > ._col {
        border-bottom-color: var(--sheet-border-color-dark);
      }

      ._head ._col._first-col,
      ._body ._col._first-col {
        width: var(--sheet-row-height);
        text-align: center;
        padding: var(--sheet-padding-v);

        &._double {
          width: calc(var(--sheet-row-height) * 2);
        }
      }

      ._body ._col._first-col {
        background: var(--sheet-header-bg);
        user-select: none;

        > a {
          display: inline-block;
          padding: var(--sheet-padding-v);

          &:focus {
            outline: none;
          }
        }

        &._selectable,
        &._expandable {
          padding: 0;
        }

        &._selectable {
          > ._select-icon {
            display: inline-block;
            color: var(--theme-grey-light);
            //transition: .1s ease-in;
          }

          &._selected > ._select-icon {
            color: var(--theme-primary-default);
            //transition: .1s ease-out;
          }
        }

        &._expandable {
          > ._expand-icon {
            display: inline-block;
            color: var(--theme-grey-light);
            transition: .1s ease-in;
          }

          &._expanded > ._expand-icon {
            color: var(--theme-primary-default);
            transform: rotate(90deg);
            transition: .1s ease-out;
          }
        }
      }

      ._body > ._row > ._fixed-col-group > ._col:last-child {
        border-right-color: var(--sheet-border-color-dark);
      }

      ._head > ._row > ._fixed-col-group > ._col:last-child > ._border {
        border-right-color: var(--sheet-border-color-dark);
      }

      ._fixed-col-group {
        position: absolute;
        z-index: 1;
        top: 0;
        left: 0;
        overflow: hidden;
      }

      ._row {
        position: relative;
      }

      ._body > ._row._selected > ._select-indicator {
        display: block;
        position: absolute;
        z-index: 3;
        pointer-events: none;
        top: 0;
        left: 0;
        width: calc(100% - 1px);
        height: calc(100% - 1px);
        background: var(--theme-primary-default);
        opacity: .1;
      }

      &[sd-selectable=true] ._body ._first-col {
        cursor: pointer;
      }

      //-- card 형
      sd-grid {
        padding: var(--gap-sm);

        sd-grid-item {
          padding: var(--gap-sm);

          sd-card {
            div._select-bar {
              cursor: pointer;
              border-top-left-radius: 2px;
              border-top-right-radius: 2px;
              padding: var(--gap-sm) var(--gap-default);
              border-bottom: 1px solid var(--theme-grey-lighter);

              > ._select-icon {
                display: inline-block;
                color: var(--theme-grey-light);
                transition: .1s ease-in;
              }

              &._selected {
                background: var(--theme-primary-default);

                > ._select-icon {
                  color: white
                }
              }
            }

            div._content {
              display: block;
              width: 100%;
              padding: var(--gap-lg);

              table {
                border-collapse: collapse;
                width: 100%;

                td, th {
                  padding: var(--gap-xs) var(--gap-default);
                }

                th {
                  text-align: right;
                }
              }
            }
          }
        }
      }
    }
  `]
})
export class SdSheetControl implements DoCheck, OnInit, AfterViewInit {
  @ContentChildren(SdSheetColumnControl)
  public columnControls?: QueryList<SdSheetColumnControl>;

  @Input()
  @SdTypeValidate(Array)
  public items?: any[];

  @Input()
  @SdTypeValidate(Function)
  public trackBy?: (index: number, item: any) => any;

  @Input()
  @SdTypeValidate(Function)
  public itemSelectableFn?: (index: number, item: any) => any;

  @Input()
  @SdTypeValidate({
    type: [Boolean, String],
    includes: [true, false, "manual", "multi"]
  })
  @HostBinding("attr.sd-selectable")
  public selectable?: boolean | "manual" | "multi";

  @Input()
  public selectedItem: any;

  @Output()
  public readonly selectedItemChange = new EventEmitter<any>();

  @Input()
  public selectedItems: any[] = [];

  @Output()
  public readonly selectedItemsChange = new EventEmitter<any[]>();

  @Input()
  @SdTypeValidate(String)
  public id?: string;

  @Input()
  @SdTypeValidate(Function)
  public itemThemeFn?: (item: any) => undefined | "primary" | "info" | "success" | "warning" | "danger";

  @Input()
  @SdTypeValidate({type: Number, notnull: true})
  public get page(): number {
    return Math.min(this._page, this.pageLength - 1);
  }

  public set page(value: number) {
    this._page = value;
  }

  private _page = 0;

  @Input()
  @SdTypeValidate({type: Number, notnull: true})
  public get pageLength(): number {
    if (this.pageItemCount && this.items) {
      return Math.ceil(this.items.length / this.pageItemCount);
    }
    else {
      return this._pageLength;
    }
  }

  public set pageLength(value: number) {
    if (this.pageItemCount) {
      throw new Error("'sd-sheet'에 'pageItemCount''와 'pageLength'를 함께 설정할 수 없습니다.");
    }

    this._pageLength = value;
  }

  public _pageLength = 0;

  @Input()
  @SdTypeValidate({type: Number})
  public pageItemCount?: number;

  @Output()
  public readonly pageChange = new EventEmitter<number>();

  @Input()
  @SdTypeValidate(Function)
  public children?: (index: number, item: any) => any;

  @Input()
  @SdTypeValidate({
    type: Array,
    notnull: true
  })
  public expandedItemTracks: any[] = [];

  @Output()
  public readonly expandedItemTracksChange = new EventEmitter<any[]>();

  @Input()
  @SdTypeValidate({
    type: Boolean,
    notnull: true
  })
  public autoHeight = false;

  public get allSelected(): boolean {
    return !!this.items && this.items.length === this.selectedItems.length && this.items.every(item => this.selectedItems.includes(item));
  }

  public onAllSelectIconClick(): void {
    if (this.allSelected) {
      this.selectedItems = [];
    }
    else if (this.items) {
      this.selectedItems = [...this.items];
    }

    this.selectedItemsChange.emit(this.selectedItems);
  }

  public get paddingTop(): number {
    const rowEls = (this._elRef.nativeElement as HTMLElement).findAll("._head > ._row");
    return rowEls.sum(item => item.clientHeight) || 0;


    /*const size = Math.floor(this._style.presets.fns.stripUnit(this._style.presets.vars.sheetPaddingV) * 2
      + this._style.presets.fns.stripUnit(this._style.presets.vars.lineHeight) * this._style.presets.fns.stripUnit(this._style.presets.vars.fontSize.default));

    return ((this.hasHeaderGroup ? (Math.floor(size * 2) + 2) : (Math.floor(size) + 1)) + 1) + "px";*/
  }

  public get hasSummary(): boolean {
    return this.columnControls ? this.columnControls.some(item => !!item.summaryTemplateRef) : false;
  }

  public get hasHeaderGroup(): boolean {
    return this.columnControls ? this.columnControls.some(item => !!item.header && item.header.includes(".")) : false;
  }

  public get fixedHeaderGroups(): { header?: string; width: number }[] {
    const result: { header?: string; width: number }[] = [];
    for (const item of this.fixedColumnControls) {
      const header = (item.header && item.header.split(".").length === 2) ? item.header.split(".")[0] : undefined;
      if (result.last() && result.last()!.header === header) {
        result.last()!.width += this.getWidth(item);
      }
      else {
        result.push({
          header,
          width: this.getWidth(item)
        });
      }
    }

    return result;
  }

  public get nonFixedHeaderGroups(): { header?: string; width: number }[] {
    const result: { header?: string; width: number }[] = [];
    for (const item of this.nonFixedColumnControls) {
      const header = (item.header && item.header.split(".").length === 2) ? item.header.split(".")[0] : undefined;
      if (result.last() && result.last()!.header === header) {
        result.last()!.width += this.getWidth(item);
      }
      else {
        result.push({
          header,
          width: this.getWidth(item)
        });
      }
    }

    return result;
  }

  public get fixedColumnControls(): SdSheetColumnControl[] {
    return this.columnControls ? this.columnControls.filter(item => !this.getIsHideColumn(item)).filter(item => !!item.fixed) : [];
  }

  public get nonFixedColumnControls(): SdSheetColumnControl[] {
    return this.columnControls ? this.columnControls.filter(item => !this.getIsHideColumn(item)).filter(item => !item.fixed) : [];
  }

  public get fixedColumnWidth(): number {
    const fixedColGroupEl = (this._elRef.nativeElement as HTMLElement).findAll("._head > ._row > ._fixed-col-group")[0];
    return fixedColGroupEl ? fixedColGroupEl.clientWidth : 0;

    /*const size = Math.floor(this._style.presets.fns.stripUnit(this._style.presets.vars.sheetPaddingV) * 2
      + this._style.presets.fns.stripUnit(this._style.presets.vars.lineHeight) * this._style.presets.fns.stripUnit(this._style.presets.vars.fontSize.default)) + 1;

    if (this.fixedColumnControls.length > 0) {
      return this.fixedHeaderGroups.map(item => item.width).reduce((a, b) => a + b) + size;
    }
    else {
      return size;
    }*/
  }

  public trackByColumnControlFn(index: number, item: SdSheetColumnControl): any {
    return item.guid;
  }

  public trackByItemFn(index: number, item: any): any {
    if (this.trackBy) {
      return this.trackBy(index, item) || item;
    }
    else {
      return item;
    }
  }

  public trackByIndexFn(index: number): any {
    return index;
  }

  public getPagedItems(): any[] | undefined {
    if (this.pageItemCount && this.items) {
      return this.items.slice(this.page * this.pageItemCount, (this.page + 1) * this.pageItemCount);
    }
    else {
      return this.items;
    }
  }

  private readonly _iterableDiffer: IterableDiffer<any>;
  private readonly _iterableDifferForColumn: IterableDiffer<any>;
  private _sheetConfig: {
    displayType: "sheet" | "card";
    cardItemCount: number;
    columns: {
      header?: string;
      index: number;
      width: number;
      hide: boolean;
    }[];
  } = {
    displayType: "sheet",
    cardItemCount: 3,
    columns: []
  };

  public constructor(private readonly _iterableDiffers: IterableDiffers,
                     private readonly _cdr: ChangeDetectorRef,
                     private readonly _elRef: ElementRef,
                     private readonly _localStorage: SdLocalStorageProvider,
                     private readonly _zone: NgZone) {
    this._iterableDiffer = this._iterableDiffers.find([]).create((i: number, item: any) => this.trackByItemFn(i, item));
    this._iterableDifferForColumn = this._iterableDiffers.find([]).create();
  }

  private _getItemByRowIndex(index: number): any {
    if (!this.items) return undefined;

    let i = 0;
    const loop = (items: any[]): any => {
      for (const item of items) {
        if (i === index) {
          return item;
        }
        i++;

        const children = this.children && this.getIsExpended(items.indexOf(item), item) && this.children(items.indexOf(item), item);
        if (children) {
          const selected = loop(children);
          if (selected) {
            return selected;
          }
        }
      }

      return undefined;
    };
    return loop(this.getPagedItems()!);
  }

  public ngOnInit(): void {
    this._loadConfig();
  }

  public ngAfterViewInit(): void {
    const el = this._elRef.nativeElement as HTMLElement;
    const pane = el.findAll("sd-pane")[0];
    pane.addEventListener("scroll", () => {
      this._zone.runOutsideAngular(() => {
        const fixedColGroupEls = el.findAll("._fixed-col-group") as HTMLElement[];
        for (const fixedColGroupEl of fixedColGroupEls) {
          fixedColGroupEl.style.left = pane.scrollLeft + "px";
        }
        /*const topbarEl = el.findAll("._topbar")[0] as HTMLElement;
        if (topbarEl) {
          topbarEl.style.left = pane.scrollLeft + "px";
        }*/

        const headerEl = el.findAll("._head")[0] as HTMLElement;
        headerEl.style.top = pane.scrollTop + "px";
      });
    });

    el.addEventListener("focus", (event: Event) => {
      if (!(event.target as HTMLElement).classList.contains("_select-icon")) {
        if (this.selectable === "manual" && this.selectedItem) {
          const cellEl = (event.target as HTMLElement).findParent("._col") as HTMLElement;
          if (!cellEl) return;
          if (cellEl.classList.contains("_first-col")) return;

          const rowEl = (event.target as HTMLElement).findParent("._row") as HTMLElement;
          if (!rowEl) return;

          const bodyEl = rowEl.parentElement as Element;
          const rowIndex = Array.from(bodyEl.children).indexOf(rowEl);
          const cursorItem = this._getItemByRowIndex(rowIndex);
          if (this.selectedItem !== cursorItem) {
            this.selectedItem = undefined;
            this.selectedItemChange.emit(undefined);
          }
        }
        else if (this.selectable === true) {
          this.selectRow(event.target as HTMLElement);
        }
      }
    }, true);

    this._zone.runOutsideAngular(() => {
      el.addEventListener("focus", (event: Event) => {
        const fixedColGroupEls = el.findAll("._fixed-col-group") as HTMLElement[];
        const cellEl = (event.target as HTMLElement).matches("._col")
          ? event.target as HTMLElement
          : (event.target as HTMLElement).findParent("._col") as HTMLElement | undefined;
        if (cellEl && !cellEl.findParent("._fixed-col-group")) {
          const left = fixedColGroupEls[0].offsetWidth;
          const offset = cellEl.getRelativeOffset(cellEl.findParent("sd-pane") as HTMLElement);
          if (offset.left < left) {
            el.findAll("sd-pane")[0].scrollLeft += offset.left - left;
          }

          if (offset.top < this.paddingTop) {
            el.findAll("sd-pane")[0].scrollTop += offset.top - this.paddingTop;
          }
        }
      }, true);

      if (this.autoHeight) {
        el.findAll("._body")[0].addEventListener("mutation", (event: Event) => {
          const records = (event as SdMutationEvent).detail.mutations;
          for (const record of records) {
            for (const addedNode of Array.from(record.addedNodes)) {
              if (!(addedNode instanceof Element) || !addedNode.findParent("._col")) {
                continue;
              }

              const rowEl = addedNode.findParent("._body ._row") as HTMLElement;

              addedNode.addEventListener("resize", (event1: Event) => {
                const dimensions = (event1 as ResizeEvent).detail.dimensions;
                if (dimensions.includes("height")) {
                  this._configRowColHeight(rowEl);
                }
              });

              this._configRowColHeight(rowEl);
            }
          }
        }, true);

        for (const rowEl of el.findAll("._body ._row")) {
          setTimeout(() => {
            this._configRowColHeight(rowEl);
          });
        }
      }
    });
  }

  private _configRowColHeight(rowEl: Element): void {
    const siblingEls = rowEl.findAll("._col") as HTMLElement[];
    for (const siblingEl of siblingEls) {
      siblingEl.style.height = null; //tslint:disable-line:no-null-keyword
    }

    // repaint
    (rowEl as HTMLElement).offsetHeight; // tslint:disable-line:no-unused-expression

    const maxHeight = siblingEls.filter(item => !item.classList.contains("_first-col")).max(item => item.clientHeight);
    for (const siblingEl of siblingEls) {
      siblingEl.style.height = maxHeight + "px";
    }
  }

  public ngDoCheck(): void {
    if (this.items && this._iterableDiffer.diff(this.items)) {
      this._cdr.markForCheck();
    }

    if (this.columnControls && this._iterableDifferForColumn.diff(this.columnControls.toArray())) {
      this._cdr.markForCheck();
    }
  }

  public getDisplayType(): "sheet" | "card" {
    return this._sheetConfig.displayType;
  }

  public onDisplayTypeChange(val: "sheet" | "card"): void {
    this._sheetConfig.displayType = val;
    this._saveConfig();
    this._cdr.markForCheck();
  }

  public getCardItemCount(): number {
    return this._sheetConfig.cardItemCount;
  }

  public onCardItemCountChange(val: number): void {
    this._sheetConfig.cardItemCount = val;
    this._saveConfig();
    this._cdr.markForCheck();
  }

  public getIsHideColumn(columnControl: SdSheetColumnControl): boolean {
    const index = this.getIndex(columnControl);
    const columnConfig = this._sheetConfig.columns.single(item => item.header === columnControl.header && item.index === index);
    return columnConfig ? columnConfig.hide : false;
  }

  public onIsHideColumnChange(columnControl: SdSheetColumnControl, val: boolean): void {
    const index = this.getIndex(columnControl);
    const columnConfig = this._sheetConfig.columns.single(item => item.header === columnControl.header && item.index === index);
    if (columnConfig) {
      columnConfig.hide = val;
    }
    else {
      this._sheetConfig.columns.push({
        header: columnControl.header,
        width: columnControl.width,
        index,
        hide: val
      });
    }
    this._saveConfig();
    this._cdr.markForCheck();
  }

  public getIndex(columnControl: SdSheetColumnControl): number {
    return this.columnControls!.toArray().indexOf(columnControl);
  }

  public getWidth(columnControl: SdSheetColumnControl): number {
    const index = this.getIndex(columnControl);
    const columnConfig = this._sheetConfig.columns.single(item => item.header === columnControl.header && item.index === index);
    return columnConfig ? columnConfig.width : columnControl.width;
  }

  public getIsExpended(i: number, item: any): boolean {
    return this.expandedItemTracks.includes(this.trackByItemFn(i, item));
  }

  public getIsItemSelected(item: any): boolean {
    return (
      (this.selectable === true || this.selectable === "manual") &&
      this.selectedItem === item
    ) || (
      this.selectable === "multi" &&
      this.selectedItems.includes(item)
    );
  }

  public getHasChildren(i: number, item: any): boolean {
    return this.children && this.children(i, item) && this.children(i, item).length > 0;
  }

  public selectRow(targetEl: Element): void {
    if (!this.selectable) return;

    const rowEl = targetEl.findParent("._row");
    if (rowEl) {
      const bodyEl = rowEl.parentElement as Element;
      const rowIndex = Array.from(bodyEl.children).indexOf(rowEl);
      const selectedItem = this._getItemByRowIndex(rowIndex);

      if (this.selectable === "multi") {
        if (!this.selectedItems.includes(selectedItem)) {
          this.selectedItems.push(selectedItem);
          this.selectedItemsChange.emit(this.selectedItems);
        }
      }
      else {
        if (this.selectedItem !== selectedItem) {
          this.selectedItem = selectedItem;
          this.selectedItemChange.emit(this.selectedItem);
        }
      }
    }
  }

  public onSelectIconClick(event: Event, i: number, item: any): void {
    if (this.selectable) {
      if (this.getDisplayType() === "sheet") {
        const targetEl = event.target as Element;
        const rowEl = targetEl.findParent("._row");
        if (!rowEl) return;

        const bodyEl = rowEl.parentElement as Element;
        const rowIndex = Array.from(bodyEl.children).indexOf(rowEl);
        const selectedItem = this._getItemByRowIndex(rowIndex);

        if (this.selectable === "multi") {
          if (this.selectedItems.includes(selectedItem)) {
            this.selectedItems.remove(selectedItem);
            this.selectedItemsChange.emit(this.selectedItems);
          }
          else {
            this.selectRow(event.target as Element);
          }
        }
        else {
          if (this.selectedItem === selectedItem) {
            this.selectedItem = undefined;
            this.selectedItemChange.emit(undefined);
          }
          else {
            this.selectRow(event.target as Element);
          }
        }
      }
      else {
        if (this.selectedItem === item) {
          this.selectedItem = undefined;
          this.selectedItemChange.emit(undefined);
        }
        else {
          this.selectedItem = item;
          this.selectedItemChange.emit(item);
        }
      }
    }
  }

  public onExpandIconClick(event: Event, i: number, item: any): void {
    if (this.getHasChildren(i, item)) {
      if (this.getIsExpended(i, item)) {
        this.expandedItemTracks.remove(this.trackByItemFn(i, item));
      }
      else {
        this.expandedItemTracks.push(this.trackByItemFn(i, item));
      }
      this.expandedItemTracksChange.emit(this.expandedItemTracks);
    }
  }

  /*@HostListener("scroll", ["$event"])
  public onScroll(event: Event): void {
    const el = (this._elRef.nativeElement as HTMLElement);

    const fixedColGroupEls = el.findAll("._fixed-col-group") as HTMLElement[];
    for (const fixedColGroupEl of fixedColGroupEls) {
      fixedColGroupEl.style.left = el.scrollLeft + "px";
    }

    const headerEl = el.findAll("._head")[0] as HTMLElement;
    headerEl.style.top = el.scrollTop + "px";
  }*/

  public onHeadBorderMousedown(event: MouseEvent): void {
    if (!this.id) return;

    const cellEl = (event.target as HTMLElement).findParent("._col") as HTMLElement;
    const startX = event.clientX;
    const startWidth = cellEl.clientWidth;

    const doDrag = (e: MouseEvent) => {
      cellEl.style.width = `${startWidth + e.clientX - startX}px`;
    };

    const stopDrag = () => {
      document.documentElement!.removeEventListener("mousemove", doDrag, false);
      document.documentElement!.removeEventListener("mouseup", stopDrag, false);

      const index = Number(cellEl.getAttribute("col-index"));
      const columnControl = this.columnControls!.toArray()[index];

      const columnConfig = this._sheetConfig.columns.single(item => item.header === columnControl.header && item.index === index);
      if (columnConfig) {
        columnConfig.width = cellEl.offsetWidth;
      }
      else {
        this._sheetConfig.columns.push({
          header: columnControl.header,
          width: cellEl.offsetWidth,
          index,
          hide: false
        });
      }
      this._saveConfig();

      this._cdr.markForCheck();
    };
    document.documentElement!.addEventListener("mousemove", doDrag, false);
    document.documentElement!.addEventListener("mouseup", stopDrag, false);
  }

  public onCellKeydown(event: KeyboardEvent): void {
    this._zone.runOutsideAngular(() => {
      const targetEl = event.target as HTMLElement;
      if (targetEl.classList.contains("_col")) {
        if (event.key === "F2") {
          const focusableEls = targetEl.findFocusableAll();
          if (focusableEls.length > 0) {
            focusableEls[0].focus();
            event.preventDefault();
          }
        }
        else if (event.key === "ArrowDown") {
          const rowEl = targetEl.findParent("._row") as HTMLElement;
          const bodyEl = rowEl.parentElement as Element;

          const rowIndex = Array.from(bodyEl.children).indexOf(rowEl);
          const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(targetEl);

          const nextRowEl = bodyEl.children.item(rowIndex + 1);
          if (nextRowEl) {
            (nextRowEl.findAll("._col")[cellIndex] as HTMLElement).focus();
            event.preventDefault();
          }
        }
        else if (event.key === "ArrowUp") {
          const rowEl = targetEl.findParent("._row") as HTMLElement;
          const bodyEl = rowEl.parentElement as Element;

          const rowIndex = Array.from(bodyEl.children).indexOf(rowEl);
          const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(targetEl);

          if (rowIndex - 1 >= 0) {
            const nextRowEl = bodyEl.children.item(rowIndex - 1);
            (nextRowEl!.findAll("._col")[cellIndex] as HTMLElement).focus();
            event.preventDefault();
          }
        }
        else if (event.key === "ArrowRight") {
          const rowEl = targetEl.findParent("._row") as HTMLElement;
          const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(targetEl);

          const nextCell = rowEl.findAll("._col")[cellIndex + 1] as HTMLElement;
          if (nextCell) {
            nextCell.focus();
            event.preventDefault();
          }
        }
        else if (event.key === "ArrowLeft") {
          const rowEl = targetEl.findParent("._row") as HTMLElement;
          const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(targetEl);

          if (cellIndex - 1 >= 0) {
            const nextCell = rowEl.findAll("._col")[cellIndex - 1] as HTMLElement;
            nextCell.focus();
            event.preventDefault();
          }
        }
      }
      else {
        if (event.key === "Escape") {
          const cellEl = (event.target as HTMLElement).findParent("._col") as HTMLElement;
          cellEl.focus();
          event.preventDefault();
        }
        else if (event.key === "Enter" || (event.ctrlKey && event.key === "ArrowDown")) {
          const cellEl = targetEl.findParent("._col") as HTMLElement;
          const rowEl = cellEl.findParent("._row") as HTMLElement;
          const bodyEl = rowEl.parentElement as Element;

          const rowIndex = Array.from(bodyEl.children).indexOf(rowEl);
          const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(cellEl);

          const nextRowEl = bodyEl.children.item(rowIndex + 1);
          if (nextRowEl) {
            const nextRowCellEl = nextRowEl.findAll("._col")[cellIndex] as HTMLElement;

            const focusableEls = nextRowCellEl.findFocusableAll();
            if (focusableEls.length > 0) {
              focusableEls[0].focus();
            }
            else {
              nextRowCellEl.focus();
            }

            event.preventDefault();
          }
        }
        else if (event.ctrlKey && event.key === "ArrowUp") {
          const cellEl = targetEl.findParent("._col") as HTMLElement;
          const rowEl = cellEl.findParent("._row") as HTMLElement;
          const bodyEl = rowEl.parentElement as Element;

          const rowIndex = Array.from(bodyEl.children).indexOf(rowEl);
          const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(cellEl);

          if (rowIndex - 1 >= 0) {
            const nextRowEl = bodyEl.children.item(rowIndex - 1);
            const nextCell = (nextRowEl!.findAll("._col")[cellIndex] as HTMLElement);
            const focusableEls = nextCell.findFocusableAll();
            if (focusableEls.length > 0) {
              focusableEls[0].focus();
            }
            else {
              nextCell.focus();
            }

            event.preventDefault();
          }
        }
        else if (event.key === "Tab" && !event.shiftKey) {
          const cellEl = targetEl.findParent("._col") as HTMLElement;
          const targetIndexOnCell = cellEl.findFocusableAll().indexOf(targetEl);
          if (targetIndexOnCell + 1 < cellEl.findFocusableAll().length) {
            return;
          }

          const rowEl = cellEl.findParent("._row") as HTMLElement;
          const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(cellEl);

          const nextCell = rowEl.findAll("._col")[cellIndex + 1] as HTMLElement;
          if (nextCell) {
            const focusableEls = nextCell.findFocusableAll();
            if (focusableEls.length > 0) {
              focusableEls[0].focus();
            }
            else {
              nextCell.focus();
            }

            event.preventDefault();
          }
        }
        else if (event.key === "Tab" && event.shiftKey) {
          const cellEl = targetEl.findParent("._col") as HTMLElement;
          const targetIndexOnCell = cellEl.findFocusableAll().indexOf(targetEl);
          if (targetIndexOnCell >= 1) {
            return;
          }

          const rowEl = cellEl.findParent("._row") as HTMLElement;
          const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(cellEl);

          if (cellIndex - 1 >= 0) {
            const nextCell = rowEl.findAll("._col")[cellIndex - 1] as HTMLElement;

            const focusableEls = nextCell.findFocusableAll();
            if (focusableEls.length > 0) {
              focusableEls[0].focus();
            }
            else {
              nextCell.focus();
            }

            event.preventDefault();
          }
        }
        else if (event.ctrlKey && event.key === "ArrowRight") {
          const cellEl = targetEl.findParent("._col") as HTMLElement;
          const rowEl = cellEl.findParent("._row") as HTMLElement;
          const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(cellEl);

          const nextCell = rowEl.findAll("._col")[cellIndex + 1] as HTMLElement;
          if (nextCell) {
            const focusableEls = nextCell.findFocusableAll();
            if (focusableEls.length > 0) {
              focusableEls[0].focus();
            }
            else {
              nextCell.focus();
            }

            event.preventDefault();
          }
        }
        else if (event.ctrlKey && event.key === "ArrowLeft") {
          const cellEl = targetEl.findParent("._col") as HTMLElement;
          const rowEl = cellEl.findParent("._row") as HTMLElement;
          const cellIndex = Array.from(rowEl.findAll("._col")).indexOf(cellEl);

          if (cellIndex - 1 >= 0) {
            const nextCell = rowEl.findAll("._col")[cellIndex - 1] as HTMLElement;

            const focusableEls = nextCell.findFocusableAll();
            if (focusableEls.length > 0) {
              focusableEls[0].focus();
            }
            else {
              nextCell.focus();
            }

            event.preventDefault();
          }
        }
      }
    });
  }

  @HostListener("resize", ["$event"])
  public onResize(event: ResizeEvent): void {
    if (document.activeElement && document.activeElement.findParent((this._elRef.nativeElement as HTMLElement))) {
      const offset = (document.activeElement as HTMLElement).getRelativeOffset((this._elRef.nativeElement as HTMLElement));
      if (event.detail.dimensions.includes("height")) {
        (this._elRef.nativeElement as HTMLElement).scrollTop = offset.top - this.paddingTop - 12;
      }

      if (event.detail.dimensions.includes("width")) {
        (this._elRef.nativeElement as HTMLElement).scrollLeft = offset.left - this.fixedColumnWidth - 12;
      }
    }
  }

  public _loadConfig(): void {
    this._sheetConfig = this._localStorage.get("sd-sheet." + this.id + ".config") || {
      displayType: "sheet",
      cardItemCount: 3,
      columns: []
    };
  }

  public _saveConfig(): void {
    const removedColumns = this._sheetConfig.columns.filter(item => !this.columnControls!
      .some((item1, index) => (item1.header || "") + index === ((item.header || "") + item.index))
    );
    this._sheetConfig.columns.remove(removedColumns);
    this._localStorage.set("sd-sheet." + this.id + ".config", this._sheetConfig);
  }
}
