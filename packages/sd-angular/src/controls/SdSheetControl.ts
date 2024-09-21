import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  ElementRef,
  HostListener,
  inject,
  input,
  model,
  output,
  ViewEncapsulation,
} from "@angular/core";
import { SdSheetColumnDirective } from "../directives/SdSheetColumnDirective";
import { SdSystemConfigProvider } from "../providers/SdSystemConfigProvider";
import { NumberUtil, ObjectUtil } from "@simplysm/sd-core-common";
import { SdSheetConfigModal } from "../modals/SdSheetConfigModal";
import { SdModalProvider } from "../providers/SdModalProvider";
import { SdBusyContainerControl } from "./SdBusyContainerControl";
import { SdDockContainerControl } from "./SdDockContainerControl";
import { SdDockControl } from "./SdDockControl";
import { NgTemplateOutlet } from "@angular/common";
import { SdAnchorControl } from "./SdAnchorControl";
import { SdPaginationControl } from "./SdPaginationControl";
import { SdPaneControl } from "./SdPaneControl";
import { SdEventsDirective } from "../directives/SdEventsDirective";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { SdCheckboxControl } from "./SdCheckboxControl";
import { $computed, $effect, $signal } from "../utils/$hooks";

@Component({
  selector: "sd-sheet",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainerControl,
    SdDockContainerControl,
    SdDockControl,
    SdAnchorControl,
    SdPaginationControl,
    SdPaneControl,
    SdEventsDirective,
    NgTemplateOutlet,
    FontAwesomeModule,
    SdCheckboxControl,
  ],
  //region styles
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      $z-index-fixed: 2;
      $z-index-head: 3;
      $z-index-head-fixed: 4;
      $z-index-select-row-indicator: 5;
      $z-index-focus-row-indicator: 6;
      $z-index-resize-indicator: 7;

      //$border-color: var(--theme-blue-grey-lightest);
      //$border-color-dark: var(--theme-grey-light);
      $border-color: var(--theme-grey-lighter);
      $border-color-dark: var(--theme-grey-lighter);

      sd-sheet {
        > sd-busy-container {
          border-radius: var(--border-radius-default);

          > ._screen {
            border-radius: var(--border-radius-default);
          }

          > sd-dock-container {
            border: 1px solid $border-color-dark;
            border-radius: var(--border-radius-default);

            > sd-dock {
              background: white;
              border-top-left-radius: var(--border-radius-default);
              border-top-right-radius: var(--border-radius-default);
              border-bottom: 1px solid $border-color-dark;

              > div > sd-anchor {
                padding: var(--gap-sm);
                //  margin: var(--gap-xs);
                //  border-radius: var(--border-radius-default);
                //
                //  &:hover {
                //    background: var(--theme-grey-lightest);
                //  }
              }
            }

            > sd-pane._sheet-container {
              background: var(--sheet-bg);
              border-bottom-left-radius: var(--border-radius-default);
              border-bottom-right-radius: var(--border-radius-default);

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
                    min-width: calc(var(--font-size-default) + 2px + var(--sheet-ph) * 2);
                    padding: var(--sheet-pv) var(--sheet-ph);
                    text-align: left;

                    > fa-icon {
                      cursor: pointer;
                      color: var(--text-trans-lightest);
                    }
                  }

                  &._fixed {
                    position: sticky;
                    left: 0;

                    &:has(+ :not(._fixed)) {
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
                    vertical-align: middle;

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
                    margin-top: 0.4em;
                    width: 0.5em;
                    height: 0.5em;
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
                background: rgba(158, 158, 158, 0.1);

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
                  opacity: 0.1;
                }
              }
            }
          }
        }

        &[sd-focus-mode="cell"] {
          > sd-busy-container > sd-dock-container > sd-pane._sheet-container {
            > ._focus-row-indicator,
            > ._focus-cell-indicator {
              display: none !important;
            }
          }
        }

        &[sd-inset="true"] {
          > sd-busy-container {
            border-radius: var(--border-radius-default);

            > ._screen {
              border-radius: var(--border-radius-default);
            }

            > sd-dock-container {
              border: none;
              border-radius: 0;
            }
          }
        }
      }
    `,
  ],
  //endregion
  template: `
    <sd-busy-container [busy]="busy()" type="cube">
      <sd-dock-container [hidden]="busy()">
        @if ((key() || currPageLength() > 0) && !hideConfigBar()) {
          <sd-dock>
            <div class="flex-row-inline flex-gap-sm">
              @if (key()) {
                <sd-anchor (click)="onConfigButtonClick()">
                  <fa-icon [icon]="icons.cog" [fixedWidth]="true" />
                </sd-anchor>
              }
              @if (currPageLength() > 1) {
                <sd-pagination
                  [(page)]="page"
                  [pageLength]="currPageLength()"
                  [displayPageLength]="displayPageLength()"
                />
              }
            </div>
          </sd-dock>
        }

        <sd-pane class="_sheet-container" (scroll)="onContainerScroll($event)">
          <table>
            <thead>
              @for (headerRow of displayHeaderDefTable(); let r = $index; track headerRow) {
                <tr>
                  @if (r === 0) {
                    <th
                      class="_fixed _feature-cell _last-depth"
                      [attr.rowspan]="
                        !hasSummaryTemplate() && headerRow.length < 1
                          ? undefined
                          : displayHeaderDefTable().length + (hasSummaryTemplate() ? 1 : 0)
                      "
                      [attr.c]="getChildrenFn() ? -2 : -1"
                      (sdResize)="onFixedCellResize(getChildrenFn() ? -2 : -1)"
                    >
                      @if (selectMode() === "multi" && hasSelectableItem()) {
                        <sd-checkbox
                          [value]="isAllItemsSelected()"
                          [inline]="true"
                          theme="white"
                          (valueChange)="onAllItemsSelectIconClick()"
                        />
                        <!--<fa-icon [icon]="icons.arrowRight" [fixedWidth]="true"
                                 [class.tx-theme-primary-default]="isAllItemsSelected"
                                 (click)="onAllItemsSelectIconClick()"/>-->
                      }
                    </th>
                  }
                  @if (getChildrenFn() && r === 0) {
                    <th
                      class="_fixed _feature-cell _last-depth"
                      [attr.rowspan]="
                        !hasSummaryTemplate() && headerRow.length < 1
                          ? undefined
                          : displayHeaderDefTable().length + (hasSummaryTemplate() ? 1 : 0)
                      "
                      [attr.c]="-1"
                      (sdResize)="onFixedCellResize(-1)"
                    >
                      @if (hasExpandableItem()) {
                        <fa-icon
                          [icon]="icons.caretRight"
                          [fixedWidth]="true"
                          [class.tx-theme-primary-default]="isAllItemsExpanded()"
                          [rotate]="isAllItemsExpanded() ? 90 : undefined"
                          (click)="onAllItemsExpandIconClick()"
                        />
                      }
                    </th>
                  }
                  @for (headerCell of headerRow; let c = $index; track headerCell) {
                    @if (headerCell) {
                      <th
                        [class._fixed]="headerCell.fixed"
                        [attr.colspan]="headerCell.colspan"
                        [attr.rowspan]="headerCell.rowspan"
                        [class._last-depth]="headerCell.isLastDepth"
                        [attr.c]="c"
                        [style.width]="headerCell.isLastDepth ? headerCell.width : undefined"
                        [style.min-width]="headerCell.isLastDepth ? headerCell.width : undefined"
                        [style.max-width]="headerCell.isLastDepth ? headerCell.width : undefined"
                        [class._ordering]="
                          headerCell.isLastDepth && headerCell.control.useOrdering() && headerCell.control.key()
                        "
                        [attr.title]="
                          headerCell.isLastDepth ? (headerCell.control.tooltip() ?? headerCell.text) : undefined
                        "
                        [class.help]="headerCell.isLastDepth && headerCell.control.tooltip()"
                        (sdResize)="onHeaderCellResize(headerCell, c)"
                        (click)="onHeaderCellClick($event, headerCell)"
                      >
                        <div class="flex-row align-items-end">
                          <div
                            class="_contents flex-grow"
                            [class._padding]="!headerCell.useTemplate"
                            [attr.style]="headerCell!.style"
                          >
                            @if (!headerCell.useTemplate) {
                              <pre>{{ headerCell.text }}</pre>
                            } @else {
                              <ng-template [ngTemplateOutlet]="headerCell.control.headerTemplateRef()!" />
                            }
                          </div>

                          @if (headerCell.isLastDepth && headerCell.control.useOrdering() && headerCell.control.key()) {
                            <div class="_sort-icon">
                              <fa-layers>
                                <fa-icon [icon]="icons.sort" class="tx-trans-lightest" />
                                @if (getIsColumnOrderingDesc(headerCell.control.key()) === false) {
                                  <fa-icon [icon]="icons.sortDown" />
                                } @else if (getIsColumnOrderingDesc(headerCell.control.key()) === true) {
                                  <fa-icon [icon]="icons.sortUp" />
                                }
                              </fa-layers>
                              @if (getColumnOrderingIndexText(headerCell.control.key()); as text) {
                                <sub>{{ text }}</sub>
                              }
                            </div>
                          }
                        </div>

                        @if (headerCell.control.resizable() && headerCell.isLastDepth) {
                          <div
                            class="_resizer"
                            (mousedown)="onResizerMousedown($event, headerCell.control)"
                            (dblclick)="onResizerDoubleClick($event, headerCell.control)"
                          ></div>
                        }
                      </th>
                    }
                  }
                </tr>
              }

              @if (hasSummaryTemplate()) {
                <tr class="_summary-row">
                  @for (columnDef of displayColumnDefs(); let c = $index; track columnDef.control.key()) {
                    <th
                      [class._fixed]="columnDef.fixed"
                      [attr.c]="c"
                      [style.width]="columnDef.width"
                      [style.min-width]="columnDef.width"
                      [style.max-width]="columnDef.width"
                    >
                      @if (columnDef.control.summaryTemplateRef()) {
                        <ng-template [ngTemplateOutlet]="columnDef.control.summaryTemplateRef()!" />
                      }
                    </th>
                  }
                </tr>
              }
            </thead>
            <tbody>
              @for (itemDef of displayItemDefs(); let r = $index; track trackByFn()(itemDef.item, r)) {
                <tr
                  [attr.r]="r"
                  (keydown)="itemKeydown.emit({ item: itemDef.item, event: $event })"
                  [hidden]="getIsHiddenItemDef(itemDef)"
                >
                  <td class="_fixed _feature-cell" [attr.r]="r" [attr.c]="getChildrenFn() ? -2 : -1">
                    @if (selectMode() === "multi") {
                      <sd-checkbox
                        [value]="selectedItems().includes(itemDef.item)"
                        [inline]="true"
                        theme="white"
                        [disabled]="!getIsItemSelectable(itemDef.item)"
                        [attr.title]="getItemSelectDisabledMessage(itemDef.item)"
                        (valueChange)="onItemSelectIconClick(itemDef.item)"
                      />
                    } @else if (selectMode() === "single" && !autoSelect()) {
                      <sd-checkbox
                        [radio]="true"
                        [value]="selectedItems().includes(itemDef.item)"
                        [inline]="true"
                        theme="white"
                        [disabled]="!getIsItemSelectable(itemDef.item)"
                        [attr.title]="getItemSelectDisabledMessage(itemDef.item)"
                        (valueChange)="onItemSelectIconClick(itemDef.item)"
                      />
                    } @else if (selectMode()) {
                      <fa-icon
                        [icon]="icons.arrowRight"
                        [fixedWidth]="true"
                        [class.tx-theme-primary-default]="selectedItems().includes(itemDef.item)"
                        (click)="onItemSelectIconClick(itemDef.item)"
                      />
                    }
                  </td>
                  @if (getChildrenFn()) {
                    <td class="_fixed _feature-cell" [attr.r]="r" [attr.c]="-1">
                      @if (itemDef.depth > 0) {
                        <div class="_depth-indicator" [style.margin-left.em]="itemDef.depth - 0.5"></div>
                      }
                      @if (itemDef.hasChildren) {
                        <fa-icon
                          [icon]="icons.caretRight"
                          [fixedWidth]="true"
                          [rotate]="expandedItems().includes(itemDef.item) ? 90 : undefined"
                          [class.tx-theme-primary-default]="expandedItems().includes(itemDef.item)"
                          (click)="onItemExpandIconClick(itemDef.item)"
                        />
                      }
                    </td>
                  }
                  @for (columnDef of displayColumnDefs(); let c = $index; track columnDef.control.key()) {
                    <td
                      tabindex="0"
                      [class._fixed]="columnDef.fixed"
                      [attr.r]="r"
                      [attr.c]="c"
                      [style.width]="columnDef.width"
                      [style.min-width]="columnDef.width"
                      [style.max-width]="columnDef.width"
                      [class]="getItemCellClassFn()?.(itemDef.item, columnDef.control.key())"
                      [style]="getItemCellStyleFn()?.(itemDef.item, columnDef.control.key())"
                      (click)="onItemCellClick(itemDef.item, $event)"
                      (dblclick)="onItemCellDoubleClick(itemDef.item, $event)"
                      (keydown)="
                        cellKeydown.emit({
                          item: itemDef.item,
                          key: columnDef.control.key(),
                          event: $event,
                        })
                      "
                    >
                      <ng-template
                        [ngTemplateOutlet]="columnDef.control.cellTemplateRef() ?? null"
                        [ngTemplateOutletContext]="{
                          $implicit: itemDef.item,
                          item: itemDef.item,
                          index: r,
                          depth: itemDef.depth,
                          edit: getIsCellEditMode(r, c),
                        }"
                      />
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>

          <div class="_focus-row-indicator">
            <div class="_focus-cell-indicator"></div>
          </div>
          <div class="_resize-indicator"></div>
          <div class="_select-row-indicator-container"></div>
        </sd-pane>
      </sd-dock-container>
    </sd-busy-container>
  `,
  host: {
    "[attr.sd-inset]": "inset()",
    "[attr.sd-focus-mode]": "focusMode()",
  },
})
export class SdSheetControl<T> {
  icons = inject(SdAngularConfigProvider).icons;

  #sdSystemConfig = inject(SdSystemConfigProvider);
  #sdModal = inject(SdModalProvider);
  #elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  columnControls = contentChildren<SdSheetColumnDirective<T>>(SdSheetColumnDirective);

  /** 시트설정 저장 키 */
  key = input.required<string>();
  /** 설정 및 페이징 바 표시여부 */
  hideConfigBar = input(false);
  /** BORDER를 없애는등 다른 박스안에 완전히 붙임 */
  inset = input(false);

  /** 정렬규칙 */
  ordering = model<ISdSheetColumnOrderingVM[]>([]);

  displayPageLength = input(10);
  /** [pagination] 총 페이지 길이 */
  pageLength = input(0);
  /** [pagination] 한 페이지에 표시할 항목수 (설정된 경우, 'pageLength'가 무시되고, 자동계산 됨) */
  pageItemCount = input<number>();
  /** [pagination] 현재 표시 페이지 */
  page = model(0);

  /** 항목들 */
  items = input<T[]>([]);

  /**
   * 데이터 키를 가져오기 위한 함수 (ROW별로 반드시 하나의 값을 반환해야함)
   * @param index 'items'내의 index
   * @param item items[index] 데이터
   */
  trackByFn = input<(item: T, index: number) => any>((item) => item);
  trackByKey = input<keyof T>();

  /** 선택모드 (single = 단일선택, multi = 다중선택) */
  selectMode = input<"single" | "multi">();
  /** 선택된 항목들 */
  selectedItems = model<T[]>([]);

  /** 자동선택모드 (undefined = 사용안함, click = 셀 클릭시 해당 ROW 선택, focus = 셀 포커싱시 해당 ROW 선택) */
  autoSelect = input<"click" | "focus">();

  /**
   *  항목별로 선택가능여부를 설정하는 함수
   *  문자열 입력시 select가 불가하도록 처리되며, hover시 해당 텍스트 표시됨
   */
  getIsItemSelectableFn = input<(item: T) => boolean | string>();

  /** 확장된 항목 목록 */
  expandedItems = model<T[]>([]);

  focusMode = input<"row" | "cell">("cell");
  busy = input(false);

  /** Children 설정하는 함수 */
  getChildrenFn = input<(item: T, index: number) => T[] | undefined>();

  getItemCellClassFn = input<(item: T, colKey: string) => string | undefined>();
  getItemCellStyleFn = input<(item: T, colKey: string) => string | undefined>();

  /** 항목 키 다운 이벤트 */
  itemKeydown = output<ISdSheetItemKeydownEventParam<T>>();
  /** 셀 키 다운 이벤트 */
  cellKeydown = output<ISdSheetItemKeydownEventParam<T>>();

  #config = $signal<ISdSheetConfig>();
  #editModeCellAddr = $signal<{ r: number; c: number }>();
  #resizedWidths = $signal<Record<string, string | undefined>>({});

  #isOnResizing = false;

  displayColumnDefs = $computed((): IColumnDef<T>[] => {
    return this.columnControls()
      .map((columnControl) => {
        const colConf = this.#config()?.columnRecord?.[columnControl.key()];
        return {
          control: columnControl,
          key: columnControl.key(),
          fixed: colConf?.fixed ?? columnControl.fixed(),
          width: this.#resizedWidths()[columnControl.key()] ?? colConf?.width ?? columnControl.width(),
          displayOrder: colConf?.displayOrder,
          hidden: colConf?.hidden ?? columnControl.hidden(),
          headerStyle: columnControl.headerStyle(),
        };
      })
      .filter((item) => !item.hidden && !item.control.collapse())
      .orderBy((item) => item.displayOrder)
      .orderBy((item) => (item.fixed ? -1 : 0))
      .map((item) => ({
        control: item.control,
        fixed: item.fixed,
        width: item.width,
        headerStyle: item.headerStyle,
      }));
  });

  displayHeaderDefTable = $computed((): (IHeaderDef<T> | undefined)[][] => {
    //-- displayHeaderDefTable
    const tempHeaderDefTable: (
      | {
          control: SdSheetColumnDirective<T>;
          width: string | undefined;
          fixed: boolean;
          text: string | undefined;
          useTemplate: string | undefined;
          style: string | undefined;
        }
      | undefined
    )[][] = [];
    const displayColumnDefs = this.displayColumnDefs();

    for (let c = 0; c < displayColumnDefs.length; c++) {
      const columnDef = displayColumnDefs[c];

      const headers =
        columnDef.control.header() === undefined
          ? []
          : typeof columnDef.control.header() === "string"
            ? [columnDef.control.header() as string]
            : (columnDef.control.header() as string[]);

      for (let r = 0; r < headers.length; r++) {
        tempHeaderDefTable[r] = tempHeaderDefTable[r] ?? [];
        tempHeaderDefTable[r][c] = {
          control: columnDef.control,
          width: columnDef.width,
          fixed: columnDef.fixed ?? false,
          text: headers[r],
          useTemplate: undefined,
          style: columnDef.headerStyle,
        };
      }
      if (columnDef.control.headerTemplateRef()) {
        tempHeaderDefTable[headers.length] = tempHeaderDefTable[headers.length] ?? [];
        tempHeaderDefTable[headers.length][c] = {
          control: columnDef.control,
          width: columnDef.width,
          fixed: columnDef.fixed ?? false,
          text: undefined,
          useTemplate: columnDef.control.key(),
          style: columnDef.headerStyle,
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
            if (
              !ObjectUtil.equal(tempHeaderDefTable[rr][c], tempHeaderDefTable[rr][c - 1], {
                includes: ["text", "fixed", "useTemplate", "isLastDepth"],
              })
            ) {
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

          style: tempHeaderDefTable[r][c]!.style,
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
        } else {
          // colspan

          let colspan = 1;
          for (let cc = c + 1; cc < colLength; cc++) {
            let isDiff = false;
            for (let rr = 0; rr <= r; rr++) {
              if (
                !ObjectUtil.equal(tempHeaderDefTable[rr][c], tempHeaderDefTable[rr][cc], {
                  includes: ["text", "fixed", "useTemplate", "isLastDepth"],
                })
              ) {
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

    return headerDefTable;
  });

  currPageLength = $computed(() => {
    if (this.pageItemCount() != null && this.pageItemCount() !== 0 && this.items().length > 0) {
      return Math.ceil(this.items().length / this.pageItemCount()!);
    } else {
      return this.pageLength();
    }
  });

  orderedItems = $computed(() => {
    let orderedItems = [...this.items()];
    if (this.pageItemCount() != null && this.pageItemCount() !== 0) {
      for (const orderingItem of this.ordering().reverse()) {
        if (orderingItem.desc) {
          orderedItems = orderedItems.orderByDesc((item) => item[orderingItem.key]);
        } else {
          orderedItems = orderedItems.orderBy((item) => item[orderingItem.key]);
        }
      }
    }
    return orderedItems;
  });

  orderedPagedItems = $computed(() => {
    let orderedPagedItems = [...this.orderedItems()];
    if (this.pageItemCount() != null && this.pageItemCount() !== 0 && this.items().length > 0) {
      orderedPagedItems = orderedPagedItems.slice(
        this.page() * this.pageItemCount()!,
        (this.page() + 1) * this.pageItemCount()!,
      );
    }
    return orderedPagedItems;
  });

  displayItemDefs = $computed((): IItemDef<T>[] => {
    let displayItemDefs: IItemDef<T>[] = this.orderedPagedItems().map((item) => ({
      item,
      parentDef: undefined,
      hasChildren: false,
      depth: 0,
    }));

    if (this.getChildrenFn()) {
      let fn = (arr: IItemDef<T>[]): IItemDef<T>[] => {
        let fnResult: IItemDef<T>[] = [];
        for (let i = 0; i < arr.length; i++) {
          fnResult.push(arr[i]);

          const children = this.getChildrenFn()!(arr[i].item, i) ?? [];
          if (children.length > 0) {
            arr[i].hasChildren = true;

            let displayChildren = children;
            if (this.pageItemCount() != null && this.pageItemCount() !== 0) {
              for (const orderingItem of this.ordering().reverse()) {
                if (orderingItem.desc) {
                  displayChildren = displayChildren.orderByDesc((item) => item[orderingItem.key]);
                } else {
                  displayChildren = displayChildren.orderBy((item) => item[orderingItem.key]);
                }
              }
            }

            fnResult.push(
              ...fn(
                children.map((item) => ({
                  item,
                  parentDef: arr[i],
                  hasChildren: false,
                  depth: arr[i].depth + 1,
                })),
              ),
            );
          }
        }

        return fnResult;
      };

      displayItemDefs = fn(displayItemDefs);
    }

    return displayItemDefs;
  });

  selectableItems = $computed(() => {
    if (this.selectMode()) {
      return this.displayItemDefs()
        .filter((item) => this.getIsItemSelectable(item.item))
        .map((item) => item.item);
    } else {
      return [];
    }
  });

  hasSelectableItem = $computed(() => this.selectableItems().length > 0);

  isAllItemsSelected = $computed(
    () =>
      this.selectableItems().length <= this.selectedItems().length &&
      this.selectableItems().every((item) => this.selectedItems().includes(item)),
  );

  expandableItems = $computed(() => this.displayItemDefs().filter((item) => item.hasChildren));

  hasExpandableItem = $computed(() => this.expandableItems().length > 0);

  isAllItemsExpanded = $computed(
    () =>
      this.expandableItems().length <= this.expandedItems().length &&
      this.expandableItems().every((itemDef) => this.expandedItems().includes(itemDef.item)),
  );

  hasSummaryTemplate = $computed(() => this.columnControls().some((item) => item.summaryTemplateRef() !== undefined));

  constructor() {
    $effect([this.key], async () => {
      this.#config.set(await this.#sdSystemConfig.getAsync(`sd-sheet.${this.key()}`));
    });

    //-- cell sizing
    $effect(() => {
      this.onFixedCellResize(-2);
    });

    //-- select indicator
    $effect(() => {
      const sheetContainerEl = this.#elRef.nativeElement.findFirst<HTMLDivElement>("._sheet-container")!;
      const selectRowIndicatorContainerEl = sheetContainerEl.findFirst<HTMLDivElement>(
        "> ._select-row-indicator-container",
      )!;

      if (this.selectedItems().length > 0) {
        const selectedTrRects = this.selectedItems()
          .map((item) => {
            const r = this.displayItemDefs().findIndex((item1) => item1.item === item);
            const trEl = sheetContainerEl.findFirst<HTMLTableRowElement>(`> table > tbody > tr[r="${r}"]`);
            if (trEl === undefined) return undefined;

            return {
              top: trEl.offsetTop,
              width: trEl.offsetWidth,
              height: trEl.offsetHeight,
            };
          })
          .filterExists();

        let html = "";
        for (const selectedTrRect of selectedTrRects) {
          html += `<div class='_select-row-indicator' style="top: ${selectedTrRect.top}px; height: ${selectedTrRect.height - 1}px; width: ${selectedTrRect.width - 1}px;"></div>`;
        }
        selectRowIndicatorContainerEl.innerHTML = html;
        selectRowIndicatorContainerEl.style.display = "block";
      } else {
        selectRowIndicatorContainerEl.innerHTML = "";
        selectRowIndicatorContainerEl.style.display = "none";
      }
    });
  }

  getIsCellEditMode(r: number, c: number): boolean {
    return this.#editModeCellAddr() != null && this.#editModeCellAddr()!.r === r && this.#editModeCellAddr()!.c === c;
  }

  /**
   * 셀렉팅 가능한 항목인지 확인
   * @param item
   */
  getIsItemSelectable(item: T): boolean {
    if (!this.getIsItemSelectableFn()) return true;
    return this.getIsItemSelectableFn()!(item) === true;
  }

  getItemSelectDisabledMessage(item: T): string | undefined {
    const message = this.getIsItemSelectableFn()?.(item);
    if (typeof message === "boolean") return undefined;
    return message;
  }

  /**
   * 컬럼 컨트롤의 오더링 방향이 DESC인지 여부 가져오기
   * @param columnKey
   */
  getIsColumnOrderingDesc(columnKey: string): boolean | undefined {
    return this.ordering().single((item) => item.key === columnKey)?.desc;
  }

  /**
   * 컬럼 컨트롤의 오더링 순서번호 가져오기
   * @param columnKey
   */
  getColumnOrderingIndexText(columnKey: string): string | undefined {
    if (this.ordering().length < 2) {
      return undefined;
    }
    const index = this.ordering().findIndex((item) => item.key === columnKey);
    return index >= 0 ? (index + 1).toString() : undefined;
  }

  /**
   * 모든 상위항목이 Expand됬는지 여부 가져오기
   * @param itemDef
   */
  getIsHiddenItemDef(itemDef: IItemDef<T>): boolean {
    let currItemDef = itemDef;
    while (currItemDef.parentDef) {
      if (!this.expandedItems().some((item) => item === currItemDef.parentDef!.item)) {
        return true;
      }

      currItemDef = currItemDef.parentDef;
    }
    return false;
  }

  @HostListener("focus.capture", ["$event"])
  onFocusCapture(event: FocusEvent): void {
    requestAnimationFrame(() => {
      if (!(event.target instanceof HTMLElement)) return;

      const sheetContainerEl = this.#elRef.nativeElement.findFirst("._sheet-container")!;
      const focusRowIndicatorEl = sheetContainerEl.findFirst<HTMLDivElement>("> ._focus-row-indicator")!;

      const theadEl = sheetContainerEl.findFirst<HTMLTableSectionElement>("> table > thead")!;
      const fixedHeaderLastDepthEls = theadEl.findAll<HTMLTableCellElement>("> tr > th._last-depth._fixed");

      const focusCellIndicatorEl = focusRowIndicatorEl.firstElementChild as HTMLElement;

      const tdEl = event.target.tagName.toLowerCase() === "td" ? event.target : event.target.findParent("td");
      if (!(tdEl instanceof HTMLTableCellElement)) return;

      const trEl = tdEl.parentElement!;
      const rowRect = {
        top: trEl.offsetTop,
        left: trEl.offsetLeft,
        width: trEl.offsetWidth,
        height: trEl.offsetHeight,
      };
      const cellRect = {
        left: tdEl.offsetLeft - (tdEl.classList.contains("_fixed") ? sheetContainerEl.scrollLeft : 0),
        width: tdEl.offsetWidth,
        height: tdEl.offsetHeight,
      };
      const noneFixedPosition = {
        top: theadEl.offsetHeight,
        left: fixedHeaderLastDepthEls.sum((item) => item.offsetWidth),
      };
      const scroll = {
        top: sheetContainerEl.scrollTop,
        left: sheetContainerEl.scrollLeft,
      };

      Object.assign(focusRowIndicatorEl.style, {
        display: "block",
        top: rowRect.top - 2 + "px",
        left: rowRect.left + "px",
        width: rowRect.width + "px",
        height: rowRect.height + 3 + "px",
      });
      Object.assign(focusCellIndicatorEl.style, {
        display: event.target.tagName.toLowerCase() === "td" ? "block" : "none",
        position: tdEl.classList.contains("_fixed") ? "sticky" : "absolute",
        left: cellRect.left - 2 + "px",
        width: cellRect.width + 3 + "px",
        height: cellRect.height + 3 + "px",
        opacity: "1",
      });

      if (!tdEl.classList.contains("_fixed")) {
        if (rowRect.top - scroll.top < noneFixedPosition.top) {
          sheetContainerEl.scrollTop = rowRect.top - noneFixedPosition.top;
        }
        if (cellRect.left - scroll.left < noneFixedPosition.left) {
          sheetContainerEl.scrollLeft = cellRect.left - noneFixedPosition.left;
        }
      }

      const item = this.displayItemDefs()[NumberUtil.parseInt(tdEl.getAttribute("r"))!].item;
      if (this.autoSelect() === "focus" && this.getIsItemSelectable(item)) {
        this.#selectItem(item);
      }
    });
  }

  @HostListener("blur.capture", ["$event"])
  onBlurCapture(event: FocusEvent): void {
    if (
      event.target instanceof HTMLTableCellElement &&
      !(
        event.relatedTarget instanceof HTMLTableCellElement && event.relatedTarget.findParent(this.#elRef.nativeElement)
      )
    ) {
      const focusRowIndicatorEl = this.#elRef.nativeElement.findFirst<HTMLDivElement>("._focus-row-indicator")!;
      const focusCellIndicatorEl = focusRowIndicatorEl.firstElementChild as HTMLElement;

      focusCellIndicatorEl.style.display = "none";

      if (!(event.relatedTarget instanceof HTMLElement) || !event.relatedTarget.findParent(event.target)) {
        focusRowIndicatorEl.style.display = "none";
      }
    }

    if (
      this.#editModeCellAddr() &&
      !(
        event.target instanceof HTMLElement &&
        event.relatedTarget instanceof HTMLElement &&
        (event.target.findParent("td") ?? event.target) === event.relatedTarget.findParent("td")
      )
    ) {
      this.#editModeCellAddr.set(undefined);
    }
  }

  @HostListener("keydown.capture", ["$event"])
  onKeydownCapture(event: KeyboardEvent) {
    if (event.target instanceof HTMLTableCellElement) {
      if (event.key === "F2") {
        event.preventDefault();
        this.#editModeCellAddr.set({
          r: NumberUtil.parseInt(event.target.getAttribute("r"))!,
          c: NumberUtil.parseInt(event.target.getAttribute("c"))!,
        });
        requestAnimationFrame(() => {
          const focusableEl = (event.target as HTMLElement).findFocusableFirst();
          if (focusableEl) focusableEl.focus();
        });
      } else if (event.key === "ArrowDown") {
        if (this.#moveCellIfExists(event.target, 1, 0, false)) {
          event.preventDefault();
        }
      } else if (event.key === "ArrowUp") {
        if (this.#moveCellIfExists(event.target, -1, 0, false)) {
          event.preventDefault();
        }
      } else if (event.key === "ArrowRight") {
        if (this.#moveCellIfExists(event.target, 0, 1, false)) {
          event.preventDefault();
        }
      } else if (event.key === "ArrowLeft") {
        if (this.#moveCellIfExists(event.target, 0, -1, false)) {
          event.preventDefault();
        }
      } else if (event.ctrlKey && event.key === "c") {
        if (!document.getSelection()) {
          event.preventDefault();
          event.target.findFirst("sd-textfield")?.dispatchEvent(new CustomEvent("sd-sheet-cell-copy"));
        }
      } else if (event.ctrlKey && event.key === "v") {
        event.preventDefault();
        event.target.findFirst("sd-textfield")?.dispatchEvent(new CustomEvent("sd-sheet-cell-paste"));
      }
    } else if (event.target instanceof HTMLElement) {
      const tdEl = event.target.findParent("td") as HTMLTableCellElement | undefined;
      if (!tdEl) return;
      if (event.key === "Escape") {
        event.preventDefault();
        tdEl.focus();

        this.#editModeCellAddr.set(undefined);
      } else if (event.key === "Enter") {
        if (event.target.tagName === "TEXTAREA" || event.target.hasAttribute("contenteditable")) {
          if (event.ctrlKey) {
            event.preventDefault();
            this.#moveCellIfExists(tdEl, 1, 0, true);
          }
        } else {
          event.preventDefault();
          this.#moveCellIfExists(tdEl, 1, 0, true);
        }
      } else if (event.ctrlKey && event.key === "ArrowDown") {
        if (this.#moveCellIfExists(tdEl, 1, 0, true)) {
          event.preventDefault();
        }
      } else if (event.ctrlKey && event.key === "ArrowUp") {
        if (this.#moveCellIfExists(tdEl, -1, 0, true)) {
          event.preventDefault();
        }
      } else if (event.ctrlKey && event.key === "ArrowRight") {
        if (this.#moveCellIfExists(tdEl, 0, 1, true)) {
          event.preventDefault();
        }
      } else if (event.ctrlKey && event.key === "ArrowLeft") {
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
    const fixedHeaderLastDepthEls = theadEl.findAll<HTMLTableCellElement>("> tr > th._last-depth._fixed");

    const focusCellIndicatorEl = focusRowIndicatorEl.firstElementChild as HTMLElement;

    const noneFixedPosition = {
      top: theadEl.offsetHeight,
      left: fixedHeaderLastDepthEls.sum((item) => item.offsetWidth),
    };
    const indicatorPosition = {
      top: focusRowIndicatorEl.offsetTop - sheetContainerEl.scrollTop + 2,
      left: focusCellIndicatorEl.offsetLeft - sheetContainerEl.scrollLeft + 2,
    };

    if (indicatorPosition.top < noneFixedPosition.top || indicatorPosition.left < noneFixedPosition.left) {
      focusCellIndicatorEl.style.opacity = ".3";
    } else {
      focusCellIndicatorEl.style.opacity = "1";
    }
  }

  onHeaderCellResize(headerCell: IHeaderDef<T>, c: number) {
    if (headerCell.fixed && headerCell.isLastDepth) {
      this.onFixedCellResize(c);
    }
  }

  onFixedCellResize(c: number) {
    const sheetContainerEl = this.#elRef.nativeElement.findFirst("._sheet-container")!;

    const fixedColumnLength = this.displayColumnDefs().filter((item) => item.fixed).length;

    const nextFixedColumnIndexes = Array(fixedColumnLength - c - 1)
      .fill(0)
      .map((a, b) => b + c + 1);

    const scrollLeft = sheetContainerEl.scrollLeft;
    for (const nextFixedColumnIndex of nextFixedColumnIndexes) {
      const thEl = sheetContainerEl.findFirst<HTMLTableCellElement>(
        `> table > thead > tr > th._last-depth[c='${nextFixedColumnIndex - 1}']`,
      );
      const nextLeft = thEl ? thEl.offsetLeft + thEl.offsetWidth - scrollLeft : 0;
      const nextEls = sheetContainerEl.findAll<HTMLTableCellElement>(
        `> table > * > tr > *[c='${nextFixedColumnIndex}']`,
      );
      for (const nextEl of nextEls) {
        nextEl.style.left = nextLeft + "px";
      }
    }
  }

  onResizerMousedown(event: MouseEvent, columnControl: SdSheetColumnDirective<T>): void {
    this.#isOnResizing = true;

    const thEl = (event.target as HTMLElement).findParent("th")!;
    const resizeIndicatorEl = this.#elRef.nativeElement.findFirst<HTMLDivElement>(
      "._sheet-container > ._resize-indicator",
    )!;

    const startX = event.clientX;
    const startWidthPx = thEl.clientWidth;
    const startLeft = thEl.offsetLeft;

    const doDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      Object.assign(resizeIndicatorEl.style, {
        display: "block",
        left: startLeft + startWidthPx + e.clientX - startX + "px",
      });
    };

    const stopDrag = async (e: MouseEvent): Promise<void> => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);

      resizeIndicatorEl.style.display = "none";

      const newWidthPx = Math.max(startWidthPx + e.clientX - startX, 5);
      this.#resizedWidths.update((v) => ({
        ...v,
        [columnControl.key()]: newWidthPx + 1 + "px",
      }));

      await this.#saveColumnConfigAsync(columnControl.key(), {
        width: newWidthPx + "px",
      });

      setTimeout(() => {
        this.#isOnResizing = false;
      }, 300);
    };

    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }

  async onResizerDoubleClick(event: MouseEvent, columnControl: SdSheetColumnDirective<T>): Promise<void> {
    this.#resizedWidths.update((v) => {
      const r = { ...v };
      delete r[columnControl.key()];
      return r;
    });

    await this.#saveColumnConfigAsync(columnControl.key(), { width: undefined });
  }

  /**
   * ROW 셀렉터 클릭시 이벤트
   * @param item
   */
  onItemSelectIconClick(item: T): void {
    if (!this.getIsItemSelectable(item)) return;

    if (this.selectedItems().includes(item)) {
      this.#unselectItem(item);
    } else {
      this.#selectItem(item);
    }
  }

  onItemExpandIconClick(item: T): void {
    this.expandedItems.update((v) => {
      const r = [...v];
      if (r.includes(item)) {
        r.remove(item);
      } else {
        r.push(item);
      }
      return r;
    });
  }

  onItemCellClick(item: T, event: MouseEvent): void {
    if (this.autoSelect() !== "click") return;
    if (!this.getIsItemSelectable(item)) return;

    this.#selectItem(item);
  }

  onItemCellDoubleClick(item: T, event: MouseEvent): void {
    if (!(event.target instanceof HTMLElement)) return;
    const tdEl = event.target.tagName === "TD" ? event.target : event.target.findParent("td")!;

    this.#editModeCellAddr.set({
      r: NumberUtil.parseInt(tdEl.getAttribute("r"))!,
      c: NumberUtil.parseInt(tdEl.getAttribute("c"))!,
    });
    requestAnimationFrame(() => {
      const focusableEl = tdEl.findFocusableFirst();
      if (focusableEl) focusableEl.focus();
    });
  }

  onAllItemsSelectIconClick(): void {
    if (this.isAllItemsSelected()) {
      this.selectedItems.set([]);
    } else {
      const selectedItems = this.displayItemDefs()
        .filter((item) => this.getIsItemSelectable(item.item))
        .map((item) => item.item);

      this.selectedItems.set(selectedItems);
    }
  }

  onAllItemsExpandIconClick(): void {
    if (this.isAllItemsExpanded()) {
      this.expandedItems.set([]);
    } else {
      const expandedItems = this.displayItemDefs()
        .filter((item) => item.hasChildren)
        .map((item) => item.item);

      this.expandedItems.set(expandedItems);
    }
  }

  /**
   * 헤더 클릭시 이벤트
   * @param event
   * @param headerCell
   */
  onHeaderCellClick(event: MouseEvent, headerCell: IHeaderDef<T>): void {
    if (headerCell.isLastDepth && headerCell.control.useOrdering()) {
      if (this.#isOnResizing) return;
      if (event.target instanceof HTMLElement && event.target.classList.contains("_resizer")) return;
      if (event.shiftKey || event.ctrlKey) {
        this.#toggleOrdering(headerCell.control.key(), true);
      } else {
        this.#toggleOrdering(headerCell.control.key(), false);
      }
    }
  }

  /**
   * 시트 설정창 보기 버튼 클릭시 이벤트
   */
  async onConfigButtonClick(): Promise<void> {
    const result = await this.#sdModal.showAsync(
      SdSheetConfigModal,
      "시트 설정창",
      {
        sheetKey: this.key(),
        controls: this.columnControls(),
        config: this.#config(),
      },
      {
        useCloseByBackdrop: true,
      },
    );
    if (!result) return;

    this.#config.set(result);
    await this.#sdSystemConfig.setAsync(`sd-sheet.${this.key()}`, result);
  }

  /**
   * 정렬 설정 토글
   * @param key 토글할 정렬설정
   * @param multiple 여러 컬럼에 대한 정렬조건을 사용하는 토글인지 여부
   * @private
   */
  #toggleOrdering(key: string, multiple: boolean): void {
    this.ordering.update((v) => {
      let r = [...v];
      const ordItem = r.single((item) => item.key === key);
      if (ordItem) {
        if (ordItem.desc) {
          r.remove(ordItem);
        } else {
          ordItem.desc = !ordItem.desc;
        }
      } else {
        if (multiple) {
          r.push({ key, desc: false });
        } else {
          r = [{ key, desc: false }];
        }
      }

      return r;
    });
  }

  /**
   * 항목 선택 설정
   * @param item 선택 설정할 항목
   * @private
   */
  #selectItem(item: T): void {
    if (this.selectedItems().includes(item)) return;

    if (this.selectMode() === "single") {
      this.selectedItems.set([item]);
    } else {
      this.selectedItems.update((v) => [...v, item]);
    }
  }

  /**
   * 항목 선택 해제
   * @param item 선택 해제할 항목
   * @private
   */
  #unselectItem(item: T): void {
    if (!this.selectedItems().includes(item)) return;

    this.selectedItems.update((v) => v.filter((item1) => item1 !== item));
  }

  #moveCellIfExists(el: HTMLTableCellElement, offsetR: number, offsetC: number, isEditMode: boolean): boolean {
    const targetAddr = {
      r: NumberUtil.parseInt(el.getAttribute("r"))! + offsetR,
      c: NumberUtil.parseInt(el.getAttribute("c"))! + offsetC,
    };
    const targetEl = this.#elRef.nativeElement.findFirst<HTMLTableCellElement>(
      `._sheet-container > table > tbody > tr > td[r='${targetAddr.r}'][c='${targetAddr.c}']`,
    );
    if (targetEl) {
      targetEl.focus();
      if (isEditMode) {
        this.#editModeCellAddr.set({ r: targetAddr.r, c: targetAddr.c });
        requestAnimationFrame(() => {
          const focusableEl = targetEl.findFocusableFirst();
          if (focusableEl) focusableEl.focus();
        });
      } else {
        this.#editModeCellAddr.set(undefined);
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
    this.#config.update((v) => ({
      ...v,
      columnRecord: {
        ...v?.columnRecord,
        [columnKey]: {
          ...v?.columnRecord?.[columnKey],
          ...config,
        },
      },
    }));
    await this.#sdSystemConfig.setAsync(`sd-sheet.${this.key()}`, this.#config());
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
