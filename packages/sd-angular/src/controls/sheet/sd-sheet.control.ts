import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  HostListener,
  inject,
  input,
  model,
  output,
  ViewEncapsulation,
} from "@angular/core";
import { SdEventsDirective } from "../../directives/sd-events.directive";
import { SdSheetConfigModal } from "../../modals/sd-sheet-config.modal";
import { ISdResizeEvent } from "../../plugins/events/sd-resize.event-plugin";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { SdModalProvider } from "../../providers/sd-modal.provider";
import { $computed } from "../../utils/bindings/$computed";
import { SdExpandingManager } from "../../utils/managers/sd-expanding-manager";
import { SdSelectionManager } from "../../utils/managers/sd-selection-manager";
import { ISdSortingDef, SdSortingManager } from "../../utils/managers/sd-sorting-manager";
import { useSdSystemConfigResource } from "../../utils/signals/use-sd-system-config.resource";
import { transformBoolean } from "../../utils/type-tramsforms";
import { SdAnchorControl } from "../sd-anchor.control";
import { SdBusyContainerControl } from "../sd-busy-container.control";
import { SdCheckboxControl } from "../sd-checkbox.control";
import { SdPaginationControl } from "../sd-pagination.control";
import { SdSheetColumnDirective } from "./directives/sd-sheet-column.directive";
import { SdSheetCellAgent } from "./features/sd-sheet-cell-agent";
import { SdSheetColumnFixingManager } from "./features/sd-sheet-column-fixing-manager";
import { SdSheetDomAccessor } from "./features/sd-sheet-dom-accessor";
import { SdSheetFocusIndicatorRenderer } from "./features/sd-sheet-focus-indicator-renderer";
import { SdSheetLayoutEngine } from "./features/sd-sheet-layout-engine";
import { SdSheetSelectRowIndicatorRenderer } from "./features/sd-sheet-select-row-indicator-renderer";
import {
  ISdSheetConfig,
  ISdSheetConfigColumn,
  ISdSheetHeaderDef,
  ISdSheetItemKeydownEventParam,
} from "./sd-sheet.types";
import { FaIconComponent, FaLayersComponent } from "@fortawesome/angular-fontawesome";
import { SdFlexControl } from "../flex/sd-flex.control";
import { SdFlexItemControl } from "../flex/sd-flex-item.control";

