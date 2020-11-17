import {
  AfterContentChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ContentChildren,
  DoCheck,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostBinding,
  Input,
  IterableChangeRecord,
  IterableDiffer,
  IterableDiffers,
  KeyValueDiffer,
  KeyValueDiffers,
  NgZone,
  OnInit,
  Output,
  QueryList,
  TemplateRef
} from "@angular/core";
import { SdSheetColumnControl } from "./SdSheetColumnControl";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { ISdResizeEvent } from "@simplysm/sd-core-browser";
import { SdModalProvider } from "../providers/SdModalProvider";
import { SdSheetConfigModal } from "../modals/SdSheetConfigModal";
import { SdSystemConfigRootProvider } from "../root-providers/SdSystemConfigRootProvider";
import { ObjectUtil } from "@simplysm/sd-core-common";

@Component({
  selector: "sd-sheet",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dock-container>
      <sd-dock *ngIf="(key || pageLength > 0) && !hideConfigBar">
        <div class="_icon-container">
          <sd-anchor class="_card-icon"
                     *ngIf="useCardDisplayType"
                     (click)="onDisplayTypeChangeButtonClick()">
            <sd-icon [icon]="displayType === 'card' ? 'bars' : 'table'" fixedWidth></sd-icon>
          </sd-anchor>
          <sd-anchor class="_cog-icon" (click)="onConfigButtonClick()"
                     *ngIf="key">
            <sd-icon icon="cog" fixedWidth></sd-icon>
          </sd-anchor>
        </div>

        <sd-pagination [page]="page"
                       [pageLength]="pageLength"
                       (pageChange)="onPageChange($event)"></sd-pagination>
      </sd-dock>

      <sd-pane [hidden]="displayType !== 'sheet'" [attr.sd-display-type]="'sheet'">
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
                    <sd-icon class="_icon _expand-icon" *ngIf="getChildrenFn" fixedWidth></sd-icon>
                  </div>
                  <div class="_border"></div>
                </div>
                <ng-container *ngFor="let headerGroup of fixedHeaderGroups; trackBy: trackByFnForHeaderGroup">
                  <div class="_cell" [style.width.px]="headerGroup.widthPixel">
                    <div class="_cell-content">
                      <pre class="_header-text-content">{{ headerGroup.name }}</pre>
                    </div>
                    <div class="_border _border-split"></div>
                  </div>
                </ng-container>
              </div>
              <!-- 셀 그룹 -->
              <div class="_cell-group">
                <ng-container *ngFor="let headerGroup of nonFixedHeaderGroups; trackBy: trackByFnForHeaderGroup">
                  <div class="_cell"
                       [style.width.px]="headerGroup.widthPixel">
                    <div class="_cell-content">
                      <pre class="_header-text-content">{{ headerGroup.name }}</pre>
                    </div>
                    <div class="_border _border-split"></div>
                  </div>
                </ng-container>
              </div>
            </div>

            <!-- 헤더 ROW -->
            <div class="_row _header-row">
              <!-- 고정 셀 그룹 -->
              <div class="_cell-group _fixed-cell-group"
                   (sdResize)="onFixedCellGroupResize($event)">
                <div class="_border" style="pointer-events: none"></div>
                <div class="_cell _feature-cell">
                  <div class="_cell-content">
                    <sd-icon class="_icon _selected-icon"
                             [icon]="selectMode === 'multi' ? 'check' : undefined"
                             (click)="onAllSelectIconClick($event)"
                             [class._selected]="getIsAllSelected()"
                             [class._selectable]="selectMode === 'multi'"
                             fixedWidth></sd-icon>
                    <sd-icon class="_icon _expand-icon"
                             *ngIf="getChildrenFn"
                             [icon]="getHasParentItem() ? 'caret-right' : undefined"
                             (click)="onAllExpandIconClick($event)"
                             [class._expanded]="getIsAllExpanded()"
                             [class._expandable]="getHasParentItem()"
                             [rotate]="getIsAllExpanded() ? 90 : undefined"
                             fixedWidth></sd-icon>
                  </div>
                  <div class="_border"></div>
                </div>
                <ng-container *ngFor="let columnControl of fixedColumnControls; trackBy: trackByFnForColumnControl">
                  <div class="_cell"
                       [attr.sd-key]="columnControl.key"
                       [style.width.px]="columnWidthPixelMap.get(columnControl.guid)"
                       [attr.title]="columnControl.tooltip || columnControl.header"
                       [class._resizable]="columnControl.resizable">
                    <div class="_cell-content">
                      <ng-container *ngIf="columnControl.useOrdering && columnControl.key">
                        <sd-anchor class="_header-text-content sd-text-brightness-default"
                                   (click)="onColumnOrderingHeaderClick($event, columnControl)">
                          <div style="position: absolute; right: 0; display: inline-block;"
                               class="sd-background-color-grey-lightest">
                            <sd-icon-layer>
                              <sd-icon icon="sort" class="sd-text-brightness-lightest"></sd-icon>
                              <sd-icon icon="sort-down"
                                       *ngIf="getIsColumnOrderingDesc(columnControl.key) === false"></sd-icon>
                              <sd-icon icon="sort-up"
                                       *ngIf="getIsColumnOrderingDesc(columnControl.key) === true"></sd-icon>
                            </sd-icon-layer>
                            <small
                              style="padding-right: 2px;">{{ getColumnOrderingOrderText(columnControl.key) }}</small>
                          </div>
                          <span *ngIf="!columnControl.headerTemplateRef">{{ columnControl.header }}</span>
                          <ng-template [ngTemplateOutlet]="columnControl.headerTemplateRef"></ng-template>
                          &nbsp;
                        </sd-anchor>
                      </ng-container>
                      <ng-container *ngIf="!(columnControl.useOrdering && columnControl.key)">
                        <pre class="_header-text-content"
                             *ngIf="!columnControl.headerTemplateRef">{{ columnControl.header }}</pre>
                        <ng-template [ngTemplateOutlet]="columnControl.headerTemplateRef"></ng-template>
                      </ng-container>
                    </div>
                    <div class="_border" (mousedown)="onHeadCellBorderMousedown($event, columnControl)"
                         [ngClass]="{'_border-split': this.isGroupLastColumMap.get(columnControl.guid)}"></div>
                  </div>
                </ng-container>
              </div>
              <!-- 셀 그룹 -->
              <div class="_cell-group">
                <ng-container *ngFor="let columnControl of nonFixedColumnControls; trackBy: trackByFnForColumnControl">
                  <div class="_cell"
                       [attr.sd-key]="columnControl.key"
                       [style.width.px]="columnWidthPixelMap.get(columnControl.guid)"
                       [attr.title]="columnControl.tooltip || columnControl.header"
                       [class._resizable]="columnControl.resizable">
                    <div class="_cell-content">
                      <ng-container *ngIf="columnControl.useOrdering && columnControl.key">
                        <sd-anchor class="_header-text-content sd-text-brightness-default"
                                   (click)="onColumnOrderingHeaderClick($event, columnControl)">
                          <div style="position: absolute; right: 0; display: inline-block;"
                               class="sd-background-color-grey-lightest">
                            <sd-icon-layer>
                              <sd-icon icon="sort" class="sd-text-brightness-lightest"></sd-icon>
                              <sd-icon icon="sort-down"
                                       *ngIf="getIsColumnOrderingDesc(columnControl.key) === false"></sd-icon>
                              <sd-icon icon="sort-up"
                                       *ngIf="getIsColumnOrderingDesc(columnControl.key) === true"></sd-icon>
                            </sd-icon-layer>
                            <small
                              style="padding-right: 2px;">{{ getColumnOrderingOrderText(columnControl.key) }}</small>
                          </div>
                          <span *ngIf="!columnControl.headerTemplateRef">{{ columnControl.header }}</span>
                          <ng-template [ngTemplateOutlet]="columnControl.headerTemplateRef"></ng-template>
                          &nbsp;
                        </sd-anchor>
                      </ng-container>
                      <ng-container *ngIf="!(columnControl.useOrdering && columnControl.key)">
                        <pre class="_header-text-content"
                             *ngIf="!columnControl.headerTemplateRef">{{ columnControl.header }}</pre>
                        <ng-template [ngTemplateOutlet]="columnControl.headerTemplateRef"></ng-template>
                      </ng-container>
                    </div>
                    <div class="_border" (mousedown)="onHeadCellBorderMousedown($event, columnControl)"
                         [ngClass]="{'_border-split':  this.isGroupLastColumMap.get(columnControl.guid)}"></div>
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
                    <sd-icon class="_icon _expand-icon" *ngIf="getChildrenFn" fixedWidth></sd-icon>
                  </div>
                  <div class="_border"></div>
                </div>
                <ng-container *ngFor="let columnControl of fixedColumnControls; trackBy: trackByFnForColumnControl">
                  <div class="_cell"
                       [attr.sd-key]="columnControl.key"
                       [style.width.px]="columnWidthPixelMap.get(columnControl.guid)">
                    <div class="_cell-content">
                      <ng-template [ngTemplateOutlet]="columnControl.summaryTemplateRef"></ng-template>
                    </div>
                    <div class="_border"
                         [ngClass]="{'_border-split':  this.isGroupLastColumMap.get(columnControl.guid)}"></div>
                  </div>
                </ng-container>
              </div>
              <!-- 셀 그룹 -->
              <div class="_cell-group">
                <ng-container *ngFor="let columnControl of nonFixedColumnControls; trackBy: trackByFnForColumnControl">
                  <div class="_cell"
                       [attr.sd-key]="columnControl.key"
                       [style.width.px]="columnWidthPixelMap.get(columnControl.guid)">
                    <div class="_cell-content">
                      <ng-template [ngTemplateOutlet]="columnControl.summaryTemplateRef"></ng-template>
                    </div>
                    <div class="_border"
                         [ngClass]="{'_border-split':  this.isGroupLastColumMap.get(columnControl.guid)}"></div>
                  </div>
                </ng-container>
              </div>
            </div>
          </div>
          <!-- 바디 구역 -->
          <div class="_content _body">
            <!-- ROW 템플릿 -->
            <ng-template #itemRowTemplate let-item="item" let-index="index" let-depth="depth" let-parent="parent">
              <div class="_row"
                   [class._selected]="getIsSelectedItem(item)"
                   (click)="onItemRowClick($event, item, index)"
                   (keydown)="onItemRowKeydown($event, item, index)">
                <!-- 고정 셀 그룹 -->
                <div class="_cell-group _fixed-cell-group">
                  <div class="_border"></div>
                  <div class="_cell _feature-cell">
                    <div class="_cell-content">
                      <sd-icon class="_icon _selected-icon"
                               [icon]="selectMode && (!getItemSelectableFn || getItemSelectableFn(index, item)) ? 'check' : undefined"
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
                               [icon]="getChildrenFn(index, item)?.length > 0 ? 'caret-right' : undefined"
                               (click)="onItemExpandIconClick($event, item)"
                               [class._expanded]="getIsExpandedItem(item)"
                               [class._expandable]="getChildrenFn(index, item)?.length > 0"
                               [rotate]="getIsExpandedItem(item) ? 90 : undefined"
                               fixedWidth></sd-icon>
                    </div>
                    <div class="_border"></div>
                  </div>
                  <ng-container *ngFor="let columnControl of fixedColumnControls; trackBy: trackByFnForColumnControl">
                    <div class="_cell"
                         [attr.sd-key]="columnControl.key"
                         [attr.sd-row-index]="index"
                         [attr.sd-column-guid]="columnControl.guid"
                         [style.width.px]="columnWidthPixelMap.get(columnControl.guid)" tabindex="0">
                      <div class="_cell-content"
                           (dblclick)="onCellDblClick($event)">
                        <ng-template [ngTemplateOutlet]="columnControl.cellTemplateRef"
                                     [ngTemplateOutletContext]="{item: item, index: index, edit: getIsEditCell(index, columnControl), parent: parent}"></ng-template>
                      </div>
                      <div class="_border"
                           [ngClass]="{'_border-split':  this.isGroupLastColumMap.get(columnControl.guid)}"></div>
                    </div>
                  </ng-container>
                </div>
                <!-- 셀 그룹 -->
                <div class="_cell-group">
                  <ng-container
                    *ngFor="let columnControl of nonFixedColumnControls; trackBy: trackByFnForColumnControl">
                    <div class="_cell"
                         [attr.sd-key]="columnControl.key"
                         [attr.sd-row-index]="index"
                         [attr.sd-column-guid]="columnControl.guid"
                         [style.width.px]="columnWidthPixelMap.get(columnControl.guid)" tabindex="0">
                      <div class="_cell-content"
                           (dblclick)="onCellDblClick($event)">
                        <ng-template [ngTemplateOutlet]="columnControl.cellTemplateRef"
                                     [ngTemplateOutletContext]="{item: item, index: index, edit: getIsEditCell(index, columnControl), parent: parent}"></ng-template>
                      </div>
                      <div class="_border"
                           [ngClass]="{'_border-split':  this.isGroupLastColumMap.get(columnControl.guid)}"></div>
                    </div>
                  </ng-container>
                </div>
                <div class="_selected-indicator"></div>
              </div>

              <!-- CHILDREN FOR 문 -->
              <ng-container *ngIf="getIsExpandedItem(item) && getChildrenFn && getChildrenFn(index, item)?.length > 0">
                <div class="sd-border-top-brightness-default"></div>
                <ng-container
                  *ngFor="let childItem of getChildrenFn(index, item); let childIndex = index; trackBy: trackByFn">
                  <ng-template [ngTemplateOutlet]="itemRowTemplate"
                               [ngTemplateOutletContext]="{item: childItem, index: childIndex, depth: depth + 1, parent: item}"></ng-template>
                </ng-container>
                <div class="sd-border-bottom-brightness-default"></div>
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

      <sd-pane *ngIf="useCardDisplayType" [hidden]="displayType !== 'card'" [attr.sd-display-type]="'card'">
        <div class="sd-padding-default"
             *ngFor="let item of items; let index = index; trackBy: trackByFn">
          <sd-card class="sd-padding-default _sd-sheet-card"
                   [class._selected]="getIsSelectedItem(item)"
                   (click)="onItemSelectIconClick($event, item, index)">
            <ng-template [ngTemplateOutlet]="cardTemplateRef"
                         [ngTemplateOutletContext]="{item: item, index: index}"></ng-template>
          </sd-card>
        </div>
      </sd-pane>
    </sd-dock-container>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    :host {
      $z-index-fixed: 1;
      $z-index-row-selected-indicator: 2;
      $z-index-row-focus-indicator: 3;
      $z-index-sheet-border: 4;
      $z-index-cell-focus-indicator: 6;
      $z-index-head: 7;
      $z-index-head-fixed: 8;

      $border-color-light: var(--theme-color-blue-grey-lightest);
      $border-color-dark: var(--theme-color-grey-light);

      > sd-dock-container {
        border: 1px solid $border-color-dark;

        > sd-dock { // 상단 DOCK (설정 아이콘 및 페이징)
          border-bottom: 1px solid $border-color-dark;

          /deep/ > div {
            > ._icon-container {
              float: right;

              > sd-anchor {
                padding: var(--gap-sm) var(--gap-default);

                &:hover {
                  background: var(--theme-color-grey-lightest);
                }
              }
            }
          }
        }

        > sd-pane[sd-display-type='sheet'] { // 하단 PANE (시트)
          z-index: 0;
          background: var(--sd-background-color);

          > ._sheet { // 시트
            display: inline-block;
            white-space: nowrap;
            position: relative;
            background: white;

            > ._border-rect {
              z-index: $z-index-sheet-border;
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              border-bottom: 1px solid $border-color-dark;
              border-right: 1px solid $border-color-dark;
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

                      &._border-split {
                        border-right-color: $border-color-dark;
                      }
                    }

                    &:focus {
                      outline: none;
                    }
                  }

                  &:last-child > ._cell:last-child > ._border {
                    border-right: 1px solid $border-color-dark;
                  }
                }

                > ._fixed-cell-group { // 고정 셀 그룹
                  position: sticky;
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
                    border-right: 2px solid $border-color-dark;
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
              position: sticky;
              top: 0;
              z-index: $z-index-head;
              user-select: none;

              > ._row { // ROW 공통
                > ._fixed-cell-group { // 고정 셀 그룹
                  z-index: $z-index-head-fixed;
                }

                &:last-child > * > ._cell {
                  border-bottom: 1px solid $border-color-dark;
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
                    &._resizable { // 크기조절가능한 셀일 경우
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
            background: var(--theme-color-grey-default);
            opacity: .1;
          }
        }

        > sd-pane[sd-display-type='card'] {
          background: var(--sd-background-color);

          /deep/ ._sd-sheet-card {
            cursor: pointer;
            border-radius: 5px;
            @include elevation(none);

            &._selected {
              background: var(--theme-color-primary-lighter);
            }
          }
        }
      }

      &[sd-inset=true] {
        > sd-dock-container {
          border: none !important;
        }
      }
    }
  `]
})
export class SdSheetControl implements DoCheck, OnInit, AfterContentChecked {
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
  @SdInputValidate({ type: Number, notnull: true })
  public page = 0;

  @Input()
  @SdInputValidate({ type: Number, notnull: true })
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

  private _pageLength = 0;

  @Input()
  @SdInputValidate(Number)
  public pageItemCount?: number;

  @Output()
  public readonly pageChange = new EventEmitter<number>();

  @Input()
  @SdInputValidate(Boolean)
  public hideConfigBar?: boolean;

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
  @SdInputValidate({ type: Array, notnull: true })
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
  @SdInputValidate({ type: Boolean, notnull: true })
  @HostBinding("attr.sd-inset")
  public inset = false;

  @Input()
  @SdInputValidate(Function)
  public getItemSelectableFn?: (index: number, item: any) => any;

  @Input()
  @SdInputValidate(Function)
  public getChildrenFn?: (index: number, item: any) => any;

  @Input()
  @SdInputValidate(Boolean)
  public useCardDisplayType?: boolean;

  @ContentChild("card", { static: true })
  public cardTemplateRef?: TemplateRef<{ item: any; index: number }>;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["sheet", "card"]
  })
  public displayType: "sheet" | "card" = "sheet";

  @Output()
  public readonly itemKeydown = new EventEmitter<ISdSheetItemKeydownEventParam<any>>();

  @ContentChildren(forwardRef(() => SdSheetColumnControl))
  public columnControls?: QueryList<SdSheetColumnControl>;

  public fixedCellGroupWidthPixel = 0;

  private _config?: ISdSheetConfigVM;

  private _editCell = "";

  public getIsEditCell(index: number, columnControl: SdSheetColumnControl): boolean {
    return this._editCell === index + "_" + columnControl.guid;
  }

  public hasHeaderGroup = false;
  public hasSummaryGroup = false;

  public fixedHeaderGroups: { name?: string; widthPixel: number }[] = [];
  public nonFixedHeaderGroups: { name?: string; widthPixel: number }[] = [];
  public fixedColumnControls: SdSheetColumnControl[] = [];
  public nonFixedColumnControls: SdSheetColumnControl[] = [];
  public columnWidthPixelMap = new Map<string, number>();

  public isGroupLastColumMap = new Map<string, boolean>();

  public displayItems: any[] = [];
  public displayItemDefs: { index: number; depth: number; visible: boolean; selectable: boolean; item: any }[] = [];

  private _getColumnControlsOfFixType(fixed: boolean): SdSheetColumnControl[] {
    let fixedColumnControls = this.columnControls?.toArray() ?? [];
    if (this.key !== undefined && this._config?.columnObj) {
      fixedColumnControls = fixedColumnControls
        .filter((item) => (
          Boolean(this._config!.columnObj![item.key as string]?.fixed ?? item.fixed) === fixed &&
          !this._config!.columnObj![item.key as string]?.hidden
        ))
        .orderBy((item) => this._config!.columnObj![item.key as string]?.displayOrder ?? 0);
    }
    else {
      fixedColumnControls = fixedColumnControls.filter((item) => Boolean(item.fixed) === fixed);
    }
    return fixedColumnControls;
  }

  private _getIsGroupLastColumn(columnControl: SdSheetColumnControl): boolean {
    if (!this.hasHeaderGroup) return false;

    if (columnControl.fixed) {
      const fixedColumnControls = this.fixedColumnControls;
      return fixedColumnControls[fixedColumnControls.indexOf(columnControl) + 1]?.group !== columnControl.group;
    }
    else {
      const nonFixedColumnControls = this.nonFixedColumnControls;
      return nonFixedColumnControls[nonFixedColumnControls.indexOf(columnControl) + 1]?.group !== columnControl.group;
    }
  }

  private _getColumnWidthPixel(columnControl: SdSheetColumnControl): number {
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

  public getHasParentItem(): boolean {
    return this.displayItems.some((item, i) => (this.getChildrenFn?.(i, item)?.length > 0));
  }

  public getIsAllExpanded(): boolean {
    return ObjectUtil.equal(
      this.displayItems.filter((item, i) => (this.getChildrenFn?.(i, item)?.length > 0)),
      this.expandedItems,
      {
        ignoreArrayIndex: true
      }
    );
  }

  public getIsAllSelected(): boolean {
    return this.displayItemDefs.every((item) => !item.selectable || this.getIsSelectedItem(item.item));
  }

  public getIsColumnOrderingDesc(key: string): boolean | undefined {
    return this.ordering.single((item) => item.key === key)?.desc;
  }

  public getColumnOrderingOrderText(key: string): string {
    if (this.ordering.length < 2) return "";

    const orderingItem = this.ordering.single((item) => item.key === key);
    if (!orderingItem) return "";

    return (this.ordering.indexOf(orderingItem) + 1).toString();
  }

  public trackByFnForColumnControl = (index: number, item: SdSheetColumnControl): any => item.guid;
  public trackByFnForHeaderGroup = (index: number, item: { name?: string; widthPixel: number }): any => item;

  private readonly _itemsDiffer: IterableDiffer<any>;
  private readonly _selectedItemsDiffer: IterableDiffer<any>;
  private readonly _expandedItemsDiffer: IterableDiffer<any>;
  private readonly _columnControlsDiffer: IterableDiffer<SdSheetColumnControl>;
  private readonly _configColumnObjDiffer: KeyValueDiffer<string, any>;

  private readonly _el: HTMLElement;

  public constructor(private readonly _elRef: ElementRef,
                     private readonly _zone: NgZone,
                     private readonly _cdr: ChangeDetectorRef,
                     private readonly _iterableDiffers: IterableDiffers,
                     private readonly _keyValueDiffers: KeyValueDiffers,
                     private readonly _modal: SdModalProvider,
                     private readonly _systemConfig: SdSystemConfigRootProvider) {
    this._el = this._elRef.nativeElement;

    this._itemsDiffer = this._iterableDiffers.find(this.items)
      .create((i: number, item: any) => this.trackByFn(i, item));

    this._selectedItemsDiffer = this._iterableDiffers.find(this.selectedItems)
      .create((i: number, item: any) => this.trackByFn(i, item));

    this._expandedItemsDiffer = this._iterableDiffers.find(this.expandedItems)
      .create((i: number, item: any) => this.trackByFn(i, item));

    this._columnControlsDiffer = this._iterableDiffers.find(this.columnControls ?? [])
      .create((i: number, item: SdSheetColumnControl) => this.trackByFn(i, item));

    this._configColumnObjDiffer = this._keyValueDiffers.find(this._config?.columnObj ?? {})
      .create();
  }

  public async ngOnInit(): Promise<void> {
    this._zone.runOutsideAngular(() => {
      const headEl = this._el.findFirst("> sd-dock-container > sd-pane > ._sheet > ._head")!;
      const bodyEl = this._el.findFirst("> sd-dock-container > sd-pane > ._sheet > ._body")!;

      const paneEl = this._el.findFirst("> sd-dock-container > sd-pane")!;

      bodyEl.addEventListener("resize", (event) => {
        if (event.prevWidth !== event.newWidth) {
          const rowFocusIndicatorEl = paneEl.findFirst("> ._row-focus-indicator")!;
          rowFocusIndicatorEl.style.width = (bodyEl.offsetWidth + 1) + "px";
        }
      });

      this._el.addEventListener("keydown", this.onKeydownAllChildOutside.bind(this), true);

      this._el.addEventListener("focus", (event) => {
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
          event.target &&
          (event.target instanceof HTMLElement) &&
          event.target.findParent("._row")
        ) {
          const rowEls = this._el.findAll("> sd-dock-container > sd-pane > ._sheet > ._body > ._row");
          const rowEl = event.target.findParent("._row")!;
          const rowIndex = rowEls.indexOf(rowEl);
          if (rowIndex < 0) return;

          const itemDef = this.displayItemDefs.filter((item1) => item1.visible)[rowIndex];
          if (typeof itemDef === "undefined") return;

          if (this.autoSelect === "focus") {
            this._zone.run(() => {
              this._selectItem(itemDef.item, itemDef.index);
              this._cdr.markForCheck();
            });
          }
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

      this._el.addEventListener("blur", (event) => {
        const focusIndicatorEl = paneEl.findFirst("> ._cell-focus-indicator")!;
        focusIndicatorEl.style.display = "none";

        const rowFocusIndicatorEl = paneEl.findFirst("> ._row-focus-indicator")!;
        rowFocusIndicatorEl.style.display = "none";

        const relatedTargetCell = event.relatedTarget instanceof HTMLElement ?
          event.relatedTarget.matches("._cell") ? event.relatedTarget : event.relatedTarget.findParent("._cell") :
          undefined;
        const targetCell = event.target instanceof HTMLElement ?
          event.target.matches("._cell") ? event.target : event.target.findParent("._cell") :
          undefined;

        if (relatedTargetCell !== targetCell) {
          if (this._editCell === (targetCell?.getAttribute("sd-row-index") ?? "") + "_" + (targetCell?.getAttribute("sd-column-guid") ?? "")) {
            this._zone.run(() => {
              this._editCell = "";
              this._cdr.markForCheck();
            });
          }
        }
      }, true);
    });

    if (this.key !== undefined) {
      this._config = await this._systemConfig.getAsync(`sd-sheet.${this.key}`);
      if (this._config?.displayType !== undefined) {
        this.displayType = this._config.displayType;
      }
    }
    this._cdr.markForCheck();
  }

  private readonly _prevData: Record<string, any> = {};

  public ngDoCheck(): void {
    const itemsChanges = this._itemsDiffer.diff(this.items);
    const selectedItemsChanges = this._selectedItemsDiffer.diff(this.selectedItems);
    const expandedItemsChanges = this._expandedItemsDiffer.diff(this.expandedItems);
    const columnControlsChanges = this._columnControlsDiffer.diff(this.columnControls);
    const configColumnObjChanges = this._configColumnObjDiffer.diff(this._config?.columnObj ?? {});

    const isPageItemCountChange = this._prevData.pageItemCount !== this.pageItemCount;
    if (isPageItemCountChange) this._prevData.pageItemCount = this.pageItemCount;

    const isPageChange = this._prevData.page !== this.page;
    if (isPageChange) this._prevData.page = this.page;

    const isKeyChange = this._prevData.key !== this.key;
    if (isKeyChange) this._prevData.key = this.key;

    const isSelectModeChange = this._prevData.selectMode !== this.selectMode;
    if (isSelectModeChange) this._prevData.selectMode = this.selectMode;

    const isGetItemSelectableFnChange = this._prevData.getItemSelectableFn !== this.getItemSelectableFn;
    if (isGetItemSelectableFnChange) this._prevData.getItemSelectableFn = this.getItemSelectableFn;

    const isGetChildrenFnChange = this._prevData.getChildrenFn !== this.getChildrenFn;
    if (isGetChildrenFnChange) this._prevData.getChildrenFn = this.getChildrenFn;

    const isWidthChange = this._prevData.width !== this.columnControls?.toArray().sum((item) => item.widthPixel);
    if (isWidthChange) this._prevData.width = this.columnControls?.toArray().sum((item) => item.widthPixel);

    if (itemsChanges || selectedItemsChanges || expandedItemsChanges || columnControlsChanges || configColumnObjChanges) {
      this._cdr.markForCheck();
    }

    if (isPageItemCountChange || itemsChanges || isPageChange) {
      if (this.pageItemCount !== undefined && this.pageItemCount !== 0 && this.items.length > 0) {
        this.displayItems = this.items.slice(this.page * this.pageItemCount, (this.page + 1) * this.pageItemCount);
      }
      else {
        if (itemsChanges) {
          this.displayItems = this.items;
        }
      }
    }

    if (
      (expandedItemsChanges || isSelectModeChange || isGetItemSelectableFnChange || isGetChildrenFnChange) ||
      (isPageItemCountChange || itemsChanges || isPageChange) // displayItems
    ) {
      this.displayItemDefs = this._getDisplayItemDefs();
    }

    if (columnControlsChanges) {
      this.hasHeaderGroup = (this.columnControls?.filter((item) => item.group !== undefined).length ?? 0) > 0;
      this.hasSummaryGroup = (this.columnControls?.filter((item) => Boolean(item.summaryTemplateRef)).length ?? 0) > 0;
    }

    if (columnControlsChanges || isKeyChange || configColumnObjChanges || isWidthChange) {
      this.columnWidthPixelMap = this.columnControls?.toArray()
        .toMap((item) => item.guid, (item) => this._getColumnWidthPixel(item)) ?? new Map<string, number>();
    }

    if (columnControlsChanges || isKeyChange || configColumnObjChanges) {
      this.fixedColumnControls = this._getColumnControlsOfFixType(true);
      this.nonFixedColumnControls = this._getColumnControlsOfFixType(false);

      this.fixedHeaderGroups = this._getHeaderGroups(this.fixedColumnControls);
      this.nonFixedHeaderGroups = this._getHeaderGroups(this.nonFixedColumnControls);

      this.isGroupLastColumMap = this.columnControls?.toArray()
        .toMap((item) => item.guid, (item) => this._getIsGroupLastColumn(item)) ?? new Map<string, boolean>();
    }

    if (itemsChanges) {
      const prevCellEl = document.activeElement instanceof HTMLElement ?
        (document.activeElement.matches("._cell") ? document.activeElement : document.activeElement.findParent("._cell")) :
        undefined;
      const prevAddr = prevCellEl ? this._getCellAddress(prevCellEl) : undefined;
      if (prevAddr) {
        let lastAddedRecord: IterableChangeRecord<any> | undefined;
        itemsChanges.forEachAddedItem((record) => {
          lastAddedRecord = lastAddedRecord ?? record;
        });
        let lastRemovedRecord: IterableChangeRecord<any> | undefined;
        itemsChanges.forEachRemovedItem((record) => {
          lastRemovedRecord = lastRemovedRecord ?? record;
        });

        this._zone.runOutsideAngular(() => {
          setTimeout(() => {
            if (lastAddedRecord) {
              const cellEl = this._getCellEl(this.displayItems.indexOf(lastAddedRecord.item), prevAddr.c);
              if (cellEl) {
                cellEl.focus();
              }
            }
            else if (lastRemovedRecord) {
              let cellEl = this._getCellEl(lastRemovedRecord.previousIndex!, prevAddr.c);
              if (cellEl) {
                cellEl.focus();
              }
              else {
                cellEl = this._getCellEl(lastRemovedRecord.previousIndex! - 1, prevAddr.c);
                if (cellEl) {
                  cellEl.focus();
                }
              }
            }
          }, 0);
        });
      }
    }
  }

  public ngAfterContentChecked(): void {
    if (this.autoHeight) {
      this._zone.runOutsideAngular(() => {
        setTimeout(() => {
          const rowEls = this._el.findAll("> sd-dock-container > sd-pane > ._sheet > ._body > ._row");
          for (const rowEl of rowEls) {
            const cellEls = rowEl.findAll("> ._cell-group > ._cell");

            const maxCellContentHeight = cellEls.max((cellEl1) => cellEl1.findFirst("> ._cell-content")!.offsetHeight)!;
            for (const cellEl1 of cellEls) {
              cellEl1.style.height = (maxCellContentHeight + 1) + "px";
            }
          }
        });
      });
    }
  }

  public async onDisplayTypeChangeButtonClick(): Promise<void> {
    this.displayType = (this.displayType === "card" ? "sheet" : "card");

    if (this.key !== undefined) {
      this._config = this._config ?? {};
      this._config.displayType = this.displayType;
      await this._systemConfig.setAsync(`sd-sheet.${this.key}`, this._config);
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

  public onAllExpandIconClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.getIsAllExpanded()) {
      this.expandedItems = [];
    }
    else {
      this.expandedItems = this.displayItems.filter((item, i) => (this.getChildrenFn?.(i, item)?.length > 0));
    }
  }

  public onAllSelectIconClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.selectMode === "multi") {
      if (this.getIsAllSelected()) {
        if (this.selectedItemsChange.observers.length === 0) {
          this.selectedItems = [];
        }
        else {
          this.selectedItemsChange.emit([]);
        }
      }
      else {
        const selectedItems = [
          ...this.displayItemDefs
            .filter((item) => item.selectable)
            .map((item) => item.item)
        ];
        if (this.selectedItemsChange.observers.length === 0) {
          this.selectedItems = selectedItems;
        }
        else {
          this.selectedItemsChange.emit(selectedItems);
        }
      }
    }
  }

  public onItemSelectIconClick(event: MouseEvent, item: any, index: number): void {
    event.preventDefault();
    event.stopPropagation();

    this._toggleItemSelection(item, index);

    const cellEl = this._getCellEl(index, 1);
    cellEl?.focus();
  }

  public onItemRowClick(event: MouseEvent, item: any, index: number): void {
    if (this.autoSelect === "click") {
      this._selectItem(item, index);
    }
  }

  public onItemRowKeydown(event: KeyboardEvent, item: any, index: number): void {
    this.itemKeydown.emit({ index, item, event });
  }

  private _toggleItemSelection(item: any, index: number): void {
    if (this.selectMode === undefined || (this.getItemSelectableFn && this.getItemSelectableFn(index, item) !== true)) {
      return;
    }

    if (this.selectMode === "single") {
      if (this.selectedItems[0] === item) {
        if (this.selectedItemsChange.observers.length === 0) {
          this.selectedItems = [];
        }
        else {
          this.selectedItemsChange.emit([]);
        }
      }
      else {
        const selectedItems = [item];

        if (this.selectedItemsChange.observers.length === 0) {
          this.selectedItems = selectedItems;
        }
        else {
          this.selectedItemsChange.emit(selectedItems);
        }
      }
    }
    else {
      if (this.selectedItems.includes(item)) {
        const selectedItems = [...this.selectedItems];
        selectedItems.remove(item);
        if (this.selectedItemsChange.observers.length === 0) {
          this.selectedItems = selectedItems;
        }
        else {
          this.selectedItemsChange.emit(selectedItems);
        }
      }
      else {
        const selectedItems = [...this.selectedItems, item];
        if (this.selectedItemsChange.observers.length === 0) {
          this.selectedItems = selectedItems;
        }
        else {
          this.selectedItemsChange.emit(selectedItems);
        }
      }
    }
  }

  private _selectItem(item: any, index: number): void {
    if (this.selectMode === undefined || (this.getItemSelectableFn !== undefined && this.getItemSelectableFn(index, item) !== true)) {
      return;
    }

    if (this.selectMode === "single") {
      if (this.selectedItems[0] !== item) {
        const selectedItems = [item];
        if (this.selectedItemsChange.observers.length === 0) {
          this.selectedItems = selectedItems;
        }
        else {
          this.selectedItemsChange.emit(selectedItems);
        }
      }
    }
    else {
      if (!this.selectedItems.includes(item)) {
        const selectedItems = [...this.selectedItems, item];
        if (this.selectedItemsChange.observers.length === 0) {
          this.selectedItems = selectedItems;
        }
        else {
          this.selectedItemsChange.emit(selectedItems);
        }
      }
    }
  }

  public onFixedCellGroupResize(event: ISdResizeEvent): void {
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

        this._setCellEditMode(cellEl);
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

        this._zone.run(() => {
          this._editCell = "";
          this._cdr.markForCheck();
        });

        cellEl.focus();
      }
      else if (
        (event.ctrlKey && event.altKey && event.key === "ArrowDown") ||
        (
          !(event.target instanceof HTMLTextAreaElement) &&
          !(event.target instanceof HTMLDivElement && event.target.findParent("sd-content-editor") !== undefined) &&
          event.key === "Enter"
        ) ||
        (
          (
            event.target instanceof HTMLTextAreaElement ||
            (event.target instanceof HTMLDivElement && event.target.findParent("sd-content-editor") !== undefined)
          ) &&
          event.ctrlKey && event.key === "Enter"
        )
      ) {
        event.preventDefault();

        const currCellAddr = this._getCellAddress(cellEl);
        if (!currCellAddr) return;

        const nextRowCellEl = this._getCellEl(currCellAddr.r + 1, currCellAddr.c);
        if (!nextRowCellEl) return;

        this._setCellEditMode(nextRowCellEl);
      }
      else if (event.ctrlKey && event.altKey && event.key === "ArrowUp") {
        event.preventDefault();

        const currCellAddr = this._getCellAddress(cellEl);
        if (!currCellAddr) return;

        const prevRowCellEl = this._getCellEl(currCellAddr.r - 1, currCellAddr.c);
        if (!prevRowCellEl) return;

        this._setCellEditMode(prevRowCellEl);
      }
      else if (event.ctrlKey && event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();

        const currCellAddr = this._getCellAddress(cellEl);
        if (!currCellAddr) return;

        const prevColCellEl = this._getCellEl(currCellAddr.r, currCellAddr.c - 1);
        if (!prevColCellEl) return;

        this._setCellEditMode(prevColCellEl);
      }
      else if (event.ctrlKey && event.altKey && event.key === "ArrowRight") {
        event.preventDefault();

        const currCellAddr = this._getCellAddress(cellEl);
        if (!currCellAddr) return;

        const nextColCellEl = this._getCellEl(currCellAddr.r, currCellAddr.c + 1);
        if (!nextColCellEl) return;

        this._setCellEditMode(nextColCellEl);
      }
      else if (event.key === "Tab" && !event.shiftKey) {
        event.preventDefault();

        const currCellAddr = this._getCellAddress(cellEl);
        if (!currCellAddr) return;

        const nextColCellEl = this._getCellEl(currCellAddr.r, currCellAddr.c + 1);
        if (nextColCellEl) {
          this._setCellEditMode(nextColCellEl);
        }
        else {
          const nextRowCellEl = this._getCellEl(currCellAddr.r + 1, 1);
          if (!nextRowCellEl) return;

          this._setCellEditMode(nextRowCellEl);
        }
      }
      else if (event.key === "Tab" && event.shiftKey) {
        event.preventDefault();

        const currCellAddr = this._getCellAddress(cellEl);
        if (!currCellAddr) return;

        const prevColCellEl = this._getCellEl(currCellAddr.r, currCellAddr.c - 1);
        if (prevColCellEl) {
          this._setCellEditMode(prevColCellEl);
        }
        else {
          const prevRowCellEl = this._getCellEl(currCellAddr.r - 1, "last");
          if (!prevRowCellEl) return;

          this._setCellEditMode(prevRowCellEl);
        }
      }
    }
  }

  private _setCellEditMode(cellEl: HTMLElement): void {
    this._zone.run(() => {
      this._editCell = (cellEl.getAttribute("sd-row-index") ?? "") + "_" + (cellEl.getAttribute("sd-column-guid") ?? "");
      this._cdr.markForCheck();
    });

    setTimeout(() => {
      const firstForcusableEl = cellEl.findFocusableAll()[0];
      if (typeof firstForcusableEl !== "undefined") {
        firstForcusableEl.focus();
      }
      else {
        cellEl.focus();
      }
    });
  }

  public onColumnOrderingHeaderClick(event: MouseEvent, columnControl: SdSheetColumnControl): void {
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
        const orderingItem = ordering[0];
        if (orderingItem.desc) {
          ordering.remove(orderingItem);
        }
        else {
          orderingItem.desc = !orderingItem.desc;
        }
      }
      else {
        ordering = [{ key: columnControl.key, desc: false }];
      }
    }

    if (this.orderingChange.observers.length > 0) {
      this.orderingChange.emit(ordering);
    }
    else {
      this.ordering = ordering;
    }
  }

  public onCellDblClick(event: MouseEvent): void {
    if (!event.target || !(event.target instanceof HTMLElement)) {
      return;
    }

    const cellEl = (
      event.target.matches("._sheet > ._body > ._row > ._cell-group > ._cell") ? event.target :
        event.target.findParent("._sheet > ._body > ._row > ._cell-group > ._cell")
    );

    if (!cellEl) return;

    this._setCellEditMode(cellEl);
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

    return { r, c };
  }

  private _getCellEl(r: number, c: number | string | "last"): HTMLElement | undefined {
    if (c <= 0) return undefined;

    const rowEls = this._el.findAll("> sd-dock-container > sd-pane > ._sheet > ._body > ._row");
    const rowEl = rowEls[r];
    if (typeof rowEl === "undefined") return undefined;

    const cellEls = rowEl.findAll("> ._cell-group > ._cell");
    if (c === "last") {
      return cellEls.last();
    }
    else if (typeof c === "string") {
      return cellEls.single((item) => item.getAttribute("sd-key") === c);
    }
    else {
      return cellEls[c];
    }
  }

  private _getHeaderGroups(columnControls: SdSheetColumnControl[]): { name?: string; widthPixel: number }[] {
    return columnControls.groupBy((item) => item.group)
      .map((item) => ({
        name: item.key,
        widthPixel: item.values.sum((item1) => this.columnWidthPixelMap.get(item1.guid)!)
      }));
  }

  private _getDisplayItemDefs(): { index: number; depth: number; visible: boolean; selectable: boolean; item: any }[] {
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
  displayType?: "sheet" | "card";
  columnObj?: Partial<Record<string, ISdSheetColumnConfigVM>>;
}

export interface ISdSheetColumnConfigVM {
  fixed?: boolean;
  group?: string;
  header?: string;
  widthPixel?: number;
  displayOrder?: number;
  hidden?: boolean;
}

export interface ISdSheetColumnOrderingVM {
  key: string;
  desc: boolean;
}

export interface ISdSheetItemKeydownEventParam<T> {
  item: T;
  index: number;
  event: KeyboardEvent;
}