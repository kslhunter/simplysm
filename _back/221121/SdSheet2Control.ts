import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  DoCheck,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostBinding,
  Input,
  IterableDiffer,
  IterableDiffers,
  NgZone,
  OnInit,
  Output,
  QueryList,
  ViewChild
} from "@angular/core";
import { SdSheet2ColumnControl } from "./SdSheet2ColumnControl";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { NumberUtil, ObjectUtil } from "@simplysm/sd-core-common";
import { SdSystemConfigRootProvider } from "../root-providers/SdSystemConfigRootProvider";
import { SdModalProvider } from "../providers/SdModalProvider";
import { SdSheet2ConfigModal } from "../modals/SdSheet2ConfigModal";

@Component({
  selector: "sd-sheet2",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-busy-container [busy]="!isInitialized">
      <sd-dock-container [hidden]="!isInitialized">
        <sd-dock *ngIf="(key || displayPageLength > 0) && !hideConfigBar">
          <sd-flex direction="row" gap="sm">
            <sd-anchor class="_cog-btn" *ngIf="key"
                       (click)="onConfigButtonClick()">
              <fa-icon [icon]="icons.fasCog | async" [fixedWidth]="true"></fa-icon>
            </sd-anchor>
            <sd-pagination [page]="page"
                           [pageLength]="displayPageLength"
                           (pageChange)="onPageChange($event)"></sd-pagination>
          </sd-flex>
        </sd-dock>

        <sd-pane #sheetContainer class="_sheet-container">
          <table class="_sheet">
            <thead>
            <ng-container *ngFor="let depth of headerDepthArray">
              <tr>
                <th class="_fixed _feature-cell" *ngIf="depth === 0"
                    [attr.rowspan]="maxHeaderDepth + (hasSummaryTemplate ? 1 : 0)">
                  <div class="_contents sd-padding-xs-sm">
                    <ng-container *ngIf="selectMode === 'multi' && hasSelectableItems">
                      <fa-icon [icon]="icons.fasArrowRight | async" [fixedWidth]="true"
                               [class.sd-text-brightness-lightest]="!isAllItemsSelected"
                               [class.sd-text-brightness-primary-default]="isAllItemsSelected"
                               style="cursor:pointer;"
                               (click)="onAllItemsSelectIconClick()"></fa-icon>
                    </ng-container>
                  </div>
                </th>
                <th class="_fixed _feature-cell" *ngIf="getChildrenFn && depth === 0"
                    [attr.rowspan]="maxHeaderDepth + (hasSummaryTemplate ? 1 : 0)">
                  <div class="_contents sd-padding-xs-sm">
                    <fa-icon [icon]="icons.fasCaretRight | async" [fixedWidth]="true"
                             [rotate]="isAllItemsExpanded ? 90 : undefined"
                             (click)="onAllItemsExpandIconClick()"
                             [class.sd-text-brightness-lightest]="!isAllItemsExpanded"
                             [class.sd-text-color-primary-default]="isAllItemsExpanded"
                             style="cursor:pointer;"></fa-icon>
                  </div>
                </th>
                <ng-container
                  *ngFor="let columnDef of displayColumnDefs; let c = index; trackBy: trackByFnForColumnDef">
                  <ng-container *ngIf="getColumnHeader(columnDef, depth) as header">
                    <th #th
                        [attr.rowspan]="getColumnHeaderRowSpan(columnDef, depth)"
                        [attr.colspan]="getColumnHeaderColSpan(columnDef, depth)"
                        [class._fixed]="columnDef.fixed"
                        [class._last-depth]="!hasSummaryTemplate && columnDef.headerLastDepth === depth"
                        [style]="!getColumnHeaderColSpan(columnDef, depth) && !getIsOnResizing(columnDef) ? {width: columnDef.width, minWidth: columnDef.width, maxWidth: columnDef.width} : undefined"
                        [attr.title]="columnDef.headerLastDepth === depth ? (columnDef.control.tooltip ?? header) : undefined"
                        [class.sd-help]="columnDef.headerLastDepth === depth && columnDef.control.tooltip">
                      <div class="_contents"
                           [class._clickable]="columnDef.control.useOrdering && columnDef.control.key"
                           (click)="onHeaderClick($event, columnDef)">
                        <ng-container *ngIf="!columnDef.control.headerTemplateRef">
                          <div class="_text">{{ header }}</div>
                        </ng-container>
                        <ng-container *ngIf="columnDef.control.headerTemplateRef">
                          <ng-template [ngTemplateOutlet]="columnDef.control.headerTemplateRef"></ng-template>
                        </ng-container>
                        <div
                          *ngIf="columnDef.control.useOrdering && columnDef.control.key && columnDef.headerLastDepth === depth"
                          class="_sort-icon">
                          <fa-layers>
                            <fa-icon [icon]="icons.fasSort | async" class="sd-text-brightness-lightest"></fa-icon>
                            <fa-icon [icon]="icons.fasSortDown | async"
                                     *ngIf="getIsColumnOrderingDesc(columnDef) === false"></fa-icon>
                            <fa-icon [icon]="icons.fasSortUp | async"
                                     *ngIf="getIsColumnOrderingDesc(columnDef) === true"></fa-icon>
                          </fa-layers>
                          <sub *ngIf="getColumnOrderingIndexText(columnDef) as text">{{ text }}</sub>
                        </div>
                      </div>

                      <div class="_resizer"
                           *ngIf="columnDef.control.resizable && columnDef.headerLastDepth === depth"
                           (mousedown)="onResizerMousedown($event, c, columnDef)"></div>
                    </th>
                  </ng-container>
                </ng-container>
              </tr>
            </ng-container>
            <ng-container *ngIf="hasSummaryTemplate">
              <tr class="_summary-row">
                <ng-container *ngFor="let columnDef of displayColumnDefs;  trackBy: trackByFnForColumnDef">
                  <th
                    [style]="!getIsOnResizing(columnDef) ? {width: columnDef.width, minWidth: columnDef.width, maxWidth: columnDef.width} : undefined"
                    class="_last">
                    <div class="_contents">
                      <ng-container *ngIf="columnDef.control.summaryTemplateRef">
                        <ng-template [ngTemplateOutlet]="columnDef.control.summaryTemplateRef"></ng-template>
                      </ng-container>
                    </div>
                  </th>
                </ng-container>
              </tr>
            </ng-container>
            </thead>
            <tbody>
            <ng-container *ngFor="let itemDef of displayItemDefs; let r = index; trackBy: trackByFnForItemDef;">
              <tr [attr.r]="r" [hidden]="itemDef.parentDef && !getIsAllParentItemExpanded(itemDef)">
                <td class="_fixed _feature-cell">
                  <div class="_contents sd-padding-xs-sm">
                    <ng-container *ngIf="selectMode && getItemSelectable(itemDef)">
                      <fa-icon [icon]="icons.fasArrowRight | async" [fixedWidth]="true"
                               [class.sd-text-brightness-lightest]="!selectedItems.includes(itemDef.item)"
                               [class.sd-text-color-primary-default]="selectedItems.includes(itemDef.item)"
                               style="cursor:pointer;"
                               (click)="onItemSelectIconClick(itemDef)"></fa-icon>
                    </ng-container>
                  </div>
                </td>
                <td class="_fixed _feature-cell" *ngIf="getChildrenFn">
                  <div class="_contents sd-padding-xs-sm">
                    <ng-container *ngIf="itemDef.depth > 0">
                      <div class="_depth-indicator" [style.margin-left.em]="itemDef.depth - .5">
                      </div>
                    </ng-container>
                    <ng-container *ngIf="itemDef.hasChildren">
                      <fa-icon [icon]="icons.fasCaretRight | async" [fixedWidth]="true"
                               [rotate]="expandedItems.includes(itemDef.item) ? 90 : undefined"
                               (click)="onItemExpandIconClick(itemDef)"
                               [class.sd-text-brightness-lightest]="!expandedItems.includes(itemDef.item)"
                               [class.sd-text-color-primary-default]="expandedItems.includes(itemDef.item)"
                               style="cursor:pointer;"></fa-icon>
                    </ng-container>
                  </div>
                </td>
                <ng-container
                  *ngFor="let columnDef of displayColumnDefs; let c = index; trackBy: trackByFnForColumnDef">
                  <td #td
                      tabindex="0"
                      [class._fixed]="columnDef.fixed"
                      [style]="{width: columnDef.width, minWidth: columnDef.width, maxWidth: columnDef.width}"
                      [attr.r]="r" [attr.c]="c"
                      (focus)="onCellFocus(itemDef)"
                      (blur)="onCellBlur()"
                      (mousedown)="onCellMousedown($event)"
                      (click)="onCellClick(itemDef)"
                      (dblclick)="onCellDoubleClick()"
                      (keydown)="onCellKeydown($event, itemDef)">
                    <div class="_contents">
                      <ng-template [ngTemplateOutlet]="columnDef.control.cellTemplateRef"
                                   [ngTemplateOutletContext]="{item: itemDef.item, index: r, depth: itemDef.depth, edit: getIsCellEditMode(td) }"></ng-template>
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
export class SdSheet2Control<T> implements OnInit, AfterViewChecked, DoCheck {
  public icons = {
    fasCog: import("@fortawesome/pro-solid-svg-icons/faCog").then(m => m.faCog),
    fasTable: import("@fortawesome/pro-solid-svg-icons/faTable").then(m => m.faTable),
    fasSort: import("@fortawesome/pro-solid-svg-icons/faSort").then(m => m.faSort),
    fasSortDown: import("@fortawesome/pro-solid-svg-icons/faSortDown").then(m => m.faSortDown),
    fasSortUp: import("@fortawesome/pro-solid-svg-icons/faSortUp").then(m => m.faSortUp),
    fasArrowRight: import("@fortawesome/pro-solid-svg-icons/faArrowRight").then(m => m.faArrowRight),
    fasCaretRight: import("@fortawesome/pro-solid-svg-icons/faCaretRight").then(m => m.faCaretRight)
  };

  @ViewChild("sheetContainer", { static: true, read: ElementRef })
  public sheetContainerElRef?: ElementRef<HTMLElement>;

  @ContentChildren(forwardRef(() => SdSheet2ColumnControl))
  public columnControls?: QueryList<SdSheet2ColumnControl>;

  /**
   * 시트설정 저장 키
   */
  @Input()
  @SdInputValidate(String)
  public key?: string;

  /**
   * 설정 및 페이징 바 표시여부
   */
  @Input()
  @SdInputValidate(Boolean)
  public hideConfigBar?: boolean;

  /**
   * BORDER를 없애는등 다른 박스안에 완전히 붙임
   */
  @Input()
  @SdInputValidate({ type: Boolean, notnull: true })
  @HostBinding("attr.sd-inset")
  public inset = false;

  /**
   * 선택모드 (single = 단일선택, multi = 다중선택)
   */
  @Input()
  @SdInputValidate({
    type: String,
    includes: ["single", "multi"]
  })
  public selectMode?: "single" | "multi";

  /**
   * 선택된 항목들
   */
  @Input()
  @SdInputValidate({ type: Array, notnull: true })
  public selectedItems: T[] = [];

  /**
   * 선택된 항목 변경 이벤트
   */
  @Output()
  public readonly selectedItemsChange = new EventEmitter<T[]>();

  /**
   * 자동선택모드 (undefined = 사용안함, click = 셀 클릭시 해당 ROW 선택, focus = 셀 포커싱시 해당 ROW 선택)
   */
  @Input()
  @SdInputValidate({
    type: String,
    includes: ["click", "focus"]
  })
  public autoSelect?: "click" | "focus";

  /**
   * 항목별로 선택가능여부를 설정하는 함수
   */
  @Input()
  @SdInputValidate(Function)
  public getItemSelectableFn?: (item: T) => boolean;

  /**
   * 정렬규칙
   */
  @Input()
  public ordering: ISdSheet2ColumnOrderingVM[] = [];

  /**
   * 정렬규칙 변경 이벤트
   */
  @Output()
  public readonly orderingChange = new EventEmitter<ISdSheet2ColumnOrderingVM[]>();

  /**
   * [pagination] 현재 표시 페이지
   */
  @Input()
  @SdInputValidate({ type: Number, notnull: true })
  public page = 0;

  /**
   * [pagination] 현재 표시페이지 변화 이벤트
   */
  @Output()
  public readonly pageChange = new EventEmitter<number>();

  /**
   * [pagination] 총 페이지 길이
   */
  @Input()
  @SdInputValidate({ type: Number, notnull: true })
  public pageLength = 0;

  /**
   * [pagination] 한 페이지에 표시할 항목수 (설정된 경우, 'pageLength'가 무시되고, 자동계산 됨)
   */
  @Input()
  @SdInputValidate(Number)
  public pageItemCount?: number;

  /**
   * 항목들
   */
  @Input()
  @SdInputValidate({ type: Array, notnull: true })
  public items: T[] = [];

  /**
   * 데이터 키를 가져오기 위한 함수 (ROW별로 반드시 하나의 값을 반환해야함)
   * @param index 'items'내의 index
   * @param item items[index] 데이터
   */
  @Input()
  @SdInputValidate({
    type: Function,
    notnull: true
  })
  public trackByFn = (index: number, item: T): any => item;

  /**
   * 항목 키 다운 이벤트
   */
  @Output()
  public readonly itemKeydown = new EventEmitter<ISdSheet2ItemKeydownEventParam<T>>();

  /**
   * Children 설정하는 함수
   */
  @Input()
  @SdInputValidate(Function)
  public getChildrenFn?: (index: number, item: T) => (T[] | undefined);

  /**
   * 확장된 항목 목록
   */
  @Input()
  public expandedItems: T[] = [];

  /**
   * 확장된 항목 변경 이벤트
   */
  @Output()
  public readonly expandedItemsChange = new EventEmitter<T[]>();

  /**
   * 컬럼용 trackByFn
   * @param index
   * @param colDef
   */
  public trackByFnForColumnDef = (index: number, colDef: IColumnDef): string => colDef.control.guid;

  /**
   * trackByFn def용을 item용으로 변환
   * @param index
   * @param itemDef
   */
  public trackByFnForItemDef = (index: number, itemDef: IItemDef<T>): any => this.trackByFn(index, itemDef.item);

  /**
   * 시트설정
   */
  public config?: ISdSheet2ConfigVM;

  /**
   * 초기화 완료 여부
   */
  public isInitialized = false;

  /**
   * 시트의 상태가 에디트 모드인지 여부
   */
  public editMode = false;

  /**
   * 리사이징 중인 컬럼 GUID
   * @private
   */
  private _resizingColumnGuid?: string;

  /**
   * 화면에 표시할 항목 목록
   */
  public displayItemDefs: IItemDef<T>[] = [];

  /**
   * 화면에 표시할 컬럼 컨트롤 목록
   */
  public displayColumnDefs: IColumnDef[] | undefined;

  public displayPageLength = 0;

  /**
   * 헤더의 최종 깊이 번호 (row index)
   */
  public maxHeaderDepth = 1;
  public headerDepthArray: number[] = [0];

  /**
   * 최종 셀의 주소
   */
  public endCellAddr = { r: -1, c: -1 };

  /**
   * 요약 ROW 존재 여부
   */
  public hasSummaryTemplate = false;

  /**
   * 선택가능한 항목을 가지고 있는지 여부
   */
  public hasSelectableItems = false;

  /**
   * 현재 존재하는 모든 선택가능한 항목이 선택되어있는지 여부
   */
  public isAllItemsSelected = false;

  /**
   * 현재 존재하는 모든 확장가능한 항목이 확장되어있는지 여부
   */
  public isAllItemsExpanded = false;

  private readonly _itemsDiffer: IterableDiffer<T>;
  private readonly _columnControlsDiffer: IterableDiffer<SdSheet2ColumnControl>;
  private readonly _selectedItemsDiffer: IterableDiffer<T>;
  private readonly _expandedItemsDiffer: IterableDiffer<T>;

  private readonly _prevData = {
    page: this.page,
    pageItemCount: this.pageItemCount,
    pageLength: this.pageLength,
    getChildrenFn: this.getChildrenFn,
    config: this.config,
    getItemSelectableFn: this.getItemSelectableFn
  };

  public constructor(private readonly _cdr: ChangeDetectorRef,
                     private readonly _zone: NgZone,
                     private readonly _systemConfig: SdSystemConfigRootProvider,
                     private readonly _modal: SdModalProvider,
                     private readonly _iterableDiffers: IterableDiffers) {
    this._itemsDiffer = this._iterableDiffers.find([]).create((i, item) => this.trackByFn(i, item));
    this._columnControlsDiffer = this._iterableDiffers.find(new QueryList<SdSheet2ColumnControl>()).create((i, item) => item.guid);
    this._selectedItemsDiffer = this._iterableDiffers.find([]).create((i, item) => this.trackByFn(i, item));
    this._expandedItemsDiffer = this._iterableDiffers.find([]).create((i, item) => this.trackByFn(i, item));
  }

  public async ngOnInit(): Promise<void> {
    await this._reloadConfigAsync();
    this.isInitialized = true;
    this._cdr.markForCheck();
  }

  public ngDoCheck(): void {
    const itemsChanges = this._itemsDiffer.diff(this.items);
    const columnControlsChanges = this._columnControlsDiffer.diff(this.columnControls);
    const selectedItemsChanges = this._selectedItemsDiffer.diff(this.selectedItems);
    const expandedItemsChanges = this._expandedItemsDiffer.diff(this.expandedItems);

    const isPageChange = this._prevData.page !== this.page;
    if (isPageChange) this._prevData.page = this.page;

    const isPageItemCountChange = this._prevData.pageItemCount !== this.pageItemCount;
    if (isPageItemCountChange) this._prevData.pageItemCount = this.pageItemCount;

    const isPageLengthChange = this._prevData.pageLength !== this.pageLength;
    if (isPageLengthChange) this._prevData.pageLength = this.pageLength;

    const isGetChildrenFnChange = this._prevData.getChildrenFn !== this.getChildrenFn;
    if (isGetChildrenFnChange) this._prevData.getChildrenFn = this.getChildrenFn;

    const isConfigChange = !ObjectUtil.equal(this._prevData.config, this.config);
    if (isConfigChange) this._prevData.config = ObjectUtil.clone(this.config);

    const isGetItemSelectableFnChange = this._prevData.getItemSelectableFn !== this.getItemSelectableFn;
    if (isGetItemSelectableFnChange) this._prevData.getItemSelectableFn = this.getItemSelectableFn;

    let isDisplayItemDefsChange = false;
    if (itemsChanges || isPageChange || isPageItemCountChange || isGetChildrenFnChange) {
      this._reloadDisplayItemDefs();
      isDisplayItemDefsChange = true;
    }

    let isSelectedItemsFixed = false;
    if (itemsChanges || isPageChange || selectedItemsChanges) {
      this._fixSelectedItems();
      isSelectedItemsFixed = true;
    }

    let isExpandedItemsFixed = false;
    if (itemsChanges || isPageChange || expandedItemsChanges) {
      this._fixExpandedItems();
      isExpandedItemsFixed = true;
    }

    let isDisplayColumnDefsChange = false;
    if (columnControlsChanges || isConfigChange) {
      this._reloadDisplayColumnDefs();
      isDisplayColumnDefsChange = true;
    }

    if (isDisplayColumnDefsChange) {
      this._reloadMaxHeaderDepthAndHeaderDepthArray();
    }

    if (itemsChanges || isPageItemCountChange || isPageLengthChange) {
      this._reloadDisplayPageLength();
    }

    if (isDisplayItemDefsChange || isDisplayColumnDefsChange) {
      this._reloadEndCellAddr();
    }

    if (isDisplayColumnDefsChange) {
      this._reloadHasSummaryTemplate();
    }

    if (isDisplayItemDefsChange || isGetItemSelectableFnChange) {
      this._reloadHasSelectableItems();
    }

    if (isDisplayItemDefsChange || isGetItemSelectableFnChange || selectedItemsChanges || isSelectedItemsFixed) {
      this._reloadIsAllItemsSelected();
    }

    if (isDisplayItemDefsChange || isGetItemSelectableFnChange || expandedItemsChanges || isExpandedItemsFixed) {
      this._reloadIsAllItemsExpended();
    }
  }

  private _reloadIsAllItemsExpended(): void {
    const expandableItemDefs = this.displayItemDefs.filter((item) => item.hasChildren);
    this.isAllItemsExpanded = expandableItemDefs.length <= this.expandedItems.length && expandableItemDefs.every((itemDef) => this.expandedItems.includes(itemDef.item));
  }

  private _reloadIsAllItemsSelected(): void {
    const selectableItemDefs = this.displayItemDefs.filter((item) => this.getItemSelectable(item));
    this.isAllItemsSelected = selectableItemDefs.length <= this.selectedItems.length && selectableItemDefs.every((itemDef) => this.selectedItems.includes(itemDef.item));
  }

  private _reloadDisplayItemDefs(): void {
    let result = this.items;
    if (this.pageItemCount !== undefined && this.pageItemCount !== 0 && this.items.length > 0) {
      result = result.slice(this.page * this.pageItemCount, (this.page + 1) * this.pageItemCount);
    }

    let resultDefs = result.map((item) => ({
      item,
      depth: 0,
      hasChildren: false
    }));

    if (this.getChildrenFn) {
      let fn = (arr: IItemDef<T>[]): IItemDef<T>[] => {
        let fnResult: IItemDef<T>[] = [];
        for (let i = 0; i < arr.length; i++) {
          fnResult.push(arr[i]);

          const children = this.getChildrenFn!(i, arr[i].item) ?? [];
          if (children.length > 0) {
            arr[i].hasChildren = true;
            fnResult.push(...fn(children.map((item) => ({
              item,
              parentDef: arr[i],
              hasChildren: false,
              depth: arr[i].depth + 1
            }))));
          }
        }

        return fnResult;
      };

      resultDefs = fn(resultDefs);
    }

    this.displayItemDefs = resultDefs;
  }

  private _fixSelectedItems(): void {
    const selectedItems = [...this.selectedItems];
    selectedItems.remove((item) => !this.displayItemDefs.some((def) => def.item === item));

    if (this.selectedItemsChange.observed) {
      this.selectedItemsChange.emit(selectedItems);
    }
    else {
      this.selectedItems = selectedItems;
    }
  }

  private _fixExpandedItems(): void {
    const expandedItems = [...this.expandedItems];
    expandedItems.remove((item) => !this.displayItemDefs.some((def) => def.item === item));

    if (this.expandedItemsChange.observed) {
      this.expandedItemsChange.emit(expandedItems);
    }
    else {
      this.expandedItems = expandedItems;
    }
  }

  private _reloadDisplayColumnDefs(): void {
    if (!this.columnControls) {
      this.displayColumnDefs = [];
      return;
    }

    let result = [];
    this.columnControls.forEach((control) => {
      const config = control.key !== undefined ? this.config?.columns?.[control.key] : undefined;
      const colDef = {
        control: control,
        fixed: config?.fixed ?? control.fixed ?? false,
        width: config?.width ?? control.width,
        hidden: config?.hidden ?? control.hidden ?? false,
        displayOrder: config?.displayOrder ?? Number.MAX_VALUE,
        headerLastDepth: control.header instanceof Array ? control.header.length - 1 : 0
      };

      if (!colDef.hidden && !control.collapse) {
        result.push(colDef);
      }
    });

    result = result
      .orderBy((item) => item.displayOrder)
      .orderBy((item) => item.fixed ? -1 : 0);

    this.displayColumnDefs = result;
  }

  private _reloadDisplayPageLength(): void {
    if (this.pageItemCount !== undefined && this.pageItemCount !== 0 && this.items.length > 0) {
      this.displayPageLength = Math.ceil(this.items.length / this.pageItemCount);
    }
    else {
      this.displayPageLength = this.pageLength;
    }
  }

  private _reloadMaxHeaderDepthAndHeaderDepthArray(): void {
    this.maxHeaderDepth = this.displayColumnDefs?.max((item) => item.control.header instanceof Array ? item.control.header.length : 1) ?? 1;
    this.headerDepthArray = Array(this.maxHeaderDepth).fill(0).map((a, b) => b);
  }

  private _reloadEndCellAddr(): void {
    this.endCellAddr = {
      r: this.displayItemDefs.length - 1,
      c: (this.displayColumnDefs?.length ?? 0) - 1
    };
  }

  private _reloadHasSummaryTemplate(): void {
    this.hasSummaryTemplate = this.displayColumnDefs?.some((item) => item.control.summaryTemplateRef) ?? false;
  }

  private _reloadHasSelectableItems(): void {
    if (!this.selectMode) {
      this.hasSelectableItems = false;
    }
    else {
      this.hasSelectableItems = this.displayItemDefs.some((item) => this.getItemSelectable(item));
    }
  }

  public ngAfterViewChecked(): void {
    this._redrawFixed();
    this._redrawFocusIndicator();
    this._redrawSelectIndicator();
  }

  /**
   * 특정 셀의 주소 (r/c index) 가져오기
   * @param cellEl 셀 엘리먼트
   */
  private _getCellAddr(cellEl: HTMLElement): { r: number; c: number } {
    return {
      r: NumberUtil.parseInt(cellEl.getAttribute("r"))!,
      c: NumberUtil.parseInt(cellEl.getAttribute("c"))!
    };
  }

  /**
   * 컬럼 컨트롤 헤더 텍스트 가져오기 (null: 값이 있으나 'colspan'될 자리, undefined: 값이 없는 자리)
   * @param columnDef 컬럼 컨트롤 정의
   * @param depth 헤더깊이 (row index)
   */
  public getColumnHeader(columnDef: IColumnDef, depth: number): string | null | undefined {
    const displayColumnDefs = this.displayColumnDefs;
    if (!displayColumnDefs) return;

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

    if (columnDef.control.header instanceof Array) {
      const currColumnIndex = displayColumnDefs.findIndex((item) => item.control.guid === columnDef.control.guid);

      if (currColumnIndex > 0) {
        const currColumnPrevHeaders = columnDef.control.header.slice(0, depth + 1);
        const prevColumnDef = displayColumnDefs[currColumnIndex - 1];

        if (columnDef.fixed === prevColumnDef.fixed && currColumnPrevHeaders.every((item, d) => item === rawFn(prevColumnDef.control.header, d))) {
          return null;
        }
        else {
          return rawFn(columnDef.control.header, depth);
        }
      }
      else {
        return rawFn(columnDef.control.header, depth);
      }
    }
    else {
      return rawFn(columnDef.control.header, depth);
    }
  }

  /**
   * 헤더컬럼의 rowspan 길이 가져오기
   * @param columnDef 컬럼 컨트롤
   * @param depth 헤더깊이 (row index)
   */
  public getColumnHeaderRowSpan(columnDef: IColumnDef, depth: number): number | undefined {
    if (columnDef.control.header === undefined) return;

    if (columnDef.control.header instanceof Array) {
      if (depth === columnDef.control.header.length - 1) {
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

  /**
   * 헤더컬럼의 colspan 길이 가져오기
   * @param columnDef 컬럼 컨트롤
   * @param depth 헤더깊이 (row index)
   */
  public getColumnHeaderColSpan(columnDef: IColumnDef, depth: number): number | undefined {
    const displayColumnDefs = this.displayColumnDefs;
    if (!displayColumnDefs) return;
    if (columnDef.control.header === undefined) return;
    if (typeof columnDef.control.header === "string") return;

    // const currentHeader = this.getColumnControlHeader(columnControl, depth);

    const index = displayColumnDefs.findIndex((item) => item.control.guid === columnDef.control.guid);
    const nextColumnDefs = displayColumnDefs.slice(index + 1);

    let count = 1;
    for (const nextColumnDef of nextColumnDefs) {
      if (this.getColumnHeader(nextColumnDef, depth) !== null) {
        break;
      }
      count++;
    }

    return count > 1 ? count : undefined;
  }

  /**
   * 셀렉팅 가능한 항목인지 확인
   * @param itemDef
   */
  public getItemSelectable(itemDef: IItemDef<T>): boolean {
    return !this.getItemSelectableFn || this.getItemSelectableFn(itemDef.item);
  }

  /**
   * 컬럼 컨트롤의 오더링 방향이 DESC인지 여부 가져오기
   * @param columnDef
   */
  public getIsColumnOrderingDesc(columnDef: IColumnDef): boolean | undefined {
    return this.ordering.single((item) => item.key === columnDef.control.key)?.desc;
  }

  /**
   * 컬럼 컨트롤의 오더링 순서번호 가져오기
   * @param columnDef 컬럼 컨트롤
   */
  public getColumnOrderingIndexText(columnDef: IColumnDef): string | undefined {
    if (this.ordering.length < 2) {
      return undefined;
    }
    const index = this.ordering.findIndex((item) => item.key === columnDef.control.key);
    return index >= 0 ? (index + 1).toString() : undefined;
  }

  /**
   * 셀의 에디트모드여부 가져오기
   * @param el 셀 엘리먼트
   */
  public getIsCellEditMode(el: HTMLElement): boolean {
    if (!this.editMode) return false;
    if (!(document.activeElement instanceof HTMLElement)) return false;

    if (document.activeElement.tagName === "TD" && document.activeElement === el) {
      return true;
    }

    return document.activeElement.findParent("td") === el;
  }

  /**
   * 특정 컬럼이 현재 리사이징 중인지 여부 가져오기
   * @param columnDef
   */
  public getIsOnResizing(columnDef: IColumnDef): boolean {
    return this._resizingColumnGuid === columnDef.control.guid;
  }

  /**
   * 모든 상위항목이 Expand됬는지 여부 가져오기
   * @param itemDef
   */
  public getIsAllParentItemExpanded(itemDef: IItemDef<T>): boolean {
    let currItemDef = itemDef;
    while (currItemDef.parentDef) {
      if (!this.expandedItems.some((item) => item === currItemDef.parentDef!.item)) {
        return false;
      }

      currItemDef = currItemDef.parentDef;
    }
    return true;
  }

  /**
   * 헤더 클릭시 이벤트
   * @param event
   * @param columnDef
   */
  public onHeaderClick(event: MouseEvent, columnDef: IColumnDef): void {
    if (!columnDef.control.useOrdering) return;
    if (columnDef.control.key === undefined) return;

    if (event.shiftKey || event.ctrlKey) {
      this._toggleOrdering(columnDef.control.key, true);
    }
    else {
      this._toggleOrdering(columnDef.control.key, false);
    }
  }

  /**
   * 셀에 포커싱시 이벤트
   */
  public onCellFocus(itemDef: IItemDef<T>): void {
    this._forceScrollToFocusedCell();
    this._redrawFocusIndicator();

    if (this.autoSelect === "focus" && this.getItemSelectable(itemDef)) {
      this._selectItemDef(itemDef);
    }
  }

  /**
   * 셀에서 포커싱 해제시 이벤트
   */
  public onCellBlur(): void {
    this._redrawFocusIndicator();
  }

  /**
   * 셀에 마우스 누를시 이벤트
   * @param event
   */
  public onCellMousedown(event: MouseEvent): void {
    if (document.activeElement !== event.target) {
      this._setIsFocusedCellEditMode(false);
    }
  }

  /**
   * 셀 더블클릭 이벤트
   */
  public onCellDoubleClick(): void {
    this._setIsFocusedCellEditMode(true);
  }

  /**
   * 셀에서 키보드 누를시 이벤트
   * @param event
   * @param itemDef
   */
  public onCellKeydown(event: KeyboardEvent, itemDef: IItemDef<T>): void {
    if (!this.sheetContainerElRef) return;
    if (!(event.target instanceof HTMLElement)) return;
    if (!event.target.findParent(this.sheetContainerElRef.nativeElement)) return;

    if (event.target.tagName === "TD") {
      if (event.key === "F2") {
        event.preventDefault();
        this._setIsFocusedCellEditMode(true);
      }
      else if (event.key === "ArrowDown") {
        const currAddr = this._getCellAddr(event.target);
        if (currAddr.r >= this.endCellAddr.r) return;
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
        if (currAddr.c >= this.endCellAddr.c) return;
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
    else {
      const tdEl = event.target.findParent("td");
      if (!tdEl) return;

      if (event.key === "Escape") {
        event.preventDefault();
        this._setIsFocusedCellEditMode(false);
      }
      else if (event.ctrlKey && event.key === "ArrowDown") {
        const currAddr = this._getCellAddr(tdEl);
        if (currAddr.r >= this.endCellAddr.r) return;
        event.preventDefault();

        this._focusCell(currAddr.r + 1, currAddr.c);
        this._setIsFocusedCellEditMode(true);
      }
      else if (event.ctrlKey && event.key === "ArrowUp") {
        const currAddr = this._getCellAddr(tdEl);
        if (currAddr.r <= 0) return;
        event.preventDefault();

        this._focusCell(currAddr.r - 1, currAddr.c);
        this._setIsFocusedCellEditMode(true);
      }
      else if (event.ctrlKey && event.key === "ArrowRight") {
        const currAddr = this._getCellAddr(tdEl);
        if (currAddr.c >= this.endCellAddr.c) return;
        event.preventDefault();

        this._focusCell(currAddr.r, currAddr.c + 1);
        this._setIsFocusedCellEditMode(true);
      }
      else if (event.ctrlKey && event.key === "ArrowLeft") {
        const currAddr = this._getCellAddr(tdEl);
        if (currAddr.c <= 0) return;
        event.preventDefault();

        this._focusCell(currAddr.r, currAddr.c - 1);
        this._setIsFocusedCellEditMode(true);
      }
    }

    this.itemKeydown.emit({ item: itemDef.item, event });
  }

  /**
   * ROW 셀렉터 클릭시 이벤트
   * @param itemDef
   */
  public onItemSelectIconClick(itemDef: IItemDef<T>): void {
    if (!this.getItemSelectable(itemDef)) return;

    if (this.selectedItems.includes(itemDef.item)) {
      this._unselectItemDef(itemDef);
    }
    else {
      this._selectItemDef(itemDef);
    }
  }

  /**
   * 셀 클릭 이벤트
   * @param itemDef
   */
  public onCellClick(itemDef: IItemDef<T>): void {
    if (this.autoSelect === "click" && this.getItemSelectable(itemDef)) {
      this._selectItemDef(itemDef);
    }
  }

  /**
   * 컬럼 크기조작 시작시 이벤트
   * @param event
   * @param c
   * @param columnDef
   */
  public onResizerMousedown(event: MouseEvent, c: number, columnDef: IColumnDef): void {
    if (!columnDef.control.resizable) return;
    if (!(event.target instanceof HTMLElement)) return;

    const thEl = event.target.findParent("th");
    if (!thEl) return;

    const tdEls = this.sheetContainerElRef!.nativeElement.findAll(`> ._sheet > tbody > tr > td[c="${c}"]`);

    const startX = event.clientX;
    const startWidth = thEl.clientWidth;

    this._resizingColumnGuid = columnDef.control.guid;

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

      this._redrawFixed();
    };

    const stopDrag = async (e: MouseEvent): Promise<void> => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);

      await this._saveColumnConfigAsync(columnDef, { width: thEl.style.width });
      this._resizingColumnGuid = undefined;
      this._cdr.markForCheck();
    };

    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }

  /**
   * 페이지 변경시 이벤트
   * @param page
   */
  public onPageChange(page: number): void {
    if (this.page === page) return;

    if (this.pageChange.observed) {
      this.pageChange.emit(page);
    }
    else {
      this.page = page;
    }
  }

  /**
   * 모든 항목 선택 아이콘 클릭시 이벤트
   */
  public onAllItemsSelectIconClick(): void {
    if (this.isAllItemsSelected) {
      const selectedItems = [];

      if (this.selectedItemsChange.observed) {
        this.selectedItemsChange.emit(selectedItems);
      }
      else {
        this.selectedItems = selectedItems;
      }
    }
    else {
      const selectedItems = this.displayItemDefs.filter((itemDef) => this.getItemSelectable(itemDef)).map((item) => item.item);

      if (this.selectedItemsChange.observed) {
        this.selectedItemsChange.emit(selectedItems);
      }
      else {
        this.selectedItems = selectedItems;
      }
    }
  }

  /**
   * 시트 설정창 보기 버튼 클릭시 이벤트
   */
  public async onConfigButtonClick(): Promise<void> {
    const result = await this._modal.showAsync(SdSheet2ConfigModal, "시트 설정창", {
      controls: this.columnControls!.toArray(),
      configRecord: this.config?.columns
    }, {
      useCloseByBackdrop: true
    });
    if (!result) return;

    this.config = this.config ?? {};
    this.config.columns = result;
    await this._systemConfig.setAsync(`sd-sheet.${this.key!}`, this.config);
    this._cdr.markForCheck();
  }

  /**
   * 시트 항목 Expand 버튼 클릭시 이벤트
   */
  public onItemExpandIconClick(itemDef: IItemDef<T>): void {
    if (!itemDef.hasChildren) return;

    let expandedItems = [...this.expandedItems];
    if (this.expandedItems.includes(itemDef.item)) {
      expandedItems.remove(itemDef.item);
    }
    else {
      expandedItems.push(itemDef.item);
    }

    if (this.expandedItemsChange.observed) {
      this.expandedItemsChange.emit(expandedItems);
    }
    else {
      this.expandedItems = expandedItems;
    }
  }

  /**
   * 모든 항목 확장 아이콘 클릭시 이벤트
   */
  public onAllItemsExpandIconClick(): void {
    if (this.isAllItemsExpanded) {
      const expandedItems = [];

      if (this.expandedItemsChange.observed) {
        this.expandedItemsChange.emit(expandedItems);
      }
      else {
        this.expandedItems = expandedItems;
      }
    }
    else {
      const expandedItems = this.displayItemDefs.filter((itemDef) => itemDef.hasChildren).map((item) => item.item);

      if (this.expandedItemsChange.observed) {
        this.expandedItemsChange.emit(expandedItems);
      }
      else {
        this.expandedItems = expandedItems;
      }
    }
  }

  /**
   * 고정된 셀의 위치 보정 (다시 그리기)
   * @private
   */
  private _redrawFixed(): void {
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

  /**
   * 포커싱 표시기 다시 그리기 (Row 표시기, Cell 표시기 모두 다시 그림)
   * @private
   */
  private _redrawFocusIndicator(): void {
    if (!this.sheetContainerElRef) return;

    //-- Cell 포커싱에 따른 Cell Indicator 설정

    const focusCellIndicatorEl = this.sheetContainerElRef.nativeElement.findFirst("> ._focus-cell-indicator")!;

    if (
      document.activeElement instanceof HTMLElement &&
      document.activeElement.tagName === "TD" &&
      document.activeElement.findParent(this.sheetContainerElRef.nativeElement)
    ) {
      focusCellIndicatorEl.style.display = "block";

      focusCellIndicatorEl.style.top = document.activeElement.offsetTop - 2 + "px";
      focusCellIndicatorEl.style.left = document.activeElement.offsetLeft - 2 + "px";
      focusCellIndicatorEl.style.height = document.activeElement.offsetHeight + 3 + "px";
      focusCellIndicatorEl.style.width = document.activeElement.offsetWidth + 3 + "px";
    }
    else {
      focusCellIndicatorEl.style.display = "none";
    }

    //-- Cell 포커싱에 따른 Row Indicator 설정
    const focusRowIndicatorEl = this.sheetContainerElRef.nativeElement.findFirst("> ._focus-row-indicator")!;

    if (
      document.activeElement instanceof HTMLElement &&
      document.activeElement.findParent("tr") &&
      document.activeElement.findParent(this.sheetContainerElRef.nativeElement)
    ) {
      // Row Indicator
      const trEl = document.activeElement.findParent("tr")!;
      focusRowIndicatorEl.style.display = "block";

      focusRowIndicatorEl.style.top = trEl.offsetTop + "px";
      focusRowIndicatorEl.style.left = trEl.offsetLeft + "px";
      focusRowIndicatorEl.style.height = trEl.offsetHeight + "px";
      focusRowIndicatorEl.style.width = trEl.offsetWidth + "px";
    }
    else {
      focusRowIndicatorEl.style.display = "none";
    }
  }

  /**
   * 선택 표시기 다시 그리기
   * @private
   */
  private _redrawSelectIndicator(): void {
    if (!this.sheetContainerElRef) return;

    // Row Select Indicator 설정
    const prevRowSelectIndicatorEls = this.sheetContainerElRef.nativeElement.findAll("> ._row-select-indicator");
    for (const prevRowSelectIndicatorEl of prevRowSelectIndicatorEls) {
      prevRowSelectIndicatorEl.remove();
    }

    for (const selectedItem of this.selectedItems) {
      const rowIndex = this.displayItemDefs.findIndex((def) => def.item === selectedItem);
      const selectedTrEl = this.sheetContainerElRef.nativeElement.findFirst(`> ._sheet > tbody > tr[r="${rowIndex}"]`);
      if (selectedTrEl) {
        const rowSelectIndicatorEl = document.createElement("div");
        rowSelectIndicatorEl.classList.add("_row-select-indicator");
        rowSelectIndicatorEl.style.top = selectedTrEl.offsetTop + "px";
        rowSelectIndicatorEl.style.left = selectedTrEl.offsetLeft + "px";
        rowSelectIndicatorEl.style.height = selectedTrEl.offsetHeight - 1 + "px";
        rowSelectIndicatorEl.style.width = selectedTrEl.offsetWidth - 1 + "px";
        this.sheetContainerElRef.nativeElement.appendChild(rowSelectIndicatorEl);
      }
    }
  }

  /**
   * 셀 포커싱
   * @param r Row index
   * @param c Column index
   * @private
   */
  private _focusCell(r: number, c: number): void {
    if (!this.sheetContainerElRef) return;

    const el = this.sheetContainerElRef.nativeElement.findFirst(`> ._sheet > tbody > tr[r="${r}"] > td[r="${r}"][c="${c}"]`);
    if (!el) return;

    el.focus();
  }

  /**
   * 포커싱된 셀이 반드시 화면에 표시되도록 강제로 스크롤 이동
   * @private
   */
  private _forceScrollToFocusedCell(): void {
    if (!this.sheetContainerElRef) return;
    if (!(document.activeElement instanceof HTMLElement)) return;

    const focusedEl = document.activeElement;
    const containerEl = this.sheetContainerElRef.nativeElement;

    const focusedElOffset = focusedEl.getRelativeOffset(containerEl);

    const theadEl = containerEl.findFirst("> ._sheet > thead")!;
    const fixedThEls = theadEl.findAll("> tr:first-child > th._fixed")!;

    const theadHeight = theadEl.offsetHeight;
    const fixedThWidth = fixedThEls.sum((el) => el.offsetWidth);

    if (focusedElOffset.top < theadHeight) {
      containerEl.scrollTop -= (theadHeight - focusedElOffset.top);
    }
    if (focusedElOffset.left < fixedThWidth) {
      containerEl.scrollLeft -= (fixedThWidth - focusedElOffset.left);
    }

    if (focusedElOffset.left + focusedEl.offsetWidth > containerEl.offsetWidth) {
      containerEl.scrollLeft += focusedElOffset.left + focusedEl.offsetWidth - containerEl.offsetWidth;
    }
  }

  /**
   * 항목 선택 설정
   * @param itemDef 선택 설정할 항목
   * @private
   */
  private _selectItemDef(itemDef: IItemDef<T>): void {
    if (this.selectedItems.includes(itemDef.item)) return;

    let selectedItems = [...this.selectedItems];

    if (this.selectMode === "single") {
      selectedItems = [itemDef.item];
    }
    else {
      selectedItems.push(itemDef.item);
    }

    if (this.selectedItemsChange.observed) {
      this.selectedItemsChange.emit(selectedItems);
    }
    else {
      this.selectedItems = selectedItems;
    }
  }

  /**
   * 항목 선택 해제
   * @param itemDef 선택 해제할 항목
   * @private
   */
  private _unselectItemDef(itemDef: IItemDef<T>): void {
    if (!this.selectedItems.includes(itemDef.item)) return;
    let selectedItems = [...this.selectedItems];
    selectedItems.remove(itemDef.item);


    if (this.selectedItemsChange.observed) {
      this.selectedItemsChange.emit(selectedItems);
    }
    else {
      this.selectedItems = selectedItems;
    }
  }

  /**
   * 정렬 설정 토글
   * @param key 토글할 정렬설정
   * @param multiple 여러 컬럼에 대한 정렬조건을 사용하는 토글인지 여부
   * @private
   */
  private _toggleOrdering(key: string, multiple: boolean): void {
    let ordering = ObjectUtil.clone(this.ordering);

    if (multiple) {
      const orderingItem = ordering.single((item) => item.key === key);
      if (orderingItem) {
        if (orderingItem.desc) {
          ordering.remove(orderingItem);
        }
        else {
          orderingItem.desc = !orderingItem.desc;
        }
      }
      else {
        ordering.push({ key, desc: false });
      }
    }
    else {
      if (ordering.length === 1 && ordering[0].key === key) {
        if (ordering[0].desc) {
          ordering = [];
        }
        else {
          ordering[0].desc = !ordering[0].desc;
        }
      }
      else {
        ordering = [{ key: key, desc: false }];
      }
    }

    if (this.orderingChange.observed) {
      this.orderingChange.emit(ordering);
    }
    else {
      this.ordering = ordering;
    }
  }

  /**
   * 특정셀의 에디트 모드 설정
   * @param editMode 에디트모드 여부
   * @private
   */
  private _setIsFocusedCellEditMode(editMode: boolean): void {
    if (!this.sheetContainerElRef) return;
    if (!(document.activeElement instanceof HTMLElement)) return;
    if (!document.activeElement.findParent(this.sheetContainerElRef.nativeElement)) return;

    const cellEl = document.activeElement.tagName === "TD" ? document.activeElement : document.activeElement.findParent("td");
    if (!cellEl) return;

    if (editMode) {
      this.editMode = true;

      this._zone.run(() => {
        setTimeout(() => {
          const focusableFirstEl = cellEl.findFocusableFirst();
          if (focusableFirstEl) {
            focusableFirstEl.focus();
          }
          else {
            cellEl.focus();
            this.editMode = false;
          }
        });
      });
    }
    else {
      cellEl.focus();
      this.editMode = false;
    }
  }

  /**
   * 시트 설정 재 로딩
   * @private
   */
  private async _reloadConfigAsync(): Promise<void> {
    if (this.key !== undefined) {
      this.config = await this._systemConfig.getAsync(`sd-sheet.${this.key}`);
    }
  }

  /**
   * 시트 설정중 컬럼설정 저장
   * @private
   */
  private async _saveColumnConfigAsync(columnDef: IColumnDef, config: ISdSheet2ColumnConfigVM): Promise<void> {
    if (columnDef.control.key === undefined) return;
    this.config = this.config ?? {};
    this.config.columns = this.config.columns ?? {};
    this.config.columns[columnDef.control.key] = this.config.columns[columnDef.control.key] ?? {};
    Object.assign(this.config.columns[columnDef.control.key]!, config);
    await this._systemConfig.setAsync(`sd-sheet.${this.key}`, this.config);
  }
}

export interface ISdSheet2ColumnOrderingVM {
  key: string;
  desc: boolean;
}

export interface ISdSheet2ItemKeydownEventParam<T> {
  item: T;
  event: KeyboardEvent;
}

export interface ISdSheet2ConfigVM {
  columns?: Partial<Record<string, ISdSheet2ColumnConfigVM>>;
}

export interface ISdSheet2ColumnConfigVM {
  fixed?: boolean;
  width?: string;
  displayOrder?: number;
  hidden?: boolean;
}

interface IColumnDef {
  control: SdSheet2ColumnControl;
  fixed: boolean;
  width: string | undefined;
  hidden: boolean;
  headerLastDepth: number;
}

interface IItemDef<T> {
  item: T;
  parentDef?: IItemDef<T>;
  hasChildren: boolean;
  depth: number;
}