@Component({
  selector: "sd-sheet",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainerControl,
    SdAnchorControl,
    SdPaginationControl,
    NgTemplateOutlet,
    SdCheckboxControl,
    SdEventsDirective,
    FaIconComponent,
    FaLayersComponent,
    SdFlexControl,
    SdFlexItemControl,
  ],
  template: `
    <sd-busy-container [busy]="busy()" type="cube">
      <sd-flex vertical [hidden]="busy()">
        @if ((key() || effectivePageCount() > 0) && !hideConfigBar()) {
          <sd-flex-item class="_tool">
            <sd-flex gap="sm">
              @if (key()) {
                <sd-flex-item>
                  <sd-anchor (click)="onConfigButtonClick()">
                    <fa-icon [icon]="icons.cog" [fixedWidth]="true" />
                  </sd-anchor>
                </sd-flex-item>
              }
              @if (effectivePageCount() > 1) {
                <sd-flex-item>
                  <sd-pagination
                    [(currentPage)]="currentPage"
                    [totalPageCount]="effectivePageCount()"
                    [visiblePageCount]="visiblePageCount()"
                  />
                </sd-flex-item>
              }
            </sd-flex>
          </sd-flex-item>
        }

        <sd-flex-item fill class="_sheet-container" (scroll)="onContainerScroll()" [style]="contentStyle()">
          <table (sdResize)="onSheetResize($event)">
            <thead>
              @for (headerRow of layoutEngine.headerDefTable(); let r = $index; track r) {
                <tr>
                  <!-- 첫번째 ROW에만 기능컬럼 작성 -->
                  @if (r === 0) {
                    @let _c = expandingManager.hasExpandable() ? -2 : -1;
                    <th
                      class="_fixed _feature-cell _last-depth"
                      [attr.rowspan]="layoutEngine.headerFeatureRowSpan()"
                      [attr.c]="_c"
                      [style.left.px]="columnFixingManager.fixedLeftMap().get(_c)"
                      (sdResize)="onHeaderLastRowCellResize($event, _c)"
                    >
                      @if (selectionManager.hasSelectable() && selectMode() === "multi") {
                        <sd-checkbox
                          [value]="selectionManager.isAllSelected()"
                          (valueChange)="selectionManager.toggleAll()"
                          [inline]="true"
                          theme="white"
                        />
                      }
                    </th>

                    <!-- Expand 가능일때, expand 컬럼 추가 -->
                    @if (expandingManager.hasExpandable()) {
                      <th
                        class="_fixed _feature-cell _last-depth"
                        [attr.rowspan]="layoutEngine.headerFeatureRowSpan()"
                        [attr.c]="-1"
                        [style.left.px]="columnFixingManager.fixedLeftMap().get(-1)"
                        (sdResize)="onHeaderLastRowCellResize($event, -1)"
                      >
                        <fa-icon
                          [icon]="icons.caretRight"
                          [fixedWidth]="true"
                          [class.tx-theme-primary-default]="expandingManager.isAllExpanded()"
                          [rotate]="expandingManager.isAllExpanded() ? 90 : undefined"
                          (click)="expandingManager.toggleAll()"
                        />
                      </th>
                    }
                  }
                  @for (headerCell of headerRow; let c = $index; track c) {
                    @if (headerCell) {
                      @if (!headerCell.isLastRow) {
                        <!-- 마지막 ROW가 아닐때 -->
                        <th
                          [class._fixed]="headerCell.fixed"
                          [attr.colspan]="headerCell.colspan"
                          [attr.rowspan]="headerCell.rowspan"
                          [attr.c]="c"
                          [attr.title]="headerCell.text"
                          [style.left.px]="columnFixingManager.fixedLeftMap().get(c)"
                        >
                          <div class="_padding">
                            <pre>{{ headerCell.text }}</pre>
                          </div>
                        </th>
                      } @else {
                        <!-- 마지막 ROW일때 -->
                        <th
                          [class._fixed]="headerCell.fixed"
                          [attr.colspan]="headerCell.colspan"
                          [attr.rowspan]="headerCell.rowspan"
                          [attr.c]="c"
                          class="_last-depth"
                          [class._sort]="!headerCell.control.disableSorting()"
                          [attr.title]="headerCell.control.tooltip() ?? headerCell.text"
                          [style.width]="headerCell.width"
                          [style.min-width]="headerCell.width"
                          [style.max-width]="headerCell.width"
                          [style.left.px]="columnFixingManager.fixedLeftMap().get(c)"
                          [class.help]="headerCell.control.tooltip()"
                          (sdResize)="onHeaderLastRowCellResize($event, c)"
                          (click)="onHeaderCellClick($event, headerCell)"
                        >
                          <sd-flex>
                            @let _tempRef = headerCell.control.headerTemplateRef();
                            <sd-flex-item fill [class._padding]="!_tempRef" [attr.style]="headerCell.style">
                              @if (_tempRef) {
                                <ng-template [ngTemplateOutlet]="_tempRef" />
                              } @else {
                                <pre>{{ headerCell.text }}</pre>
                              }
                            </sd-flex-item>

                            <!-- 정렬 아이콘 -->
                            @if (!headerCell.control.disableSorting()) {
                              <sd-flex-item class="_sort-icon">
                                <fa-layers>
                                  <fa-icon [icon]="icons.sort" class="tx-trans-lightest" />
                                  @let _def = sortingManager.defMap().get(headerCell.control.key());
                                  @if (_def?.desc === false) {
                                    <fa-icon [icon]="icons.sortDown" />
                                  } @else if (_def?.desc === true) {
                                    <fa-icon [icon]="icons.sortUp" />
                                  }
                                </fa-layers>
                                @let _idxText = _def?.indexText;
                                @if (_idxText) {
                                  <sub>{{ _idxText }}</sub>
                                }
                              </sd-flex-item>
                            }
                          </sd-flex>

                          <!-- 정렬 리사이징 -->
                          @if (!headerCell.control.disableResizing()) {
                            <div
                              class="_resizer"
                              (mousedown)="onResizerMousedown($event, headerCell.control.key())"
                              (dblclick)="onResizerDoubleClick($event, headerCell.control.key())"
                            ></div>
                          }
                        </th>
                      }
                    }
                  }
                </tr>
              }

              <!-- 합계 행 -->
              @if (layoutEngine.hasSummary()) {
                <tr class="_summary-row">
                  @for (colDef of layoutEngine.columnDefs(); let c = $index; track c) {
                    <th [class._fixed]="colDef.fixed" [style.left.px]="columnFixingManager.fixedLeftMap().get(c)">
                      @let _tempRef = colDef.control.summaryTemplateRef();
                      @if (_tempRef) {
                        <ng-template [ngTemplateOutlet]="_tempRef" />
                      }
                    </th>
                  }
                </tr>
              }
            </thead>
            <tbody>
              @for (item of displayItems(); let r = $index; track trackByFn()(item, r)) {
                <tr
                  [attr.r]="r"
                  (keydown)="itemKeydown.emit({ item: item, event: $event })"
                  [hidden]="!expandingManager.getIsVisible(item)"
                >
                  @let _c = getChildrenFn() ? -2 : -1;
                  <td
                    class="_fixed _feature-cell"
                    [attr.r]="r"
                    [attr.c]="_c"
                    [style.left.px]="columnFixingManager.fixedLeftMap().get(_c)"
                  >
                    @if (selectMode() === "multi") {
                      @let _selectable = selectionManager.getSelectable(item);
                      <sd-checkbox
                        [value]="selectedItems().includes(item)"
                        (valueChange)="selectionManager.toggle(item)"
                        [canChangeFn]="selectionManager.getCanChangeFn(item)"
                        [inline]="true"
                        theme="white"
                        [disabled]="_selectable !== true"
                        [attr.title]="_selectable"
                      />
                    } @else if (selectMode() === "single") {
                      @let _selectable = selectionManager.getSelectable(item);
                      <!--<sd-checkbox
                        [value]="selectedItems().includes(item)"
                        (valueChange)="selectionManager.toggle(item)"
                        [canChangeFn]="selectionManager.getCanChangeFn(item)"
                        [inline]="true"
                        theme="white"
                        [disabled]="_selectable !== true"
                        [attr.title]="_selectable"
                      />-->

                      @if (_selectable === true && selectionManager.getCanChangeFn(item)) {
                        <sd-anchor
                          [theme]="selectedItems().includes(item) ? 'primary' : 'grey'"
                          (pointerdown)="selectionManager.toggle(item)"
                          [attr.title]="_selectable"
                        >
                          <fa-icon [icon]="icons.arrowRight" [fixedWidth]="true" />
                        </sd-anchor>
                      }
                    }
                  </td>
                  @if (expandingManager.hasExpandable()) {
                    <td
                      class="_fixed _feature-cell"
                      [attr.r]="r"
                      [attr.c]="-1"
                      [style.left.px]="columnFixingManager.fixedLeftMap().get(-1)"
                    >
                      @let itemExpDef = expandingManager.getDef(item);
                      @if (itemExpDef.depth > 0) {
                        <div class="_depth-indicator" [style.margin-left.em]="itemExpDef.depth - 0.5"></div>
                      }
                      @if (itemExpDef.hasChildren) {
                        <fa-icon
                          [icon]="icons.caretRight"
                          [fixedWidth]="true"
                          [rotate]="expandedItems().includes(item) ? 90 : undefined"
                          [class.tx-theme-primary-default]="expandedItems().includes(item)"
                          (click)="expandingManager.toggle(item)"
                        />
                      }
                    </td>
                  }
                  @for (columnDef of layoutEngine.columnDefs(); let c = $index; track columnDef.control.key()) {
                    <td
                      tabindex="0"
                      [class._fixed]="columnDef.fixed"
                      [attr.r]="r"
                      [attr.c]="c"
                      [style.width]="columnDef.width"
                      [style.min-width]="columnDef.width"
                      [style.max-width]="columnDef.width"
                      [style.left.px]="columnFixingManager.fixedLeftMap().get(c)"
                      [class]="getItemCellClassFn()?.(item, columnDef.control.key())"
                      [style]="getItemCellStyleFn()?.(item, columnDef.control.key())"
                      (click)="onItemCellClick(item)"
                      (dblclick)="onItemCellDoubleClick($event)"
                      (keydown)="
                        cellKeydown.emit({
                          item: item,
                          key: columnDef.control.key(),
                          event: $event,
                        })
                      "
                    >
                      <ng-template
                        [ngTemplateOutlet]="columnDef.control.cellTemplateRef()"
                        [ngTemplateOutletContext]="{
                          $implicit: item,
                          item: item,
                          index: r,
                          depth: expandingManager.getDef(item).depth,
                          edit: cellAgent.getIsCellEditMode({ r, c }),
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
        </sd-flex-item>
      </sd-flex>
    </sd-busy-container>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../scss/mixins";

      $z-index-fixed: 2;
      $z-index-head: 3;
      $z-index-head-fixed: 4;
      $z-index-select-row-indicator: 5;
      $z-index-focus-row-indicator: 6;
      $z-index-resize-indicator: 7;

      $border-color: var(--theme-grey-lighter);
      $border-color-dark: var(--theme-grey-lighter);
      $border-color-darker: var(--theme-grey-light);

      $border-radius: var(--border-radius-default);

      sd-sheet {
        ._padding {
          padding: var(--sheet-pv) var(--sheet-ph);
        }

        > sd-busy-container {
          border-radius: $border-radius;

          > ._screen {
            border-radius: $border-radius;
          }

          > sd-flex {
            border: 1px solid $border-color-dark;
            border-radius: $border-radius;

            > sd-flex-item._tool {
              background: var(--control-color);
              border-top-left-radius: $border-radius;
              border-top-right-radius: $border-radius;
              border-bottom: 1px solid $border-color-dark;

              > sd-flex > sd-flex-item > sd-anchor {
                padding: var(--gap-sm);
              }
            }

            > ._sheet-container {
              position: relative;
              background: var(--sheet-bg);
              border-bottom-left-radius: $border-radius;
              border-bottom-right-radius: $border-radius;
              overflow: auto;
              //@include mixins.elevation(-16);

              > table {
                border-spacing: 0;
                table-layout: fixed;
                margin-right: 2px;
                margin-bottom: 2px;
                border-bottom-right-radius: $border-radius;
                @include mixins.elevation(16);

                > * > tr > *:last-child {
                  border-right: 1px solid $border-color-dark;
                  //border-right: 1px solid transparent;
                  //border-right: none;
                }

                > * > tr:last-child > * {
                  border-bottom: 1px solid $border-color-dark;
                  //border-bottom: 1px solid transparent;
                  //border-bottom: none;
                }

                > *:last-child > tr:last-child > td:last-child {
                  border-bottom-right-radius: $border-radius;
                  overflow: hidden;
                }

                > * > tr > * {
                  border-right: 1px solid $border-color;
                  border-bottom: 1px solid $border-color;
                  white-space: nowrap;
                  overflow: hidden;
                  padding: 0;
                  position: relative;

                  &._fixed:has(+ :not(._fixed)) + :not(._fixed) {
                    border-left: 1px solid $border-color;
                  }

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

                    &._sort {
                      cursor: pointer;

                      &:hover {
                        text-decoration: underline;
                      }
                    }

                    > sd-flex:first-child {
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
                  background: var(--control-color);
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
                  border-radius: $border-radius;
                }
              }

              > ._resize-indicator {
                display: none;
                position: absolute;
                pointer-events: none;
                top: 0;
                height: 100%;
                border: 1px dotted $border-color-darker;

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

        &[sd-focus-mode="row"] {
          > sd-busy-container > sd-flex > ._sheet-container {
            > ._focus-row-indicator > ._focus-cell-indicator {
              display: none !important;
            }
          }
        }

        &[sd-inset="true"] {
          > sd-busy-container {
            border-radius: $border-radius;

            > ._screen {
              border-radius: $border-radius;
            }

            > sd-flex {
              border: none;
              border-radius: 0;
            }
          }
        }
      }
    `,
  ],
  host: {
    "[attr.sd-inset]": "inset()",
    "[attr.sd-focus-mode]": "focusMode()",
  },
})
export class SdSheetControl<T> {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  #sdModal = inject(SdModalProvider);

