import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  inject,
  Input,
  NgZone,
  Output,
  QueryList
} from "@angular/core";
import {SdSheetColumnDirective} from "./SdSheetColumnDirective";
import {SdInputValidate} from "../../utils/SdInputValidate";
import {SdSystemConfigProvider} from "../../providers/SdSystemConfigProvider";
import {NumberUtil, ObjectUtil} from "@simplysm/sd-core-common";
import {SdSheetConfigModal} from "./SdSheetConfigModal";
import {SdModalProvider} from "../../providers/SdModalProvider";
import {faCog} from "@fortawesome/pro-duotone-svg-icons/faCog";
import {faArrowRight} from "@fortawesome/pro-duotone-svg-icons/faArrowRight";
import {faSort} from "@fortawesome/pro-solid-svg-icons/faSort";
import {faSortDown} from "@fortawesome/pro-solid-svg-icons/faSortDown";
import {faSortUp} from "@fortawesome/pro-solid-svg-icons/faSortUp";
import {faCaretRight} from "@fortawesome/pro-duotone-svg-icons/faCaretRight";
import {SdDoCheckHelper} from "../../utils/SdDoCheckHelper";

@Component({
  selector: "sd-sheet",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-busy-container [busy]="busy" type="cube">
      <sd-dock-container [hidden]="busy">
        <sd-dock *ngIf="(key || displayPageLength > 0) && !hideConfigBar">
          <div class="flex-row-inline flex-gap-sm">
            <sd-anchor *ngIf="key" (click)="onConfigButtonClick()">
              <fa-icon [icon]="faCog" [fixedWidth]="true"/>
            </sd-anchor>
            <sd-pagination *ngIf="displayPageLength > 1"
                           [page]="page"
                           [pageLength]="displayPageLength"
                           (pageChange)="onPageChange($event)"></sd-pagination>
          </div>
        </sd-dock>

        <sd-pane class="_sheet-container"
                 (scroll)="onContainerScroll($event)">
          <table>
            <thead>
            <ng-container
              *ngFor="let headerRow of displayHeaderDefTable; let r = index; trackBy: trackByFnForHeaderDefTable">
              <tr>
                <th class="_fixed _feature-cell _last-depth"
                    *ngIf="r === 0"
                    [attr.rowspan]="!hasSummaryTemplate && headerRow.length < 1 ? undefined : displayHeaderDefTable.length + (hasSummaryTemplate ? 1 : 0)"
                    [attr.c]="getChildrenFn ? -2 : -1"
                    (sdResize)="onFixedCellResize(getChildrenFn ? -2 : -1)">
                  <ng-container *ngIf="selectMode === 'multi' && hasSelectableItem">
                    <fa-icon [icon]="faArrowRight" [fixedWidth]="true"
                             [class.tx-theme-primary-default]="isAllItemsSelected"
                             (click)="onAllItemsSelectIconClick()"></fa-icon>
                  </ng-container>
                </th>
                <th class="_fixed _feature-cell _last-depth"
                    *ngIf="getChildrenFn && r === 0"
                    [attr.rowspan]="!hasSummaryTemplate && headerRow.length < 1 ? undefined : displayHeaderDefTable.length + (hasSummaryTemplate ? 1 : 0)"
                    [attr.c]="-1"
                    (sdResize)="onFixedCellResize(-1)">
                  <ng-container *ngIf="hasExpandableItem">
                    <fa-icon [icon]="faCaretRight" [fixedWidth]="true"
                             [class.tx-theme-primary-default]="isAllItemsExpanded"
                             [rotate]="isAllItemsExpanded ? 90 : undefined"
                             (click)="onAllItemsExpandIconClick()"></fa-icon>
                  </ng-container>
                </th>
                <ng-container *ngFor="let headerCell of headerRow; let c = index; trackBy: trackByFnForHeaderCell">
                  <th *ngIf="headerCell"
                      [class._fixed]="headerCell.fixed"
                      [attr.colspan]="headerCell.colspan"
                      [attr.rowspan]="headerCell.rowspan"
                      [class._last-depth]="headerCell.isLastDepth"
                      [attr.c]="c"
                      [style.width]="headerCell.isLastDepth ? headerCell.width : undefined"
                      [style.min-width]="headerCell.isLastDepth ? headerCell.width : undefined"
                      [style.max-width]="headerCell.isLastDepth ? headerCell.width : undefined"
                      [class._ordering]="headerCell.isLastDepth && headerCell.control.useOrdering && headerCell.control.key"
                      [attr.title]="headerCell.isLastDepth ? (headerCell.control.tooltip ?? headerCell.text) : undefined"
                      [class.help]="headerCell.isLastDepth && headerCell.control.tooltip"
                      (sdResize)="onHeaderCellResize(headerCell, c)"
                      (click)="onHeaderCellClick($event, headerCell)">
                    <div class="flex-row align-items-end">
                      <div class="_contents flex-grow"
                           [class._padding]="!headerCell.useTemplate"
                           [attr.style]="headerCell!.style">
                        <ng-container *ngIf="!headerCell.useTemplate">
                          <pre>{{ headerCell.text }}</pre>
                        </ng-container>
                        <ng-container *ngIf="headerCell.useTemplate">
                          <ng-template [ngTemplateOutlet]="headerCell.control.headerTemplateRef!"></ng-template>
                        </ng-container>
                      </div>

                      <ng-container
                        *ngIf="headerCell.isLastDepth && headerCell.control.useOrdering && headerCell.control.key">
                        <div class="_sort-icon">
                          <fa-layers>
                            <fa-icon [icon]="faSort" class="tx-trans-lightest"></fa-icon>
                            <fa-icon [icon]="faSortDown"
                                     *ngIf="getIsColumnOrderingDesc(headerCell.control.key) === false"></fa-icon>
                            <fa-icon [icon]="faSortUp"
                                     *ngIf="getIsColumnOrderingDesc(headerCell.control.key) === true"></fa-icon>
                          </fa-layers>
                          <sub *ngIf="getColumnOrderingIndexText(headerCell.control.key) as text">{{ text }}</sub>
                        </div>
                      </ng-container>
                    </div>

                    <div class="_resizer"
                         *ngIf="headerCell.control.resizable && headerCell.isLastDepth"
                         (mousedown)="onResizerMousedown($event, headerCell.control)"
                         (dblclick)="onResizerDoubleClick($event, headerCell.control)"></div>
                  </th>
                </ng-container>
              </tr>
            </ng-container>

            <ng-container *ngIf="hasSummaryTemplate">
              <tr class="_summary-row">
                <ng-container
                  *ngFor="let columnDef of displayColumnDefs; let c = index; trackBy: trackByFnForColumnDef">
                  <th [class._fixed]="columnDef.fixed"
                      [attr.c]="c"
                      [style.width]="columnDef.width"
                      [style.min-width]="columnDef.width"
                      [style.max-width]="columnDef.width">
                    <ng-container *ngIf="columnDef.control.summaryTemplateRef">
                      <ng-template [ngTemplateOutlet]="columnDef.control.summaryTemplateRef"></ng-template>
                    </ng-container>
                  </th>
                </ng-container>
              </tr>
            </ng-container>
            </thead>
            <tbody>
            <ng-container *ngFor="let itemDef of displayItemDefs; let r = index; trackBy: trackByFnForDisplayItemDef">
              <tr [attr.r]="r"
                  (keydown)="this.itemKeydown.emit({ item: itemDef.item, event: $event })"
                  [hidden]="getIsHiddenItemDef(itemDef)">
                <td class="_fixed _feature-cell"
                    [attr.r]="r"
                    [attr.c]="getChildrenFn ? -2 : -1">
                  <ng-container *ngIf="selectMode && getIsItemSelectable(itemDef.item)">
                    <fa-icon [icon]="faArrowRight" [fixedWidth]="true"
                             [class.tx-theme-primary-default]="selectedItems.includes(itemDef.item)"
                             (click)="onItemSelectIconClick(itemDef.item)"></fa-icon>
                  </ng-container>
                </td>
                <td class="_fixed _feature-cell"
                    *ngIf="getChildrenFn"
                    [attr.r]="r"
                    [attr.c]="-1">
                  <ng-container *ngIf="itemDef.depth > 0">
                    <div class="_depth-indicator" [style.margin-left.em]="itemDef.depth - .5"></div>
                  </ng-container>
                  <ng-container *ngIf="itemDef.hasChildren">
                    <fa-icon [icon]="faCaretRight" [fixedWidth]="true"
                             [rotate]="expandedItems.includes(itemDef.item) ? 90 : undefined"
                             [class.tx-theme-primary-default]="expandedItems.includes(itemDef.item)"
                             (click)="onItemExpandIconClick(itemDef.item)"></fa-icon>
                  </ng-container>
                </td>
                <ng-container
                  *ngFor="let columnDef of displayColumnDefs; let c = index; trackBy: trackByFnForColumnDef">
                  <td tabindex="0"
                      [class._fixed]="columnDef.fixed"
                      [attr.r]="r"
                      [attr.c]="c"
                      [style.width]="columnDef.width"
                      [style.min-width]="columnDef.width"
                      [style.max-width]="columnDef.width"
                      (click)="onItemCellClick(itemDef.item)"
                      (dblclick)="onCellDoubleClick($event)"
                      (keydown)="this.cellKeydown.emit({ item: itemDef.item, key: columnDef.control.key, event: $event })">
                    <ng-template [ngTemplateOutlet]="columnDef.control.cellTemplateRef!"
                                 [ngTemplateOutletContext]="{$implicit: itemDef.item, item: itemDef.item, index: r, depth: itemDef.depth, edit: getIsCellEditMode(r, c) }"/>
                  </td>
                </ng-container>
              </tr>
            </ng-container>
            </tbody>
          </table>

          <div class="_focus-row-indicator">
            <div class="_focus-cell-indicator"></div>
          </div>
          <div class="_resize-indicator"></div>
          <div class="_select-row-indicator-container"></div>
        </sd-pane>
      </sd-dock-container>
    </sd-busy-container>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    $z-index-fixed: 2;
    $z-index-head: 3;
    $z-index-head-fixed: 4;
    $z-index-select-row-indicator: 5;
    $z-index-focus-row-indicator: 6;
    $z-index-resize-indicator: 7;

    $border-color: var(--theme-blue-grey-lightest);
    $border-color-dark: var(--theme-grey-light);

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

            > div > sd-anchor {
              padding: var(--gap-xs) var(--gap-sm);
              margin: var(--gap-xs);
              border-radius: var(--border-radius-default);

              &:hover {
                background: var(--theme-grey-lightest);
              }
            }
          }

          > sd-pane._sheet-container {
            background: var(--sheet-bg);
            border-radius: var(--border-radius-default);;

            > table {
              border-spacing: 0;
              table-layout: fixed;
              margin-right: 2px;
              margin-bottom: 2px;

              > * > tr > *:last-child {
                border-right: 1px solid $border-color-dark;
              }

              > * > tr:last-child > * {
                border-bottom: 1px solid $border-color-dark;
              }

              > * > tr > * {
                border-right: 1px solid $border-color;
                border-bottom: 1px solid $border-color;
                white-space: nowrap;
                overflow: hidden;
                padding: 0;
                position: relative;

                &._feature-cell {
                  background: var(--theme-grey-lightest);
                  min-width: 2em;
                  padding: var(--sheet-pv) var(--sheet-ph);

                  > fa-icon {
                    cursor: pointer;
                    color: var(--text-trans-lightest);
                  }
                }

                &._fixed {
                  position: sticky;
                  left: 0;

                  &:has(+:not(._fixed)) {
                    border-right: 1px solid $border-color-dark;
                  }
                }
              }

              > thead {
                position: sticky;
                top: 0;
                z-index: $z-index-head;

                > tr > th {
                  position: relative;
                  background: var(--theme-grey-lightest);
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

                  &._ordering {
                    cursor: pointer;

                    &:hover {
                      text-decoration: underline;
                    }
                  }

                  > div:first-child {
                    > ._contents {
                      &._padding {
                        padding: var(--sheet-pv) var(--sheet-ph);
                      }
                    }

                    > ._sort-icon {
                      display: inline-block;
                      padding: var(--gap-xs) var(--gap-xs) var(--gap-xs) 0;
                      background-color: var(--theme-grey-lightest);
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

                &:has(> tr._summary-row) {
                  > tr > th._last-depth {
                    border-bottom: 1px solid $border-color;
                  }

                  > tr._summary-row > th {
                    background: var(--theme-warning-lightest);
                    text-align: left;
                    border-bottom: 1px solid $border-color-dark;
                  }
                }
              }

              > tbody > tr > td {
                background: white;
                vertical-align: top;

                &._fixed {
                  z-index: $z-index-fixed;
                }

                > ._depth-indicator {
                  display: inline-block;
                  margin-top: .4em;
                  width: .5em;
                  height: .5em;
                  border-left: 1px solid var(--text-trans-default);
                  border-bottom: 1px solid var(--text-trans-default);
                  vertical-align: top;
                }
              }
            }

            > ._focus-row-indicator {
              display: none;
              position: absolute;
              pointer-events: none;
              background: rgba(158, 158, 158, .1);

              z-index: $z-index-focus-row-indicator;

              > ._focus-cell-indicator {
                position: absolute;
                border: 2px solid var(--theme-primary-default);
              }
            }

            > ._resize-indicator {
              display: none;
              position: absolute;
              pointer-events: none;
              top: 0;
              height: 100%;
              border: 1px dotted $border-color-dark;

              z-index: $z-index-resize-indicator;
            }

            > ._select-row-indicator-container {
              display: none;
              position: absolute;
              pointer-events: none;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;

              z-index: $z-index-select-row-indicator;

              > ._select-row-indicator {
                display: block;
                left: 0;
                position: absolute;
                pointer-events: none;
                background: var(--theme-primary-default);
                opacity: .1;
              }
            }
          }
        }
      }

      &[sd-inset=true] {
        ::ng-deep > sd-busy-container {
          border-radius: var(--border-radius-default);

          > ._screen {
            border-radius: var(--border-radius-default);
          }

          > sd-dock-container > ._content {

            border: none;
            border-radius: 0;
          }
        }
      }
    }
  `]
})
export class SdSheetControl<T> implements DoCheck {
  faCog = faCog;
  faArrowRight = faArrowRight;
  faSort = faSort;
  faSortDown = faSortDown;
  faSortUp = faSortUp;
  faCaretRight = faCaretRight;

  #cdr = inject(ChangeDetectorRef);
  #ngZone = inject(NgZone);
  #sdSystemConfig = inject(SdSystemConfigProvider);
  #sdModal = inject(SdModalProvider);
  #elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  @ContentChildren(SdSheetColumnDirective)
  columnControls?: QueryList<SdSheetColumnDirective<T>>;

  /**
   * 시트설정 저장 키
   */
  @Input({required: true})
  @SdInputValidate({type: String, notnull: true})
  key!: string;

  /**
   * 설정 및 페이징 바 표시여부
   */
  @Input()
  @SdInputValidate(Boolean)
  hideConfigBar?: boolean;

  /**
   * BORDER를 없애는등 다른 박스안에 완전히 붙임
   */
  @Input()
  @SdInputValidate({type: Boolean})
  @HostBinding("attr.sd-inset")
  inset?: boolean;

  /**
   * 정렬규칙
   */
  @Input()
  @SdInputValidate({type: Array, notnull: true})
  ordering: ISdSheetColumnOrderingVM[] = [];

  /**
   * 정렬규칙 변경 이벤트
   */
  @Output()
  orderingChange = new EventEmitter<ISdSheetColumnOrderingVM[]>();

  /**
   * [pagination] 현재 표시 페이지
   */
  @Input()
  @SdInputValidate({type: Number, notnull: true})
  page = 0;

  /**
   * [pagination] 현재 표시페이지 변화 이벤트
   */
  @Output()
  pageChange = new EventEmitter<number>();

  /**
   * [pagination] 총 페이지 길이
   */
  @Input()
  @SdInputValidate({type: Number, notnull: true})
  pageLength = 0;

  /**
   * [pagination] 한 페이지에 표시할 항목수 (설정된 경우, 'pageLength'가 무시되고, 자동계산 됨)
   */
  @Input()
  @SdInputValidate(Number)
  pageItemCount?: number;

  /**
   * 항목들
   */
  @Input({required: true})
  @SdInputValidate({type: Array, notnull: true})
  items: T[] = [];

  /**
   * 데이터 키를 가져오기 위한 함수 (ROW별로 반드시 하나의 값을 반환해야함)
   * @param index 'items'내의 index
   * @param item items[index] 데이터
   */
  @Input()
  @SdInputValidate({type: Function, notnull: true})
  trackByFn = (index: number, item: T): any => item;

  /**
   * 선택모드 (single = 단일선택, multi = 다중선택)
   */
  @Input()
  @SdInputValidate({type: String, includes: ["single", "multi"]})
  selectMode?: "single" | "multi";

  /**
   * 선택된 항목들
   */
  @Input()
  @SdInputValidate({type: Array, notnull: true})
  selectedItems: T[] = [];

  /**
   * 선택된 항목 변경 이벤트
   */
  @Output()
  selectedItemsChange = new EventEmitter<T[]>();

  /**
   * 자동선택모드 (undefined = 사용안함, click = 셀 클릭시 해당 ROW 선택, focus = 셀 포커싱시 해당 ROW 선택)
   */
  @Input()
  @SdInputValidate({type: String, includes: ["click", "focus"]})
  autoSelect?: "click" | "focus";

  /**
   * 항목별로 선택가능여부를 설정하는 함수
   */
  @Input()
  @SdInputValidate(Function)
  getIsItemSelectableFn?: (item: T) => boolean;

  /**
   * 확장된 항목 목록
   */
  @Input()
  @SdInputValidate({type: Array, notnull: true})
  expandedItems: T[] = [];

  @Input()
  @SdInputValidate(Boolean)
  busy?: boolean;

  /**
   * 확장된 항목 변경 이벤트
   */
  @Output()
  expandedItemsChange = new EventEmitter<T[]>();

  /**
   * 항목 키 다운 이벤트
   */
  @Output()
  itemKeydown = new EventEmitter<ISdSheetItemKeydownEventParam<T>>();

  /**
   * 셀 키 다운 이벤트
   */
  @Output()
  cellKeydown = new EventEmitter<ISdSheetItemKeydownEventParam<T>>();

  /**
   * Children 설정하는 함수
   */
  @Input()
  @SdInputValidate(Function)
  getChildrenFn?: (index: number, item: T) => (T[] | undefined);

  displayColumnDefs: IColumnDef<T>[] = [];
  displayHeaderDefTable: (IHeaderDef<T> | undefined)[][] = [];
  displayPageLength = 0;
  displayItemDefs: IItemDef<T>[] = [];
  hasSelectableItem = false;
  isAllItemsSelected = false;
  hasSummaryTemplate = false;
  hasExpandableItem = false;
  isAllItemsExpanded = false;

  trackByFnForHeaderDefTable = (i: number, item: IHeaderDef<T>[]): number => i;
  trackByFnForHeaderCell = (i: number, item: IHeaderDef<T>): string => item?.control.guid;
  trackByFnForColumnDef = (i: number, item: IColumnDef<T>): string => item.control.guid;
  trackByFnForDisplayItemDef = (i: number, item: IItemDef<T>): any => this.trackByFn(i, item.item);

  #config?: ISdSheetConfig;

  #editModeCellAddr?: { r: number; c: number };

  #resizedWidths: Record<string, string | undefined> = {};
  #isOnResizing = false;

  orderedItems: T[] = [];
  orderedPagedItems: T[] = [];

  /**
   * 변수 변경 체크 ng Lifecycle
   */
  ngDoCheck(): void {
    SdDoCheckHelper.use(async $ => {
      //-- config
      await $.run({
        key: [this.key]
      }, async () => {
        this.#config = await this.#sdSystemConfig.getAsync(`sd-sheet.${this.key}`);
      });

      //-- column/header defs
      $.run({
        columnControls: [this.columnControls, "one"],
        config: [this.#config],
        resizedWidths: [this.#resizedWidths, "one"]
      }, () => {
        //-- displayColumnDefs
        if (this.columnControls) {
          this.displayColumnDefs = this.columnControls
            .map((columnControl) => {
              const config = columnControl.key === undefined ? undefined : this.#config?.columnRecord?.[columnControl.key];
              return {
                control: columnControl,
                key: columnControl.key,
                fixed: config?.fixed ?? columnControl.fixed,
                width: this.#resizedWidths[columnControl.guid] ?? config?.width ?? columnControl.width,
                displayOrder: config?.displayOrder,
                hidden: config?.hidden ?? columnControl.hidden,
                headerStyle: columnControl.headerStyle
              };
            })
            .filter((item) => !item.hidden && !item.control.collapse)
            .orderBy((item) => item.displayOrder)
            .orderBy((item) => (item.fixed ? -1 : 0))
            .map((item) => ({
              control: item.control,
              fixed: item.fixed,
              width: item.width,
              headerStyle: item.headerStyle
            }));
        }
        else {
          this.displayColumnDefs = [];
        }

        //-- displayHeaderDefTable
        const tempHeaderDefTable: ({
          control: SdSheetColumnDirective<T>;
          width: string | undefined;
          fixed: boolean;
          text: string | undefined;
          useTemplate: string | undefined;
          style: string | undefined;
        } | undefined)[][] = [];
        for (let c = 0; c < this.displayColumnDefs.length; c++) {
          const columnDef = this.displayColumnDefs[c];

          const headers = columnDef.control.header === undefined ? []
            : typeof columnDef.control.header === "string" ? [columnDef.control.header]
              : columnDef.control.header;

          for (let r = 0; r < headers.length; r++) {
            tempHeaderDefTable[r] = tempHeaderDefTable[r] ?? [];
            tempHeaderDefTable[r][c] = {
              control: columnDef.control,
              width: columnDef.width,
              fixed: columnDef.fixed ?? false,
              text: headers[r],
              useTemplate: undefined,
              style: columnDef.headerStyle
            };
          }
          if (columnDef.control.headerTemplateRef) {
            tempHeaderDefTable[headers.length] = tempHeaderDefTable[headers.length] ?? [];
            tempHeaderDefTable[headers.length][c] = {
              control: columnDef.control,
              width: columnDef.width,
              fixed: columnDef.fixed ?? false,
              text: undefined,
              useTemplate: columnDef.control.guid,
              style: columnDef.headerStyle
            };
          }
        }

        const headerDefTable: (IHeaderDef<T> | undefined)[][] = [];
        for (let r = 0; r < tempHeaderDefTable.length; r++) {
          headerDefTable[r] = [];

          const colLength = tempHeaderDefTable[r].length;
          for (let c = 0; c < colLength; c++) {
            if (!tempHeaderDefTable[r][c]) continue;

            if (c > 0) {
              let isIgnore = true;
              for (let rr = 0; rr <= r; rr++) {
                if (!ObjectUtil.equal(tempHeaderDefTable[rr][c], tempHeaderDefTable[rr][c - 1], {includes: ["text", "fixed", "useTemplate", "isLastDepth"]})) {
                  isIgnore = false;
                  break;
                }
              }
              if (isIgnore) continue;
            }

            headerDefTable[r][c] = {
              control: tempHeaderDefTable[r][c]!.control,
              width: tempHeaderDefTable[r][c]!.width,
              fixed: tempHeaderDefTable[r][c]!.fixed,
              colspan: undefined,
              rowspan: undefined,
              text: tempHeaderDefTable[r][c]!.text,
              useTemplate: Boolean(tempHeaderDefTable[r][c]!.useTemplate),
              isLastDepth: false,

              style: tempHeaderDefTable[r][c]!.style
            };

            // rowspan

            let rowspan = 1;
            for (let rr = r + 1; rr < tempHeaderDefTable.length; rr++) {
              if (tempHeaderDefTable[rr][c] !== undefined) break;
              rowspan++;
            }
            if (rowspan > 1) {
              headerDefTable[r][c]!.rowspan = rowspan;
            }

            // last-depth

            if (r + rowspan === tempHeaderDefTable.length) {
              headerDefTable[r][c]!.isLastDepth = true;
            }
            else {

              // colspan

              let colspan = 1;
              for (let cc = c + 1; cc < colLength; cc++) {
                let isDiff = false;
                for (let rr = 0; rr <= r; rr++) {
                  if (!ObjectUtil.equal(tempHeaderDefTable[rr][c], tempHeaderDefTable[rr][cc], {includes: ["text", "fixed", "useTemplate", "isLastDepth"]})) {
                    isDiff = true;
                    break;
                  }
                }
                if (isDiff) break;

                colspan++;
              }
              if (colspan > 1) {
                headerDefTable[r][c]!.colspan = colspan;
              }
            }
          }
        }

        this.displayHeaderDefTable = headerDefTable;
      });

      //-- displayPageLength
      $.run({
        pageItemCount: [this.pageItemCount],
        itemsLength: [this.items.length],
        pageLength: [this.pageLength]
      }, () => {
        if (this.pageItemCount !== undefined && this.pageItemCount !== 0 && this.items.length > 0) {
          this.displayPageLength = Math.ceil(this.items.length / this.pageItemCount);
        }
        else if (this.displayPageLength !== this.pageLength) {
          this.displayPageLength = this.pageLength;
        }
      });

      //-- items: ordering
      $.run({
        items: [this.items, "one"],
        observedOrdering: [!this.orderingChange.observed ? this.ordering : undefined, "all"]
      }, () => {
        let orderedItems = [...this.items];
        if (!this.orderingChange.observed) {
          for (const orderingItem of this.ordering.reverse()) {
            if (orderingItem.desc) {
              orderedItems = orderedItems.orderByDesc((item) => item[orderingItem.key]);
            }
            else {
              orderedItems = orderedItems.orderBy((item) => item[orderingItem.key]);
            }
          }
        }
        this.orderedItems = orderedItems;
      });

      //-- items: paging
      $.run({
        orderedItems: [this.orderedItems],
        pageItemCount: [this.pageItemCount],
        itemsLength: [this.items.length],
        page: [this.page]
      }, () => {
        let orderedPagedItems = [...this.orderedItems];
        if (this.pageItemCount !== undefined && this.pageItemCount !== 0 && this.items.length > 0) {
          orderedPagedItems = orderedPagedItems.slice(this.page * this.pageItemCount, (this.page + 1) * this.pageItemCount);
        }
        this.orderedPagedItems = orderedPagedItems;
      });

      //-- displayItemDefs
      $.run({
        orderedPagedItems: [this.orderedPagedItems],
        getChildrenFn: [this.getChildrenFn],
        observedOrdering: [!this.orderingChange.observed ? this.ordering : undefined, "all"]
      }, () => {
        let displayItemDefs: IItemDef<T>[] = this.orderedPagedItems.map((item) => ({
          item,
          parentDef: undefined,
          hasChildren: false,
          depth: 0
        }));

        if (this.getChildrenFn) {
          let fn = (arr: IItemDef<T>[]): IItemDef<T>[] => {
            let fnResult: IItemDef<T>[] = [];
            for (let i = 0; i < arr.length; i++) {
              fnResult.push(arr[i]);

              const children = this.getChildrenFn!(i, arr[i].item) ?? [];
              if (children.length > 0) {
                arr[i].hasChildren = true;


                let displayChildren = children;
                if (!this.orderingChange.observed) {
                  for (const orderingItem of this.ordering.reverse()) {
                    if (orderingItem.desc) {
                      displayChildren = displayChildren.orderByDesc((item) => item[orderingItem.key]);
                    }
                    else {
                      displayChildren = displayChildren.orderBy((item) => item[orderingItem.key]);
                    }
                  }
                }

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

          displayItemDefs = fn(displayItemDefs);
        }

        this.displayItemDefs = displayItemDefs;

        /*const prevFocusEl = document.activeElement;
        if (prevFocusEl instanceof HTMLElement && prevFocusEl.findParent(this._elRef.nativeElement)) {
          const prevFocusTdEl = prevFocusEl.tagName === "TD" ? prevFocusEl : prevFocusEl.findParent("td");
          if (prevFocusTdEl) {
            const addr = {
              r: NumberUtil.parseInt(prevFocusTdEl.getAttribute("r")),
              c: NumberUtil.parseInt(prevFocusTdEl.getAttribute("c"))
            };
            requestAnimationFrame(() => {
              if (document.activeElement !== prevFocusEl) {
                const newFocusTdEl = this._elRef.nativeElement.findFirst<HTMLTableCellElement>(`._sheet-container > table > tbody > tr[r='${addr.r}'] > td[r='${addr.r}'][c='${addr.c}']`);
                newFocusTdEl?.focus();
              }
            });
          }
        }*/
      });

      // select props
      $.run({
        selectMode: [this.selectMode],
        displayItemDefs: [this.displayItemDefs],
        getIsItemSelectable: [this.getIsItemSelectable],
        selectedItems: [this.selectedItems, "one"]
      }, () => {
        if (this.selectMode) {
          const selectableItems = this.displayItemDefs.filter((item) => this.getIsItemSelectable(item.item)).map((item) => item.item);
          this.hasSelectableItem = selectableItems.length > 0;
          this.isAllItemsSelected = selectableItems.length <= this.selectedItems.length && selectableItems.every((item) => this.selectedItems.includes(item));
        }
        else {
          this.hasSelectableItem = false;
          this.isAllItemsSelected = false;
        }
      });

      // expand props
      $.run({
        getChildrenFn: [this.getChildrenFn],
        displayItemDefs: [this.displayItemDefs],
        expandedItems: [this.expandedItems, "one"]
      }, () => {
        if (this.getChildrenFn) {
          const expandableItemDefs = this.displayItemDefs.filter((item) => item.hasChildren);
          this.hasExpandableItem = expandableItemDefs.length > 0;
          this.isAllItemsExpanded = expandableItemDefs.length <= this.expandedItems.length && expandableItemDefs.every((itemDef) => this.expandedItems.includes(itemDef.item));
        }
        else {
          this.hasExpandableItem = false;
          this.isAllItemsExpanded = false;
        }
      });


      //-- summary props
      $.run({
        columnControls: [this.columnControls, "one"]
      }, () => {
        if (this.columnControls) {
          this.hasSummaryTemplate = this.columnControls.some((item) => item.summaryTemplateRef !== undefined);
        }
        else {
          this.hasSummaryTemplate = false;
        }
      });
    }, this.#cdr);
  }

  getIsCellEditMode(r: number, c: number): boolean {
    return this.#editModeCellAddr !== undefined && this.#editModeCellAddr.r === r && this.#editModeCellAddr.c === c;
  }

  /**
   * 셀렉팅 가능한 항목인지 확인
   * @param item
   */
  getIsItemSelectable(item: T): boolean {
    return !this.getIsItemSelectableFn || this.getIsItemSelectableFn(item);
  }

  /**
   * 컬럼 컨트롤의 오더링 방향이 DESC인지 여부 가져오기
   * @param columnKey
   */
  getIsColumnOrderingDesc(columnKey: string): boolean | undefined {
    return this.ordering.single((item) => item.key === columnKey)?.desc;
  }

  /**
   * 컬럼 컨트롤의 오더링 순서번호 가져오기
   * @param columnKey
   */
  getColumnOrderingIndexText(columnKey: string): string | undefined {
    if (this.ordering.length < 2) {
      return undefined;
    }
    const index = this.ordering.findIndex((item) => item.key === columnKey);
    return index >= 0 ? (index + 1).toString() : undefined;
  }

  /**
   * 모든 상위항목이 Expand됬는지 여부 가져오기
   * @param itemDef
   */
  getIsHiddenItemDef(itemDef: IItemDef<T>): boolean {
    let currItemDef = itemDef;
    while (currItemDef.parentDef) {
      if (!this.expandedItems.some((item) => item === currItemDef.parentDef!.item)) {
        return true;
      }

      currItemDef = currItemDef.parentDef;
    }
    return false;
  }


  @HostListener("focus.capture", ["$event"])
  onFocusCapture(event: FocusEvent): void {
    if (!(event.target instanceof HTMLElement)) return;

    const sheetContainerEl = this.#elRef.nativeElement.findFirst("._sheet-container")!;
    const focusRowIndicatorEl = sheetContainerEl.findFirst<HTMLDivElement>("> ._focus-row-indicator")!;

    const theadEl = sheetContainerEl.findFirst<HTMLTableSectionElement>("> table > thead")!;
    const fixedHeaderLastDepthEls = theadEl.findAll<HTMLTableCellElement>("> tr > th._last-depth._fixed")!;

    const focusCellIndicatorEl = focusRowIndicatorEl.firstElementChild as HTMLElement;

    const tdEl = event.target.tagName.toLowerCase() === "td" ? event.target : event.target.findParent("td");
    if (!(tdEl instanceof HTMLTableCellElement)) return;

    const trEl = tdEl.parentElement!;
    const rowRect = {
      top: trEl.offsetTop,
      left: trEl.offsetLeft,
      width: trEl.offsetWidth,
      height: trEl.offsetHeight
    };
    const cellRect = {
      left: tdEl.offsetLeft - (tdEl.classList.contains("_fixed") ? sheetContainerEl.scrollLeft : 0),
      width: tdEl.offsetWidth,
      height: tdEl.offsetHeight
    };
    const noneFixedPosition = {
      top: theadEl.offsetHeight,
      left: fixedHeaderLastDepthEls.sum((item) => item.offsetWidth)
    };
    const scroll = {
      top: sheetContainerEl.scrollTop,
      left: sheetContainerEl.scrollLeft
    };

    Object.assign(focusRowIndicatorEl.style, {
      display: "block",
      top: rowRect.top - 2 + "px",
      left: rowRect.left + "px",
      width: rowRect.width + "px",
      height: rowRect.height + 3 + "px"
    });
    Object.assign(focusCellIndicatorEl.style, {
      display: event.target.tagName.toLowerCase() === "td" ? "block" : "none",
      position: tdEl.classList.contains("_fixed") ? "sticky" : "absolute",
      left: cellRect.left - 2 + "px",
      width: cellRect.width + 3 + "px",
      height: cellRect.height + 3 + "px",
      opacity: "1"
    });

    if (!tdEl.classList.contains("_fixed")) {
      if (rowRect.top - scroll.top < noneFixedPosition.top) {
        sheetContainerEl.scrollTop = rowRect.top - noneFixedPosition.top;
      }
      if (cellRect.left - scroll.left < noneFixedPosition.left) {
        sheetContainerEl.scrollLeft = cellRect.left - noneFixedPosition.left;
      }
    }

    const item = this.displayItemDefs[NumberUtil.parseInt(tdEl.getAttribute("r"))!].item;
    if (this.autoSelect === "focus" && this.getIsItemSelectable(item)) {
      this.#selectItem(item);
      this.#cdr.markForCheck();
    }
  }

  @HostListener("blur.capture", ["$event"])
  onBlurCapture(event: FocusEvent): void {
    if (
      event.target instanceof HTMLTableCellElement &&
      !(
        event.relatedTarget instanceof HTMLTableCellElement &&
        event.relatedTarget.findParent(this.#elRef.nativeElement)
      )
    ) {
      const focusRowIndicatorEl = this.#elRef.nativeElement.findFirst<HTMLDivElement>("._focus-row-indicator")!;
      const focusCellIndicatorEl = focusRowIndicatorEl.firstElementChild as HTMLElement;

      focusCellIndicatorEl.style.display = "none";

      if (
        !(event.relatedTarget instanceof HTMLElement) ||
        !event.relatedTarget.findParent(event.target)
      ) {
        focusRowIndicatorEl.style.display = "none";
      }
    }

    if (
      this.#editModeCellAddr &&
      !(
        event.target instanceof HTMLElement &&
        event.relatedTarget instanceof HTMLElement &&
        (event.target.findParent("td") ?? event.target) === event.relatedTarget.findParent("td")
      )
    ) {
      this.#editModeCellAddr = undefined;
      this.#cdr.markForCheck();
    }
  }

  @HostListener("keydown.capture", ["$event"])
  onKeydownCapture(event: KeyboardEvent): void {
    if (event.target instanceof HTMLTableCellElement) {
      if (event.key === "F2") {
        event.preventDefault();
        this.#editModeCellAddr = {
          r: NumberUtil.parseInt(event.target.getAttribute("r"))!,
          c: NumberUtil.parseInt(event.target.getAttribute("c"))!
        };
        requestAnimationFrame(() => {
          const focusableEl = (event.target as HTMLElement).findFocusableFirst();
          if (focusableEl) focusableEl.focus();
        });
      }
      else if (event.key === "ArrowDown") {
        if (this.#moveCellIfExists(event.target, 1, 0, false)) {
          event.preventDefault();
        }
      }
      else if (event.key === "ArrowUp") {
        if (this.#moveCellIfExists(event.target, -1, 0, false)) {
          event.preventDefault();
        }
      }
      else if (event.key === "ArrowRight") {
        if (this.#moveCellIfExists(event.target, 0, 1, false)) {
          event.preventDefault();
        }
      }
      else if (event.key === "ArrowLeft") {
        if (this.#moveCellIfExists(event.target, 0, -1, false)) {
          event.preventDefault();
        }
      }
    }
    else if (event.target instanceof HTMLElement) {
      const tdEl = event.target.findParent("td") as HTMLTableCellElement | undefined;
      if (!tdEl) return;
      if (event.key === "Escape") {
        event.preventDefault();
        tdEl.focus();
        this.#editModeCellAddr = undefined;
      }
      else if (event.ctrlKey && event.key === "ArrowDown") {
        if (this.#moveCellIfExists(tdEl, 1, 0, true)) {
          event.preventDefault();
        }
      }
      else if (event.ctrlKey && event.key === "ArrowUp") {
        if (this.#moveCellIfExists(tdEl, -1, 0, true)) {
          event.preventDefault();
        }
      }
      else if (event.ctrlKey && event.key === "ArrowRight") {
        if (this.#moveCellIfExists(tdEl, 0, 1, true)) {
          event.preventDefault();
        }
      }
      else if (event.ctrlKey && event.key === "ArrowLeft") {
        if (this.#moveCellIfExists(tdEl, 0, -1, true)) {
          event.preventDefault();
        }
      }
    }
  }

  onContainerScroll(event: Event): void {
    if (!(document.activeElement instanceof HTMLTableCellElement)) return;

    const sheetContainerEl = event.target as HTMLElement;
    const focusRowIndicatorEl = sheetContainerEl.findFirst<HTMLDivElement>("> ._focus-row-indicator")!;

    const theadEl = sheetContainerEl.findFirst<HTMLTableSectionElement>("> table > thead")!;
    const fixedHeaderLastDepthEls = theadEl.findAll<HTMLTableCellElement>("> tr > th._last-depth._fixed")!;

    const focusCellIndicatorEl = focusRowIndicatorEl.firstElementChild as HTMLElement;

    const noneFixedPosition = {
      top: theadEl.offsetHeight,
      left: fixedHeaderLastDepthEls.sum((item) => item.offsetWidth)
    };
    const indicatorPosition = {
      top: focusRowIndicatorEl.offsetTop - sheetContainerEl.scrollTop + 2,
      left: focusCellIndicatorEl.offsetLeft - sheetContainerEl.scrollLeft + 2
    };

    if (
      indicatorPosition.top < noneFixedPosition.top ||
      indicatorPosition.left < noneFixedPosition.left
    ) {
      focusCellIndicatorEl.style.opacity = ".3";
    }
    else {
      focusCellIndicatorEl.style.opacity = "1";
    }
  }

  /**
   * 페이지 변경시 이벤트
   * @param page
   */
  onPageChange(page: number): void {
    if (this.page === page) return;

    if (this.pageChange.observed) {
      this.pageChange.emit(page);
    }
    else {
      this.page = page;
    }
  }

  onHeaderCellResize(headerCell: IHeaderDef<T>, c: number): void {
    if (headerCell.fixed && headerCell.isLastDepth) {
      this.onFixedCellResize(c);
    }
  }

  onFixedCellResize(c: number): void {
    const sheetContainerEl = this.#elRef.nativeElement.findFirst("._sheet-container")!;

    const fixedColumnLength = this.displayColumnDefs.filter((item) => item.fixed).length;

    const nextFixedColumnIndexes = Array(fixedColumnLength - c - 1).fill(0).map((a, b) => b + c + 1);

    const scrollLeft = sheetContainerEl.scrollLeft;
    for (const nextFixedColumnIndex of nextFixedColumnIndexes) {
      const thEl = sheetContainerEl.findFirst<HTMLTableCellElement>(`> table > thead > tr > th._last-depth[c='${nextFixedColumnIndex - 1}']`);
      const nextLeft = thEl ? thEl.offsetLeft + thEl.offsetWidth - scrollLeft : 0;
      const nextEls = sheetContainerEl.findAll<HTMLTableCellElement>(`> table > * > tr > *[c='${nextFixedColumnIndex}']`);
      for (const nextEl of nextEls) {
        nextEl.style.left = nextLeft + "px";
      }
    }
  }

  onResizerMousedown(event: MouseEvent, columnControl: SdSheetColumnDirective<T>): void {
    this.#isOnResizing = true;

    const thEl = (event.target as HTMLElement).findParent("th")!;
    const resizeIndicatorEl = this.#elRef.nativeElement.findFirst<HTMLDivElement>("._sheet-container > ._resize-indicator")!;

    const startX = event.clientX;
    const startWidthPx = thEl.clientWidth;
    const startLeft = thEl.offsetLeft;

    const doDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      Object.assign(resizeIndicatorEl.style, {
        display: "block",
        left: startLeft + startWidthPx + e.clientX - startX + "px"
      });
    };

    const stopDrag = async (e: MouseEvent): Promise<void> => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);

      resizeIndicatorEl.style.display = "none";

      const newWidthPx = Math.max(startWidthPx + e.clientX - startX, 5);
      this.#resizedWidths[columnControl.guid] = newWidthPx + 1 + "px";

      if (columnControl.key !== undefined) {
        await this.#saveColumnConfigAsync(columnControl.key, {width: newWidthPx + "px"});
      }

      this.#ngZone.run(() => {
        this.#cdr.markForCheck();
      });

      setTimeout(() => {
        this.#isOnResizing = false;
      }, 300);
    };

    this.#ngZone.runOutsideAngular(() => {
      document.documentElement.addEventListener("mousemove", doDrag, false);
      document.documentElement.addEventListener("mouseup", stopDrag, false);
    });
  }

  async onResizerDoubleClick(event: MouseEvent, columnControl: SdSheetColumnDirective<T>): Promise<void> {
    delete this.#resizedWidths[columnControl.guid];

    if (columnControl.key !== undefined) {
      await this.#saveColumnConfigAsync(columnControl.key, {width: undefined});
      this.#cdr.markForCheck();
    }
  }

  /**
   * ROW 셀렉터 클릭시 이벤트
   * @param item
   */
  onItemSelectIconClick(item: T): void {
    if (!this.getIsItemSelectable(item)) return;

    if (this.selectedItems.includes(item)) {
      this.#unselectItem(item);
    }
    else {
      this.#selectItem(item);
    }
  }

  onItemExpandIconClick(item: T): void {
    let expandedItems = [...this.expandedItems];
    if (this.expandedItems.includes(item)) {
      expandedItems.remove(item);
    }
    else {
      expandedItems.push(item);
    }

    if (this.expandedItemsChange.observed) {
      this.expandedItemsChange.emit(expandedItems);
    }
    else {
      this.expandedItems = expandedItems;
    }
  }

  onItemCellClick(item: T): void {
    if (this.autoSelect !== "click") return;
    if (!this.getIsItemSelectable(item)) return;

    this.#selectItem(item);
  }

  onCellDoubleClick(event: MouseEvent): void {
    if (!(event.target instanceof HTMLElement)) return;
    const tdEl = event.target.tagName === "TD" ? event.target : event.target.findParent("td")!;

    this.#editModeCellAddr = {
      r: NumberUtil.parseInt(tdEl.getAttribute("r"))!,
      c: NumberUtil.parseInt(tdEl.getAttribute("c"))!
    };
    requestAnimationFrame(() => {
      const focusableEl = tdEl.findFocusableFirst();
      if (focusableEl) focusableEl.focus();
    });
  }

  onAllItemsSelectIconClick(): void {
    if (this.isAllItemsSelected) {
      if (this.selectedItemsChange.observed) {
        this.selectedItemsChange.emit([]);
      }
      else {
        this.selectedItems = [];
      }
    }
    else {
      const selectedItems = this.displayItemDefs.filter((item) => this.getIsItemSelectable(item.item)).map((item) => item.item);

      if (this.selectedItemsChange.observed) {
        this.selectedItemsChange.emit(selectedItems);
      }
      else {
        this.selectedItems = selectedItems;
      }
    }
  }

  onAllItemsExpandIconClick(): void {
    if (this.isAllItemsExpanded) {
      if (this.expandedItemsChange.observed) {
        this.expandedItemsChange.emit([]);
      }
      else {
        this.expandedItems = [];
      }
    }
    else {
      const expandedItems = this.displayItemDefs.filter((item) => item.hasChildren).map((item) => item.item);

      if (this.expandedItemsChange.observed) {
        this.expandedItemsChange.emit(expandedItems);
      }
      else {
        this.expandedItems = expandedItems;
      }
    }
  }

  /**
   * 헤더 클릭시 이벤트
   * @param event
   * @param headerCell
   */
  onHeaderCellClick(event: MouseEvent, headerCell: IHeaderDef<T>): void {
    if (headerCell.isLastDepth && headerCell.control.useOrdering && headerCell.control.key != null) {
      if (this.#isOnResizing) return;
      if (event.target instanceof HTMLElement && event.target.classList.contains("_resizer")) return;
      if (event.shiftKey || event.ctrlKey) {
        this.#toggleOrdering(headerCell.control.key, true);
      }
      else {
        this.#toggleOrdering(headerCell.control.key, false);
      }
    }
  }

  /**
   * 시트 설정창 보기 버튼 클릭시 이벤트
   */
  async onConfigButtonClick(): Promise<void> {
    const result = await this.#sdModal.showAsync(SdSheetConfigModal, "시트 설정창", {
      sheetKey: this.key,
      controls: this.columnControls!.toArray(),
      config: this.#config
    }, {
      useCloseByBackdrop: true
    });
    if (!result) return;

    this.#config = result;
    await this.#sdSystemConfig.setAsync(`sd-sheet.${this.key!}`, this.#config);
    this.#cdr.markForCheck();
  }

  /**
   * 정렬 설정 토글
   * @param key 토글할 정렬설정
   * @param multiple 여러 컬럼에 대한 정렬조건을 사용하는 토글인지 여부
   * @private
   */
  #toggleOrdering(key: string, multiple: boolean): void {
    let ordering = ObjectUtil.clone(this.ordering);

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
      if (multiple) {
        ordering.push({key, desc: false});
      }
      else {
        ordering = [{key, desc: false}];
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
   * 항목 선택 설정
   * @param item 선택 설정할 항목
   * @private
   */
  #selectItem(item: T): void {
    if (this.selectedItems.includes(item)) return;

    if (this.selectedItemsChange.observed) {
      if (this.selectMode === "single") {
        this.selectedItemsChange.emit([item]);
      }
      else {
        this.selectedItemsChange.emit([...this.selectedItems, item]);
      }
    }
    else {
      if (this.selectMode === "single") {
        this.selectedItems = [item];
      }
      else {
        this.selectedItems.push(item);
      }
    }
  }

  /**
   * 항목 선택 해제
   * @param item 선택 해제할 항목
   * @private
   */
  #unselectItem(item: T): void {
    if (!this.selectedItems.includes(item)) return;

    if (this.selectedItemsChange.observed) {
      let selectedItems = [...this.selectedItems];
      selectedItems.remove(item);
      this.selectedItemsChange.emit(selectedItems);
    }
    else {
      this.selectedItems.remove(item);
    }
  }

  #moveCellIfExists(el: HTMLTableCellElement, offsetR: number, offsetC: number, isEditMode: boolean): boolean {
    const targetAddr = {
      r: NumberUtil.parseInt(el.getAttribute("r"))! + offsetR,
      c: NumberUtil.parseInt(el.getAttribute("c"))! + offsetC
    };
    const targetEl = this.#elRef.nativeElement.findFirst<HTMLTableCellElement>(`._sheet-container > table > tbody > tr > td[r='${targetAddr.r}'][c='${targetAddr.c}']`);
    if (targetEl) {
      targetEl.focus();
      if (isEditMode) {
        this.#editModeCellAddr = {r: targetAddr.r, c: targetAddr.c};
        requestAnimationFrame(() => {
          const focusableEl = targetEl.findFocusableFirst();
          if (focusableEl) focusableEl.focus();
        });
      }
      else {
        this.#editModeCellAddr = undefined;
      }
      return true;
    }
    return false;
  }

  /**
   * 시트 설정중 컬럼설정 저장
   * @private
   */
  async #saveColumnConfigAsync(columnKey: string, config: Partial<IConfigColumn>): Promise<void> {
    this.#config = this.#config ?? {columnRecord: {}};
    this.#config.columnRecord = this.#config.columnRecord ?? {};
    this.#config.columnRecord[columnKey] = this.#config.columnRecord[columnKey] ?? {};
    Object.assign(this.#config.columnRecord[columnKey]!, config);
    await this.#sdSystemConfig.setAsync(`sd-sheet.${this.key}`, this.#config);
  }
}

export interface ISdSheetConfig {
  columnRecord: Record<string, IConfigColumn | undefined> | undefined;
}

interface IConfigColumn {
  fixed?: boolean;
  width?: string;
  displayOrder?: number;
  hidden?: boolean;
}

interface IColumnDef<T> {
  control: SdSheetColumnDirective<T>;
  fixed: boolean | undefined;
  width: string | undefined;
  headerStyle: string | undefined;
}

interface IHeaderDef<T> {
  control: SdSheetColumnDirective<T>;
  width: string | undefined;
  fixed: boolean;
  colspan: number | undefined;
  rowspan: number | undefined;
  text: string | undefined;
  useTemplate: boolean;
  isLastDepth: boolean;

  style: string | undefined;
}

interface IItemDef<T> {
  item: T;
  parentDef: IItemDef<T> | undefined;
  hasChildren: boolean;
  depth: number;
}

export interface ISdSheetColumnOrderingVM {
  key: string;
  desc: boolean;
}

export interface ISdSheetItemKeydownEventParam<T> {
  item: T;
  key?: string;
  event: KeyboardEvent;
}
