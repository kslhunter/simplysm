import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  DoCheck,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  IterableDiffer,
  IterableDiffers,
  NgZone,
  OnInit,
  Output,
  QueryList
} from "@angular/core";
import {SdSheetColumnControl} from "./SdSheetColumnControl";
import {SdInputValidate} from "../commons/SdInputValidate";
import {SdResizeEvent} from "@simplysm/sd-core-browser";
import {SdModalProvider} from "../providers/SdModalProvider";
import {SdSheetConfigModal} from "../modals/SdSheetConfigModal";
import {SdSystemConfigRootProvider} from "../root-providers/SdSystemConfigRootProvider";

@Component({
  selector: "sd-sheet",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dock-container>
      <sd-dock *ngIf="key || pageLength > 0">
        <sd-anchor class="_cog-icon" (click)="onConfigButtonClick()"
                   *ngIf="key">
          <sd-icon icon="cog" fixedWidth></sd-icon>
        </sd-anchor>
        <sd-pagination [page]="page"
                       [pageLength]="pageLength"
                       (pageChange)="onPageChange($event)"></sd-pagination>
      </sd-dock>

      <sd-pane>
        <div class="_cell-focus-indicator"></div>
        <div class="_row-focus-indicator"></div>

        <div class="_sheet">
          <!-- 헤더 구역 -->
          <div class="_content _head">
            <!-- 그룹 ROW -->
            <div class="_row _group-row" *ngIf="hasHeaderGroup">
              <!-- 고정 셀 그룹 -->
              <div class="_cell-group _fixed-cell-group">
                <div class="_border"></div>
                <div class="_cell _feature-cell">
                  <div class="_cell-content">
                    <sd-icon class="_icon _selected-icon" fixedWidth></sd-icon>
                    <sd-icon class="_icon _expand-icon" *ngIf="getChildrenFn" fixedWidth
                             [style.margin-right.em]="maxDepth"></sd-icon>
                  </div>
                  <div class="_border"></div>
                </div>
                <ng-container *ngFor="let headerGroup of fixedHeaderGroups; trackBy: trackByFnForHeaderGroup">
                  <div class="_cell" [style.width.px]="headerGroup.widthPixel">
                    <div class="_cell-content">
                      <pre class="_header-text-content">{{ headerGroup.name }}</pre>
                    </div>
                    <div class="_border"></div>
                  </div>
                </ng-container>
              </div>
              <!-- 셀 그룹 -->
              <div class="_cell-group" [style.padding-left.px]="fixedCellGroupWidthPixel">
                <ng-container *ngFor="let headerGroup of nonFixedHeaderGroups; trackBy: trackByFnForHeaderGroup">
                  <div class="_cell"
                       [style.width.px]="headerGroup.widthPixel">
                    <div class="_cell-content">
                      <pre class="_header-text-content">{{ headerGroup.name }}</pre>
                    </div>
                    <div class="_border"></div>
                  </div>
                </ng-container>
              </div>
            </div>

            <!-- 헤더 ROW -->
            <div class="_row _header-row">
              <!-- 고정 셀 그룹 -->
              <div class="_cell-group _fixed-cell-group"
                   (sdResize)="onFixedCellGroupResize($event)">
                <div class="_border"></div>
                <div class="_cell _feature-cell">
                  <div class="_cell-content">
                    <sd-icon class="_icon _selected-icon"
                             [icon]="selectMode === 'multi' ? 'arrow-right' : undefined"
                             (click)="onAllSelectIconClick($event)"
                             [class._selected]="getIsAllSelected()"
                             [class._selectable]="selectMode === 'multi'"
                             fixedWidth></sd-icon>
                    <sd-icon class="_icon _expand-icon" *ngIf="getChildrenFn" fixedWidth
                             [style.margin-right.em]="maxDepth"></sd-icon>
                  </div>
                  <div class="_border"></div>
                </div>
                <ng-container *ngFor="let columnControl of fixedColumnControls; trackBy: trackByFnForColumnControl">
                  <div class="_cell"
                       [style.width.px]="getColumnWidthPixel(columnControl)"
                       [attr.title]="columnControl.tooltip"
                       [class._resizable]="columnControl.resizable">
                    <div class="_cell-content">
                      <ng-container *ngIf="columnControl.useOrdering && columnControl.key">
                        <sd-anchor class="_header-text-content sd-text-brightness-default"
                                   (click)="onColumnOrderingHeaderClick($event, columnControl)">
                          <span *ngIf="!columnControl.headerTemplateRef">{{ columnControl.header }}</span>
                          <ng-template [ngTemplateOutlet]="columnControl.headerTemplateRef"></ng-template>
                          <sd-gap width="xs"></sd-gap>
                          <sd-icon icon="sort-amount-down-alt"
                                   [class.sd-text-brightness-lightest]="getIsColumnOrderingDesc(columnControl.key) === undefined"
                                   *ngIf="!getIsColumnOrderingDesc(columnControl.key)"></sd-icon>
                          <sd-icon icon="sort-amount-up"
                                   *ngIf="getIsColumnOrderingDesc(columnControl.key) === true"></sd-icon>
                          <small>{{ getColumnOrderingOrderText(columnControl.key) }}</small>
                        </sd-anchor>
                      </ng-container>
                      <ng-container *ngIf="!(columnControl.useOrdering && columnControl.key)">
                        <pre class="_header-text-content"
                             *ngIf="!columnControl.headerTemplateRef">{{ columnControl.header }}</pre>
                        <ng-template [ngTemplateOutlet]="columnControl.headerTemplateRef"></ng-template>
                      </ng-container>
                    </div>
                    <div class="_border" (mousedown)="onHeadCellBorderMousedown($event, columnControl)"></div>
                  </div>
                </ng-container>
              </div>
              <!-- 셀 그룹 -->
              <div class="_cell-group" [style.padding-left.px]="fixedCellGroupWidthPixel">
                <ng-container *ngFor="let columnControl of nonFixedColumnControls; trackBy: trackByFnForColumnControl">
                  <div class="_cell"
                       [style.width.px]="getColumnWidthPixel(columnControl)"
                       [attr.title]="columnControl.tooltip"
                       [class._resizable]="columnControl.resizable">
                    <div class="_cell-content">
                      <ng-container *ngIf="columnControl.useOrdering && columnControl.key">
                        <sd-anchor class="_header-text-content sd-text-brightness-default"
                                   (click)="onColumnOrderingHeaderClick($event, columnControl)">
                          <span *ngIf="!columnControl.headerTemplateRef">{{ columnControl.header }}</span>
                          <ng-template [ngTemplateOutlet]="columnControl.headerTemplateRef"></ng-template>
                          <sd-gap width="xs"></sd-gap>
                          <sd-icon icon="sort-amount-down-alt"
                                   [class.sd-text-brightness-lightest]="getIsColumnOrderingDesc(columnControl.key) === undefined"
                                   *ngIf="!getIsColumnOrderingDesc(columnControl.key)"></sd-icon>
                          <sd-icon icon="sort-amount-up"
                                   *ngIf="getIsColumnOrderingDesc(columnControl.key) === true"></sd-icon>
                          <small>{{ getColumnOrderingOrderText(columnControl.key) }}</small>
                        </sd-anchor>
                      </ng-container>
                      <ng-container *ngIf="!(columnControl.useOrdering && columnControl.key)">
                        <pre class="_header-text-content"
                             *ngIf="!columnControl.headerTemplateRef">{{ columnControl.header }}</pre>
                        <ng-template [ngTemplateOutlet]="columnControl.headerTemplateRef"></ng-template>
                      </ng-container>
                    </div>
                    <div class="_border" (mousedown)="onHeadCellBorderMousedown($event, columnControl)"></div>
                  </div>
                </ng-container>
              </div>
            </div>

            <!-- 합계 ROW -->
            <div class="_row _summary_row" *ngIf="hasSummaryGroup">
              <!-- 고정 셀 그룹 -->
              <div class="_cell-group _fixed-cell-group">
                <div class="_border"></div>
                <div class="_cell _feature-cell">
                  <div class="_cell-content">
                    <sd-icon class="_icon _selected-icon" fixedWidth></sd-icon>
                    <sd-icon class="_icon _expand-icon" *ngIf="getChildrenFn" fixedWidth
                             [style.margin-right.em]="maxDepth"></sd-icon>
                  </div>
                  <div class="_border"></div>
                </div>
                <ng-container *ngFor="let columnControl of fixedColumnControls; trackBy: trackByFnForColumnControl">
                  <div class="_cell"
                       [style.width.px]="getColumnWidthPixel(columnControl)">
                    <div class="_cell-content">
                      <ng-template [ngTemplateOutlet]="columnControl.summaryTemplateRef"></ng-template>
                    </div>
                    <div class="_border"></div>
                  </div>
                </ng-container>
              </div>
              <!-- 셀 그룹 -->
              <div class="_cell-group" [style.padding-left.px]="fixedCellGroupWidthPixel">
                <ng-container *ngFor="let columnControl of nonFixedColumnControls; trackBy: trackByFnForColumnControl">
                  <div class="_cell"
                       [style.width.px]="getColumnWidthPixel(columnControl)">
                    <div class="_cell-content">
                      <ng-template [ngTemplateOutlet]="columnControl.summaryTemplateRef"></ng-template>
                    </div>
                    <div class="_border"></div>
                  </div>
                </ng-container>
              </div>
            </div>
          </div>
          <!-- 바디 구역 -->
          <div class="_content _body">
            <!-- ROW 템플릿 -->
            <ng-template #itemRowTemplate let-item="item" let-index="index" let-depth="depth">
              <div class="_row"
                   [class._selected]="getIsSelectedItem(item)"
                   (click)="onItemRowClick($event, item, index)">
                <!-- 고정 셀 그룹 -->
                <div class="_cell-group _fixed-cell-group">
                  <div class="_border"></div>
                  <div class="_cell _feature-cell">
                    <div class="_cell-content">
                      <sd-icon class="_icon _selected-icon"
                               [icon]="selectMode && (!getItemSelectableFn || getItemSelectableFn(index, item)) ? 'arrow-right' : undefined"
                               (click)="onItemSelectIconClick($event, item, index)"
                               [class._selected]="getIsSelectedItem(item)"
                               [class._selectable]="selectMode && (!getItemSelectableFn || getItemSelectableFn(index, item))"
                               fixedWidth></sd-icon>

                      <div class="_depth-indicator"
                           *ngIf="getChildrenFn && depth > 0"
                           [style.margin-left.em]="depth - .5">
                      </div>

                      <sd-icon class="_icon _expand-icon"
                               *ngIf="getChildrenFn"
                               [icon]="getChildrenFn(index, item) ? 'caret-right' : undefined"
                               (click)="onItemExpandIconClick($event, item)"
                               [class._expanded]="getIsExpandedItem(item)"
                               [class._expandable]="getChildrenFn(index, item)"
                               [rotate]="getIsExpandedItem(item) ? 90 : undefined"
                               fixedWidth
                               [style.margin-right.em]="maxDepth - depth"></sd-icon>
                    </div>
                    <div class="_border"></div>
                  </div>
                  <ng-container *ngFor="let columnControl of fixedColumnControls; trackBy: trackByFnForColumnControl">
                    <div class="_cell"
                         [style.width.px]="getColumnWidthPixel(columnControl)" tabindex="0">
                      <div class="_cell-content">
                        <ng-template [ngTemplateOutlet]="columnControl.cellTemplateRef"
                                     [ngTemplateOutletContext]="{item: item, index: index}"></ng-template>
                      </div>
                      <div class="_border"></div>
                    </div>
                  </ng-container>
                </div>
                <!-- 셀 그룹 -->
                <div class="_cell-group" [style.padding-left.px]="fixedCellGroupWidthPixel">
                  <ng-container
                    *ngFor="let columnControl of nonFixedColumnControls; trackBy: trackByFnForColumnControl">
                    <div class="_cell"
                         [style.width.px]="getColumnWidthPixel(columnControl)" tabindex="0">
                      <div class="_cell-content">
                        <ng-template [ngTemplateOutlet]="columnControl.cellTemplateRef"
                                     [ngTemplateOutletContext]="{item: item, index: index}"></ng-template>
                      </div>
                      <div class="_border"></div>
                    </div>
                  </ng-container>
                </div>
                <div class="_selected-indicator"></div>
              </div>

              <!-- CHILDREN FOR 문 -->
              <ng-container *ngIf="getIsExpandedItem(item) && getChildrenFn && getChildrenFn(index, item)">
                <ng-container
                  *ngFor="let childItem of getChildrenFn(index, item); let childIndex = index; trackBy: trackByFn">
                  <ng-template [ngTemplateOutlet]="itemRowTemplate"
                               [ngTemplateOutletContext]="{item: childItem, index: childIndex, depth: depth + 1}"></ng-template>
                </ng-container>
              </ng-container>
            </ng-template>

            <!-- ROW 템플릿 FOR 문-->
            <ng-container *ngFor="let item of displayItems; let index = index; trackBy: trackByFn">
              <ng-template [ngTemplateOutlet]="itemRowTemplate"
                           [ngTemplateOutletContext]="{item: item, index: index, depth: 0}"></ng-template>
            </ng-container>
          </div>
          <div class="_border-rect"></div>
        </div>
      </sd-pane>
    </sd-dock-container>`,
  styles: [/* language=SCSS */ `
    :host {
      $z-index-fixed: 1;
      $z-index-row-selected-indicator: 2;
      $z-index-row-focus-indicator: 3;
      $z-index-sheet-border: 4;
      $z-index-cell-focus-indicator: 6;
      $z-index-head: 7;
      $z-index-head-fixed: 8;

      $border-color-default: var(--sd-border-color);
      $border-color-light: var(--sd-border-color-light);

      > sd-dock-container {
        border: 1px solid $border-color-default;

        > sd-dock { // 상단 DOCK (설정 아이콘 및 페이징)
          border-bottom: 1px solid $border-color-default;
          padding: var(--sd-sheet-padding-v) var(--sd-sheet-padding-h);

          > ._cog-icon {
            float: right;
          }
        }

        > sd-pane { // 하단 PANE (시트)
          z-index: 0;
          background: var(--sd-background-color);

          > ._sheet { // 시트
            display: inline-block;
            white-space: nowrap;
            position: relative;

            > ._border-rect {
              z-index: $z-index-sheet-border;
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              border-bottom: 1px solid $border-color-default;
              border-right: 1px solid $border-color-default;
              pointer-events: none;
            }

            > ._content { // 헤더/바디 구역 공통
              > ._row { // ROW 공통
                position: relative;

                > ._cell-group { // 셀 그룹 공통
                  display: inline-block;
                  vertical-align: top;

                  > ._cell { // 셀 공통
                    position: relative;
                    display: inline-block;
                    vertical-align: top;
                    border-bottom: 1px solid $border-color-light;
                    overflow: hidden;
                    height: calc(var(--sd-sheet-padding-v) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 1px);
                    background: white;
                    padding-right: 1px;

                    > ._border {
                      position: absolute;
                      height: 100%;
                      width: 2px;
                      top: 0;
                      right: 0;
                      background: transparent;
                      border-right: 1px solid $border-color-light;
                    }

                    &:focus {
                      outline: none;
                    }
                  }

                  &:last-child > ._cell:last-child > ._border {
                    border-right: 1px solid $border-color-default;
                  }
                }

                > ._fixed-cell-group { // 고정 셀 그룹
                  position: absolute;
                  top: 0;
                  left: 0;
                  z-index: $z-index-fixed;

                  > ._border {
                    position: absolute;
                    z-index: $z-index-sheet-border;
                    height: 100%;
                    width: 1px;
                    top: 0;
                    right: 0;
                    background: transparent;
                    border-right: 1px solid $border-color-default;
                  }

                  > ._feature-cell { // 기능 셀
                    background: var(--theme-color-grey-lightest);
                    padding: var(--sd-sheet-padding-v) var(--sd-sheet-padding-h);
                    user-select: none;

                    > ._cell-content {
                      > ._depth-indicator {
                        display: inline-block;
                        margin-top: .4em;
                        width: .5em;
                        height: .5em;
                        border-left: 1px solid var(--text-brightness-default);
                        border-bottom: 1px solid var(--text-brightness-default);
                        vertical-align: top;
                      }

                      > ._icon {
                        margin-right: 2px;
                      }

                      > ._expand-icon {
                        color: var(--theme-color-primary-default);

                        &._expandable {
                          cursor: pointer;
                        }

                        &._expanded {
                          color: var(--theme-color-warning-default);
                        }
                      }


                      > ._selected-icon {
                        color: var(--text-brightness-lightest);

                        &._selectable {
                          cursor: pointer;
                        }

                        &._selected {
                          color: var(--theme-color-primary-default);
                        }
                      }
                    }
                  }
                }
              }
            }

            > ._head { // 헤더 구역
              position: absolute;
              top: 0;
              left: 0;
              z-index: $z-index-head;
              user-select: none;

              > ._row { // ROW 공통
                > ._fixed-cell-group { // 고정 셀 그룹
                  z-index: $z-index-head-fixed;
                }

                &:last-child > * > ._cell {
                  border-bottom: 1px solid $border-color-default;
                }
              }

              > ._group-row, // 그룹 ROW
              > ._header-row { // 헤더 ROW

                > ._cell-group { // 셀 그룹 공통
                  > ._cell { // 셀 공통
                    background: var(--theme-color-grey-lightest);

                    > ._cell-content {
                      text-align: center;
                      font-weight: bold;

                      > ._header-text-content { // header
                        display: block;
                        padding: var(--sd-sheet-padding-v) var(--sd-sheet-padding-h);
                      }

                      > /deep/ sd-anchor._header-text-content {
                        &:focus {
                          outline: none;
                        }
                      }
                    }
                  }
                }
              }

              > ._header-row { // 헤더 ROW
                > ._cell-group { // 셀 그룹 공통
                  > ._cell { // 셀 공통
                    &._resizable {
                      > ._border {
                        cursor: ew-resize;
                      }
                    }
                  }
                }
              }

              > ._summary_row { // 요약 ROW
                > ._cell-group { // 셀 그룹 공통
                  > ._cell { // 셀 공통
                    background: var(--theme-color-warning-lightest);
                    font-weight: bold;
                  }
                }
              }
            }

            > ._body { // 바디 구역              
              > ._row { // ROW 공통
                > ._selected-indicator {
                  display: none;
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: calc(100% - 1px);
                  z-index: $z-index-row-selected-indicator;
                  pointer-events: none;
                  background: var(--theme-color-primary-default);
                  opacity: .1;
                }

                &._selected {
                  > ._selected-indicator {
                    display: block;
                  }
                }
              }
            }
          }

          > ._cell-focus-indicator { // CELL 포커스 표시기
            display: none;
            position: absolute;
            z-index: $z-index-cell-focus-indicator;
            pointer-events: none;
            border: 2px solid var(--theme-color-primary-default);
          }

          > ._row-focus-indicator { // ROW 포커스 표시기
            display: none;
            position: absolute;
            z-index: $z-index-row-focus-indicator;
            pointer-events: none;
            background: var(--theme-color-secondary-default);
            opacity: .15;
          }
        }
      }
    }
  `]
})
export class SdSheetControl implements DoCheck, OnInit {
  @Input()
  @SdInputValidate(String)
  public key?: string;

  @Input()
  @SdInputValidate({
    type: Array,
    notnull: true
  })
  public items: any[] = [];

  @Input()
  @SdInputValidate({
    type: Function,
    notnull: true
  })
  public trackByFn = (index: number, item: any): any => item;

  @Input()
  @SdInputValidate({
    type: Boolean,
    notnull: true
  })
  public autoHeight = false;

  @Input()
  @SdInputValidate({type: Number, notnull: true})
  public page = 0;

  @Input()
  @SdInputValidate({type: Number, notnull: true})
  public get pageLength(): number {
    if (this.pageItemCount !== undefined && this.pageItemCount !== 0 && this.items.length > 0) {
      return Math.ceil(this.items.length / this.pageItemCount);
    }
    else {
      return this._pageLength;
    }
  }

  public set pageLength(value: number) {
    this._pageLength = value;
  }

  public _pageLength = 0;

  @Input()
  @SdInputValidate(Number)
  public pageItemCount?: number;

  @Output()
  public readonly pageChange = new EventEmitter<number>();

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["single", "multi"]
  })
  public selectMode?: "single" | "multi";

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["click", "focus"]
  })
  public autoSelect?: "click" | "focus";

  @Input()
  @SdInputValidate({type: Array, notnull: true})
  public selectedItems: any[] = [];

  @Output()
  public readonly selectedItemsChange = new EventEmitter<any[]>();

  @Input()
  public expandedItems: any[] = [];

  @Output()
  public readonly expandedItemsChange = new EventEmitter<any[]>();

  @Input()
  public ordering: ISdSheetColumnOrderingVM[] = [];

  @Output()
  public readonly orderingChange = new EventEmitter<ISdSheetColumnOrderingVM[]>();

  @Input()
  @SdInputValidate(Function)
  public getItemSelectableFn?: (index: number, item: any) => any;

  @Input()
  @SdInputValidate(Function)
  public getChildrenFn?: (index: number, item: any) => any;

  @ContentChildren(forwardRef(() => SdSheetColumnControl))
  public columnControls?: QueryList<SdSheetColumnControl>;

  public fixedCellGroupWidthPixel = 0;

  private _config?: ISdSheetConfigVM;

  public get maxDepth(): number | undefined {
    if (!this.getChildrenFn) return undefined;
    return this.getDisplayItemDefs()
      .filter(item => item.visible)
      .max(item => item.depth) ?? 0;
  }

  public get fixedHeaderGroups(): { name?: string; widthPixel: number }[] {
    return this._getHeaderGroups(this.fixedColumnControls);
  }

  public get nonFixedHeaderGroups(): { name?: string; widthPixel: number }[] {
    return this._getHeaderGroups(this.nonFixedColumnControls);
  }

  public get fixedColumnControls(): SdSheetColumnControl[] {
    let fixedColumnControls = this.columnControls?.toArray() ?? [];
    if (this.key !== undefined && this._config?.columnObj) {
      fixedColumnControls = fixedColumnControls.filter(item => this._config?.columnObj?.[item.key as string]?.fixed ?? item.fixed);
      fixedColumnControls = fixedColumnControls.filter(item => !this._config?.columnObj?.[item.key as string]?.hidden);
      fixedColumnControls = fixedColumnControls.orderBy(item => this._config?.columnObj?.[item.key as string]?.displayOrder ?? 0);
    }
    else {
      fixedColumnControls = fixedColumnControls.filter(item => Boolean(item.fixed));
    }
    return fixedColumnControls;
  }

  public get nonFixedColumnControls(): SdSheetColumnControl[] {
    let nonFixedColumnControls = this.columnControls?.toArray() ?? [];
    if (this.key !== undefined && this._config?.columnObj) {
      nonFixedColumnControls = nonFixedColumnControls.filter(item => !(this._config?.columnObj?.[item.key as string]?.fixed ?? item.fixed));
      nonFixedColumnControls = nonFixedColumnControls.filter(item => !this._config?.columnObj?.[item.key as string]?.hidden);
      nonFixedColumnControls = nonFixedColumnControls.orderBy(item => this._config?.columnObj?.[item.key as string]?.displayOrder ?? 0);
    }
    else {
      nonFixedColumnControls = nonFixedColumnControls.filter(item => !item.fixed);
    }
    return nonFixedColumnControls;
  }

  public get hasHeaderGroup(): boolean {
    return (this.columnControls?.filter(item => item.group !== undefined).length ?? 0) > 0;
  }

  public get hasSummaryGroup(): boolean {
    return (this.columnControls?.filter(item => Boolean(item.summaryTemplateRef)).length ?? 0) > 0;
  }

  public get displayItems(): any[] {
    if (this.pageItemCount !== undefined && this.pageItemCount !== 0 && this.items.length > 0) {
      return this.items.slice(this.page * this.pageItemCount, (this.page + 1) * this.pageItemCount);
    }
    else {
      return this.items;
    }
  }

  public getColumnWidthPixel(columnControl: SdSheetColumnControl): number {
    if (
      this.key !== undefined &&
      columnControl.key !== undefined &&
      this._config &&
      this._config.columnObj &&
      this._config.columnObj[columnControl.key]?.widthPixel !== undefined
    ) {
      return this._config.columnObj[columnControl.key]!.widthPixel!;
    }
    return columnControl.widthPixel;
  }

  public getIsSelectedItem(item: any): boolean {
    return this.selectedItems.includes(item);
  }

  public getIsExpandedItem(item: any): boolean {
    return this.expandedItems.includes(item);
  }

  public getIsAllSelected(): boolean {
    return this.getDisplayItemDefs().every(item => !item.selectable || this.getIsSelectedItem(item.item));
  }

  public getIsColumnOrderingDesc(key: string): boolean | undefined {
    return this.ordering.single(item => item.key === key)?.desc;
  }

  public getColumnOrderingOrderText(key: string): string {
    if (this.ordering.length < 2) return "";

    const orderingItem = this.ordering.single(item => item.key === key);
    if (!orderingItem) return "";

    return (this.ordering.indexOf(orderingItem) + 1).toString();
  }

  public trackByFnForColumnControl = (index: number, item: SdSheetColumnControl): any => item.guid;
  public trackByFnForHeaderGroup = (index: number, item: { name?: string; widthPixel: number }): any => item;

  private readonly _itemsDiffer: IterableDiffer<any>;

  private readonly _el: HTMLElement;

  public constructor(private readonly _elRef: ElementRef,
                     private readonly _zone: NgZone,
                     private readonly _cdr: ChangeDetectorRef,
                     private readonly _iterableDiffers: IterableDiffers,
                     private readonly _modal: SdModalProvider,
                     private readonly _systemConfig: SdSystemConfigRootProvider) {
    this._el = this._elRef.nativeElement;

    this._itemsDiffer = this._iterableDiffers.find([])
      .create((i: number, item: any) => this.trackByFn(i, item));
  }

  public async ngOnInit(): Promise<void> {
    this._zone.runOutsideAngular(() => {
      {
        const headEl = this._el.findFirst("> sd-dock-container > sd-pane > ._sheet > ._head")!;
        headEl.addEventListener("resize", event => {
          if (event.prevHeight !== event.newHeight) {
            const bodyEl = this._el.findFirst("> sd-dock-container > sd-pane > ._sheet > ._body")!;
            bodyEl.style.paddingTop = event.newHeight + "px";
          }
        });

        const paneEl = this._el.findFirst("> sd-dock-container > sd-pane")!;
        paneEl.addEventListener("mousewheel", event => {
          event.preventDefault();
          event.stopPropagation();

          paneEl.scrollTop += (event as WheelEvent).deltaY;
          paneEl.scrollLeft += (event as WheelEvent).deltaX;
        });
        paneEl.addEventListener("scroll", event => {
          headEl.style.top = paneEl.scrollTop + "px";

          const fixedCellGroupEls = paneEl.findAll("> ._sheet > ._content > ._row > ._fixed-cell-group");
          for (const fixedCellGroupEl of fixedCellGroupEls) {
            fixedCellGroupEl.style.left = paneEl.scrollLeft + "px";
          }
        });

        const bodyEl = this._el.findFirst("> sd-dock-container > sd-pane > ._sheet > ._body")!;
        bodyEl.addEventListener("resize", event => {
          if (event.prevWidth !== event.newWidth) {
            const rowFocusIndicatorEl = paneEl.findFirst("> ._row-focus-indicator")!;
            rowFocusIndicatorEl.style.width = (bodyEl.offsetWidth + 1) + "px";
          }
        });

        this._el.addEventListener("keydown", this.onKeydownAllChildOutside.bind(this), true);

        this._el.addEventListener("focus", event => {
          if (
            event.target &&
            (event.target instanceof HTMLElement) &&
            event.target.matches("._sheet > ._body > ._row > ._cell-group > ._cell")
          ) {
            const cellEl = event.target;
            const rowEl = event.target.findParent("._row");
            const rowBorderTopWidth = rowEl ? Number(getComputedStyle(rowEl).borderTopWidth.replace(/[^0-9]/g, "")) : 0;

            const cellOffset = cellEl.getRelativeOffset(paneEl);

            const cellFocusIndicatorEl = paneEl.findFirst("> ._cell-focus-indicator")!;
            cellFocusIndicatorEl.style.top = (paneEl.scrollTop + cellOffset.top - 1 + rowBorderTopWidth) + "px";
            cellFocusIndicatorEl.style.left = (paneEl.scrollLeft + cellOffset.left - 1) + "px";
            cellFocusIndicatorEl.style.width = (cellEl.offsetWidth + 1) + "px";
            cellFocusIndicatorEl.style.height = (cellEl.offsetHeight + 1) + "px";
            cellFocusIndicatorEl.style.display = "block";
          }

          if (event.target && (event.target instanceof HTMLElement)) {
            const cellEl = (
              event.target.matches("._sheet > ._body > ._row > ._cell-group > ._cell") ?
                event.target :
                event.target.findParent("._sheet > ._body > ._row > ._cell-group > ._cell")
            );
            if (cellEl) {
              const rowEl = cellEl.findParent("._sheet > ._body > ._row")!;
              const rowOffset = rowEl.getRelativeOffset(paneEl);

              const rowFocusIndicatorEl = paneEl.findFirst("> ._row-focus-indicator")!;
              rowFocusIndicatorEl.style.top = (paneEl.scrollTop + rowOffset.top - 1) + "px";
              rowFocusIndicatorEl.style.left = (paneEl.scrollLeft + rowOffset.left - 1) + "px";
              rowFocusIndicatorEl.style.width = (rowEl.offsetWidth + 1) + "px";
              rowFocusIndicatorEl.style.height = (rowEl.offsetHeight + 1) + "px";
              rowFocusIndicatorEl.style.display = "block";
            }
          }

          if (
            this.autoSelect === "focus" &&
            event.target &&
            (event.target instanceof HTMLElement) &&
            event.target.findParent("._row")
          ) {
            const rowEls = this._el.findAll("> sd-dock-container > sd-pane > ._sheet > ._body > ._row");
            const rowEl = event.target.findParent("._row")!;
            const rowIndex = rowEls.indexOf(rowEl);
            if (rowIndex < 0) return;

            const itemDef = this.getDisplayItemDefs().filter(item1 => item1.visible)[rowIndex];
            if (itemDef === undefined) return;

            this._zone.run(() => {
              this._selectItem(itemDef.item, itemDef.index);
            });
          }

          const focusedEl = event.target as HTMLElement;
          const focusedElOffset = focusedEl.getRelativeOffset(paneEl);

          const headHeight = headEl.offsetHeight;

          if (focusedElOffset.top < headHeight) {
            paneEl.scrollTop -= (headHeight - focusedElOffset.top);
          }
          if (focusedElOffset.left < this.fixedCellGroupWidthPixel) {
            paneEl.scrollLeft -= (this.fixedCellGroupWidthPixel - focusedElOffset.left);
          }
        }, true);

        this._el.addEventListener("blur", event => {
          const focusIndicatorEl = paneEl.findFirst("> ._cell-focus-indicator")!;
          focusIndicatorEl.style.display = "none";

          const rowFocusIndicatorEl = paneEl.findFirst("> ._row-focus-indicator")!;
          rowFocusIndicatorEl.style.display = "none";
        }, true);
      }

      if (this.autoHeight) {
        this._el.addEventListener("mutation-child", event => {
          const rowEls = event.mutations
            .mapMany(item => Array.from(item.addedNodes))
            .ofType(HTMLElement)
            .filter(addNode => addNode.className.includes("_cell"))
            .map(item => item.findParent("._row")!)
            .distinct(true)
            .filter(item => item.findParent(this._el) !== undefined);

          for (const rowEl of rowEls) {
            const cellEls = rowEl.findAll("> ._cell-group > ._cell");

            for (const cellEl of cellEls) {
              const cellContentEl = cellEl.findFirst("> ._cell-content")!;
              cellContentEl.addEventListener("resize", event1 => {
                if (event1.prevHeight !== event1.newHeight) {
                  const maxCellContentHeight =
                    cellEls.max(cellEl1 => cellEl1.findFirst("> ._cell-content")!.offsetHeight)!;
                  for (const cellEl1 of cellEls) {
                    cellEl1.style.height = (maxCellContentHeight + 1) + "px";
                  }
                }
              });
            }

            {
              const maxCellContentHeight =
                cellEls.max(cellEl1 => cellEl1.findFirst("> ._cell-content")!.offsetHeight)!;
              for (const cellEl1 of cellEls) {
                cellEl1.style.height = (maxCellContentHeight + 1) + "px";
              }
            }
          }
        }, true);
      }
    });

    if (this.key !== undefined) {
      this._config = await this._systemConfig.getAsync(`sd-sheet.${this.key}`);
    }
    this._cdr.markForCheck();
  }

  public ngDoCheck(): void {
    if (this._itemsDiffer.diff(this.items)) {
      this._cdr.markForCheck();
    }
  }

  public onItemExpandIconClick(event: MouseEvent, item: any): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.expandedItems.includes(item)) {
      this.expandedItems.push(item);
      this.expandedItemsChange.emit(this.expandedItems);
    }
    else {
      this.expandedItems.remove(item);
      this.expandedItemsChange.emit(this.expandedItems);
    }
  }

  public onAllSelectIconClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.selectMode === "multi") {
      if (this.getIsAllSelected()) {
        this.selectedItems = [];
        this.selectedItemsChange.emit(this.selectedItems);
      }
      else {
        this.selectedItems = [...this.getDisplayItemDefs().filter(item => item.selectable).map(item => item.item)];
        this.selectedItemsChange.emit(this.selectedItems);
      }
    }
  }

  public onItemSelectIconClick(event: MouseEvent, item: any, index: number): void {
    event.preventDefault();
    event.stopPropagation();

    this._toggleItemSelection(item, index);
  }

  public onItemRowClick(event: MouseEvent, item: any, index: number): void {
    if (this.autoSelect === "click") {
      this._selectItem(item, index);
    }
  }

  private _toggleItemSelection(item: any, index: number): void {
    if (this.selectMode === undefined || (this.getItemSelectableFn && this.getItemSelectableFn(index, item) !== true)) {
      return;
    }

    if (this.selectMode === "single") {
      if (this.selectedItems[0] === item) {
        this.selectedItems = [];
        this.selectedItemsChange.emit(this.selectedItems);
      }
      else {
        this.selectedItems = [item];
        this.selectedItemsChange.emit(this.selectedItems);
      }
    }
    else {
      if (this.selectedItems.includes(item)) {
        this.selectedItems.remove(item);
        this.selectedItemsChange.emit(this.selectedItems);
      }
      else {
        this.selectedItems.push(item);
        this.selectedItemsChange.emit(this.selectedItems);
      }
    }
  }

  public _selectItem(item: any, index: number): void {
    if (this.selectMode === undefined || (this.getItemSelectableFn !== undefined && this.getItemSelectableFn(index, item) !== true)) {
      return;
    }

    if (this.selectMode === "single") {
      if (this.selectedItems[0] !== item) {
        this.selectedItems = [item];
        this.selectedItemsChange.emit(this.selectedItems);
      }
    }
    else {
      if (!this.selectedItems.includes(item)) {
        this.selectedItems.push(item);
        this.selectedItemsChange.emit(this.selectedItems);
      }
    }
  }

  public onFixedCellGroupResize(event: SdResizeEvent): void {
    if (event.prevWidth !== event.newWidth) {
      this.fixedCellGroupWidthPixel = event.newWidth;
    }
  }

  public onPageChange(page: number): void {
    this.page = page;
    this.pageChange.emit(this.page);
  }

  public async onConfigButtonClick(): Promise<void> {
    const result = await this._modal.showAsync(SdSheetConfigModal, "시트 설정창", {
      controls: this.columnControls!.toArray(),
      configObj: this._config?.columnObj
    }, {
      useCloseByBackdrop: true
    });
    if (!result) return;

    this._config = this._config ?? {};
    this._config.columnObj = result;
    await this._systemConfig.setAsync(`sd-sheet.${this.key!}`, this._config);
    this._cdr.markForCheck();
  }

  public onHeadCellBorderMousedown(event: MouseEvent, columnControl: SdSheetColumnControl): void {
    if (!columnControl.resizable) return;

    const cellEl = (event.target as HTMLElement).findParent("._cell") as HTMLElement;
    const startX = event.clientX;
    const startWidth = cellEl.clientWidth;

    const doDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      cellEl.style.width = `${startWidth + e.clientX - startX}px`;
    };

    const stopDrag = async (e: MouseEvent): Promise<void> => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);

      const widthPixel = Number(cellEl.style.width.replace(/px/g, ""));
      if (this.key !== undefined && columnControl.key !== undefined) {
        this._config = this._config ?? {};
        this._config.columnObj = this._config.columnObj ?? {};
        this._config.columnObj[columnControl.key] = this._config.columnObj[columnControl.key] ?? {};
        this._config.columnObj[columnControl.key]!.widthPixel = widthPixel;

        await this._systemConfig.setAsync(`sd-sheet.${this.key}`, this._config);
      }

      columnControl.widthPixel = widthPixel;
      this._cdr.markForCheck();
    };

    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }

  public onKeydownAllChildOutside(event: KeyboardEvent): void {
    if (!event.target || !(event.target instanceof HTMLElement)) {
      return;
    }

    const cellEl = (
      event.target.matches("._sheet > ._body > ._row > ._cell-group > ._cell") ? event.target :
        event.target.findParent("._sheet > ._body > ._row > ._cell-group > ._cell")
    );

    if (!cellEl) return;

    // 셀에서
    if (event.target.matches("._sheet > ._body > ._row > ._cell-group > ._cell")) {
      if (event.key === "F2") {
        event.preventDefault();

        const firstForcusableEl = cellEl.findFocusableAll()[0];
        if (firstForcusableEl !== undefined) {
          firstForcusableEl.focus();
        }
        else {
          cellEl.focus();
        }
      }
      else if (event.key === "ArrowDown") {
        event.preventDefault();

        const currCellAddr = this._getCellAddress(cellEl);
        if (!currCellAddr) return;

        const nextRowCellEl = this._getCellEl(currCellAddr.r + 1, currCellAddr.c);
        if (!nextRowCellEl) return;

        nextRowCellEl.focus();
      }
      else if (event.key === "ArrowUp") {
        event.preventDefault();

        const currCellAddr = this._getCellAddress(cellEl);
        if (!currCellAddr) return;

        const prevRowCellEl = this._getCellEl(currCellAddr.r - 1, currCellAddr.c);
        if (!prevRowCellEl) return;

        prevRowCellEl.focus();
      }
      else if (event.key === "ArrowRight") {
        event.preventDefault();

        const currCellAddr = this._getCellAddress(cellEl);
        if (!currCellAddr) return;

        const nextColCellEl = this._getCellEl(currCellAddr.r, currCellAddr.c + 1);
        if (!nextColCellEl) return;

        nextColCellEl.focus();
      }
      else if (event.key === "ArrowLeft") {
        event.preventDefault();

        const currCellAddr = this._getCellAddress(cellEl);
        if (!currCellAddr) return;

        const prevColCellEl = this._getCellEl(currCellAddr.r, currCellAddr.c - 1);
        if (!prevColCellEl) return;

        prevColCellEl.focus();
      }
    }
    // 셀안의 컨트롤에서
    else {
      if (event.key === "Escape") {
        event.preventDefault();
        cellEl.focus();
      }
      else if ((event.ctrlKey && event.key === "ArrowDown") || event.key === "Enter") {
        event.preventDefault();

        const currCellAddr = this._getCellAddress(cellEl);
        if (!currCellAddr) return;

        const nextRowCellEl = this._getCellEl(currCellAddr.r + 1, currCellAddr.c);
        if (!nextRowCellEl) return;

        const firstForcusableEl = nextRowCellEl.findFocusableAll()[0];
        if (firstForcusableEl !== undefined) {
          firstForcusableEl.focus();
        }
        else {
          nextRowCellEl.focus();
        }
      }
      else if (event.ctrlKey && event.key === "ArrowUp") {
        event.preventDefault();

        const currCellAddr = this._getCellAddress(cellEl);
        if (!currCellAddr) return;

        const prevRowCellEl = this._getCellEl(currCellAddr.r - 1, currCellAddr.c);
        if (!prevRowCellEl) return;

        const firstForcusableEl = prevRowCellEl.findFocusableAll()[0];
        if (firstForcusableEl !== undefined) {
          firstForcusableEl.focus();
        }
        else {
          prevRowCellEl.focus();
        }
      }
      else if (event.ctrlKey && event.key === "ArrowLeft") {
        event.preventDefault();

        const currCellAddr = this._getCellAddress(cellEl);
        if (!currCellAddr) return;

        const prevColCellEl = this._getCellEl(currCellAddr.r, currCellAddr.c - 1);
        if (!prevColCellEl) return;

        const firstForcusableEl = prevColCellEl.findFocusableAll()[0];
        if (firstForcusableEl !== undefined) {
          firstForcusableEl.focus();
        }
        else {
          prevColCellEl.focus();
        }
      }
      else if (event.ctrlKey && event.key === "ArrowRight") {
        event.preventDefault();

        const currCellAddr = this._getCellAddress(cellEl);
        if (!currCellAddr) return;

        const nextColCellEl = this._getCellEl(currCellAddr.r, currCellAddr.c + 1);
        if (!nextColCellEl) return;

        const firstForcusableEl = nextColCellEl.findFocusableAll()[0];
        if (firstForcusableEl !== undefined) {
          firstForcusableEl.focus();
        }
        else {
          nextColCellEl.focus();
        }
      }
      else if (event.key === "Tab" && !event.shiftKey) {
        event.preventDefault();

        const currCellAddr = this._getCellAddress(cellEl);
        if (!currCellAddr) return;

        const nextColCellEl = this._getCellEl(currCellAddr.r, currCellAddr.c + 1);
        if (nextColCellEl) {
          const firstForcusableEl = nextColCellEl.findFocusableAll()[0];
          if (firstForcusableEl !== undefined) {
            firstForcusableEl.focus();
          }
          else {
            nextColCellEl.focus();
          }
        }
        else {
          const nextRowCellEl = this._getCellEl(currCellAddr.r + 1, 1);
          if (!nextRowCellEl) return;

          const firstForcusableEl = nextRowCellEl.findFocusableAll()[0];
          if (firstForcusableEl !== undefined) {
            firstForcusableEl.focus();
          }
          else {
            nextRowCellEl.focus();
          }
        }
      }
      else if (event.key === "Tab" && event.shiftKey) {
        event.preventDefault();

        const currCellAddr = this._getCellAddress(cellEl);
        if (!currCellAddr) return;

        const prevColCellEl = this._getCellEl(currCellAddr.r, currCellAddr.c - 1);
        if (prevColCellEl) {
          const firstForcusableEl = prevColCellEl.findFocusableAll()[0];
          if (firstForcusableEl !== undefined) {
            firstForcusableEl.focus();
          }
          else {
            prevColCellEl.focus();
          }
        }
        else {
          const prevRowCellEl = this._getCellEl(currCellAddr.r - 1, "last");
          if (!prevRowCellEl) return;

          const firstForcusableEl = prevRowCellEl.findFocusableAll()[0];
          if (firstForcusableEl !== undefined) {
            firstForcusableEl.focus();
          }
          else {
            prevRowCellEl.focus();
          }
        }
      }
    }
  }

  public onColumnOrderingHeaderClick(event: MouseEvent, columnControl: SdSheetColumnControl): void {
    if (columnControl.key === undefined) return;

    if (event.shiftKey || event.ctrlKey) {
      const orderingItem = this.ordering.single(item => item.key === columnControl.key);
      if (orderingItem) {
        if (orderingItem.desc) {
          this.ordering.remove(orderingItem);
        }
        else {
          orderingItem.desc = !orderingItem.desc;
        }
      }
      else {
        this.ordering.push({key: columnControl.key, desc: false});
      }
    }
    else {
      if (this.ordering.length === 1 && this.ordering[0].key === columnControl.key) {
        const orderingItem = this.ordering[0];
        if (orderingItem.desc) {
          this.ordering.remove(orderingItem);
        }
        else {
          orderingItem.desc = !orderingItem.desc;
        }
      }
      else {
        this.ordering = [{key: columnControl.key, desc: false}];
      }
    }

    this.orderingChange.emit(this.ordering);
  }

  private _getCellAddress(cellEl: HTMLElement): { r: number; c: number } | undefined {
    const rowEls = this._el.findAll("> sd-dock-container > sd-pane > ._sheet > ._body > ._row");
    const rowEl = cellEl.findParent("._sheet > ._body > ._row");
    if (!rowEl) return undefined;

    const r = rowEls.indexOf(rowEl);
    if (r < 0) return undefined;

    const cellEls = rowEl.findAll("> ._cell-group > ._cell");
    const c = cellEls.indexOf(cellEl);
    if (c <= 0) return undefined;

    return {r, c};
  }

  private _getCellEl(r: number, c: number | "last"): HTMLElement | undefined {
    if (c <= 0) return undefined;

    const rowEls = this._el.findAll("> sd-dock-container > sd-pane > ._sheet > ._body > ._row");
    const rowEl = rowEls[r];
    if (rowEl === undefined) return undefined;

    const cellEls = rowEl.findAll("> ._cell-group > ._cell");
    return c === "last" ? cellEls.last() : cellEls[c];
  }

  private _getHeaderGroups(columnControls: SdSheetColumnControl[]): { name?: string; widthPixel: number }[] {
    const result: { name?: string; widthPixel: number }[] = [];
    for (const columnControl of columnControls) {
      const groupName = columnControl.group;
      const lastResult = result.last();
      if (lastResult && lastResult.name === groupName) {
        lastResult.widthPixel += this.getColumnWidthPixel(columnControl);
      }
      else {
        result.push({
          name: groupName,
          widthPixel: this.getColumnWidthPixel(columnControl)
        });
      }
    }

    return result;
  }

  private getDisplayItemDefs(): { index: number; depth: number; visible: boolean; selectable: boolean; item: any }[] {
    const result: { index: number; depth: number; visible: boolean; selectable: boolean; item: any }[] = [];

    const loop = (index: number, item: any, depth: number, visible: boolean): void => {
      result.push({
        index,
        item,
        depth,
        visible,
        selectable: this.selectMode !== undefined && (this.getItemSelectableFn === undefined || this.getItemSelectableFn(index, item) === true)
      });

      if (this.getChildrenFn) {
        const children = this.getChildrenFn(index, item);
        if (children === undefined || children.length < 1) {
          return;
        }

        for (let i = 0; i < children.length; i++) {
          loop(i, children[i], depth + 1, visible && this.getIsExpandedItem(item));
        }
      }
    };

    for (let i = 0; i < this.displayItems.length; i++) {
      loop(i, this.displayItems[i], 0, true);
    }

    return result;
  }
}

export interface ISdSheetConfigVM {
  columnObj?: { [key: string]: ISdSheetColumnConfigVM | undefined };
}

export interface ISdSheetColumnConfigVM {
  fixed?: boolean;
  header?: string;
  widthPixel?: number;
  displayOrder?: number;
  hidden?: boolean;
}

export interface ISdSheetColumnOrderingVM {
  key: string;
  desc: boolean;
}