  busy = input(false, { transform: transformBoolean });

  hideConfigBar = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });
  contentStyle = input<string>();
  getItemCellClassFn = input<(item: T, colKey: string) => string | undefined>();
  getItemCellStyleFn = input<(item: T, colKey: string) => string | undefined>();

  itemKeydown = output<ISdSheetItemKeydownEventParam<T>>();
  cellKeydown = output<ISdSheetItemKeydownEventParam<T>>();

  columnControls = contentChildren<SdSheetColumnDirective<T>>(SdSheetColumnDirective);

  items = input<T[]>([]);
  trackByFn = input<(item: T, index: number) => any>((item) => item);

  domAccessor = new SdSheetDomAccessor();

  //region config

  key = input.required<string>();

  config = useSdSystemConfigResource<ISdSheetConfig>({
    key: this.key,
  });

  async onConfigButtonClick(): Promise<void> {
    const result = await this.#sdModal.showAsync(
      {
        type: SdSheetConfigModal,
        title: "시트 설정창",
        inputs: {
          sheetKey: this.key(),
          controls: this.columnControls(),
          config: this.config.value(),
        },
      },
      {
        useCloseByBackdrop: true,
      },
    );
    if (!result) return;

    this.config.set(result);
  }

  #saveColumnConfig(columnKey: string, config: Partial<ISdSheetConfigColumn>) {
    this.config.update((v) => ({
      ...v,
      columnRecord: {
        ...v?.columnRecord,
        [columnKey]: {
          ...v?.columnRecord?.[columnKey],
          ...config,
        },
      },
    }));
  }

  //endregion

  layoutEngine = new SdSheetLayoutEngine({
    columnControls: this.columnControls,
    config: this.config,
  });

  //region Column fixing

  columnFixingManager = new SdSheetColumnFixingManager({
    fixedLength: $computed(() => this.layoutEngine.columnDefs().filter((item) => item.fixed).length),
  });

  onHeaderLastRowCellResize(event: ISdResizeEvent, c: number) {
    this.columnFixingManager.registerWidth(c, (event.target as HTMLElement).offsetWidth);
  }

  //endregion

  //region Resizing

  #isOnResizing = false;

  onResizerMousedown(event: MouseEvent, colKey: string): void {
    this.#isOnResizing = true;

    const thEl = (event.target as HTMLElement).findParent("th")!;
    const indicatorEl = this.domAccessor.getColumnResizeIndicator();

    const startX = event.clientX;
    const startWidthPx = thEl.clientWidth;
    const startLeft = thEl.offsetLeft;

    const doDrag = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      Object.assign(indicatorEl.style, {
        display: "block",
        left: startLeft + startWidthPx + e.clientX - startX + "px",
      });
    };

    const stopDrag = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      document.documentElement.removeEventListener("mousemove", doDrag, false);
      document.documentElement.removeEventListener("mouseup", stopDrag, false);

      indicatorEl.style.display = "none";

      const newWidthPx = Math.max(startWidthPx + e.clientX - startX, 5);

      this.#saveColumnConfig(colKey, { width: newWidthPx + "px" });

      setTimeout(() => {
        this.#isOnResizing = false;
      }, 300);
    };

    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }

  onResizerDoubleClick(event: MouseEvent, colKey: string) {
    this.#saveColumnConfig(colKey, { width: undefined });
  }

  //endregion

  //region Sorting

  sorts = model<ISdSortingDef[]>([]);

  sortingManager = new SdSortingManager({ sorts: this.sorts });

  useAutoSort = input(false, { transform: transformBoolean });

  onHeaderCellClick(event: MouseEvent, headerCell: ISdSheetHeaderDef): void {
    if (headerCell.control.disableSorting()) return;
    if (this.#isOnResizing) return;

    if (event.target instanceof HTMLElement && event.target.classList.contains("_resizer")) return;

    if (event.shiftKey || event.ctrlKey) {
      this.sortingManager.toggle(headerCell.control.key(), true);
    } else {
      this.sortingManager.toggle(headerCell.control.key(), false);
    }
  }

  #sortedItems = $computed(() => {
    if (!this.useAutoSort()) return this.items();
    return this.sortingManager.sort(this.items());
  });

  //endregion

  //region Paging

  visiblePageCount = input(10);
  totalPageCount = input(0);
  itemsPerPage = input<number>();
  currentPage = model<number>(0);

  effectivePageCount = $computed(() => {
    const itemsPerPage = this.itemsPerPage();
    if (itemsPerPage != null && itemsPerPage !== 0 && this.items().length > 0) {
      return Math.ceil(this.items().length / itemsPerPage);
    } else {
      return this.totalPageCount();
    }
  });

  #sortedPagedItems = $computed(() => {
    const itemsPerPage = this.itemsPerPage();
    if (itemsPerPage == null || itemsPerPage === 0) return this.#sortedItems();
    if (this.items().length <= 0) return this.#sortedItems();

    const currentPage = this.currentPage();
    return this.#sortedItems().slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  });

  //endregion

  //region Expanding

  expandedItems = model<T[]>([]);
  getChildrenFn = input<(item: T, index: number) => T[] | undefined>();

  expandingManager = new SdExpandingManager({
    items: this.#sortedPagedItems,
    expandedItems: this.expandedItems,
    getChildrenFn: this.getChildrenFn,
    sort: (items) => {
      return this.useAutoSort() ? this.sortingManager.sort(items) : items;
    },
  });

  displayItems = this.expandingManager.flattedItems;

  //endregion

  //region Selecting

  selectMode = input<"single" | "multi" | "none">();

  selectedItems = model<T[]>([]);

  autoSelect = input<"click" | "focus">();
  getItemSelectableFn = input<(item: T) => boolean | string>();

  selectionManager = new SdSelectionManager({
    displayItems: this.displayItems,
    selectedItems: this.selectedItems,
    selectMode: this.selectMode,
    getItemSelectableFn: this.getItemSelectableFn,
  });

  onItemCellClick(item: T): void {
    if (this.autoSelect() !== "click") return;
    this.selectionManager.select(item);
  }

  onFocusCaptureForSelection(event: FocusEvent): void {
    if (this.autoSelect() !== "focus") return;

    if (!(event.target instanceof HTMLElement)) return;

    const tdEl = event.target.tagName.toLowerCase() === "td" ? event.target : event.target.findParent("td");
    if (!(tdEl instanceof HTMLTableCellElement)) return;

    const addr = this.cellAgent.getCellAddr(tdEl);
    const item = this.displayItems()[addr.r];

    this.selectionManager.select(item);
  }

  //endregion

  //region Cell agent

  cellAgent = new SdSheetCellAgent({
    domAccessor: this.domAccessor,
  });

  async onKeydownCaptureForCellAgent(event: KeyboardEvent) {
    await this.cellAgent.handleKeydownCaptureAsync(event);
  }

  onItemCellDoubleClick(event: MouseEvent): void {
    this.cellAgent.handleCellDoubleClick(event);
  }

  onBlurCaptureForCellAgent(event: FocusEvent): void {
    this.cellAgent.handleBlurCapture(event);
  }

  //endregion

  //region Auto scroll

  onFocusCaptureForAutoScroll(event: FocusEvent): void {
    if (!(event.target instanceof HTMLElement)) return;

    const containerEl = this.domAccessor.getContainer();
    const theadEl = this.domAccessor.getTHead();
    const fixedHeaderLastDepthEls = this.domAccessor.getLastDepthFixedHeaders();

    const tdEl = event.target.tagName.toLowerCase() === "td" ? event.target : event.target.findParent("td");
    if (!(tdEl instanceof HTMLTableCellElement)) return;
    if (tdEl.classList.contains("_fixed")) return;

    const target = {
      top: tdEl.offsetTop,
      left: tdEl.offsetLeft - (tdEl.classList.contains("_fixed") ? containerEl.scrollLeft : 0),
    };
    const offset = {
      top: theadEl.offsetHeight,
      left: fixedHeaderLastDepthEls.sum((item) => item.offsetWidth),
    };

    containerEl.scrollIntoViewIfNeeded(target, offset);
  }

  //endregion

  //region focus/select indicator

  focusMode = input<"row" | "cell">("cell");

  selectRowIndicatorRenderer = new SdSheetSelectRowIndicatorRenderer({
    domAccessor: this.domAccessor,
    selectedItems: this.selectedItems,
    displayItems: this.displayItems,
  });
  focusIndicatorRenderer = new SdSheetFocusIndicatorRenderer({
    domAccessor: this.domAccessor,
  });

  onFocusCaptureForFocusIndicator(): void {
    this.focusIndicatorRenderer.redraw();
  }

  onBlurCaptureForFocusIndicator(): void {
    this.focusIndicatorRenderer.redraw();
  }

  onSheetResize(event: ISdResizeEvent): void {
    if (!event.widthChanged) return;

    this.focusIndicatorRenderer.redraw();
    this.selectRowIndicatorRenderer.redraw();
  }

  onContainerScroll(): void {
    this.focusIndicatorRenderer.redraw();
  }

  //endregion

  @HostListener("keydown.capture", ["$event"])
  async onKeydownCapture(event: KeyboardEvent) {
    await this.onKeydownCaptureForCellAgent(event);
  }

  @HostListener("focus.capture", ["$event"])
  onFocusCapture(event: FocusEvent) {
    this.onFocusCaptureForSelection(event);
    this.onFocusCaptureForAutoScroll(event);
    this.onFocusCaptureForFocusIndicator();
  }

  @HostListener("blur.capture", ["$event"])
  onBlurCapture(event: FocusEvent) {
    this.onBlurCaptureForCellAgent(event);
    this.onBlurCaptureForFocusIndicator();
  }
}
