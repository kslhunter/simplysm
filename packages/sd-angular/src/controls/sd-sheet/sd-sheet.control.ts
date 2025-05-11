import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  HostListener,
  inject,
  input,
  model,
  output,
  signal,
  ViewEncapsulation,
} from "@angular/core";
import { SdSheetColumnDirective } from "../../directives/sd-sheet-column.directive";
import { SdSheetConfigModal } from "../../modals/sd-sheet-config.modal";
import { SdModalProvider } from "../../providers/sd-modal.provider";
import { SdBusyContainerControl } from "../sd-busy-container.control";
import { SdDockContainerControl } from "../sd-dock-container.control";
import { SdDockControl } from "../sd-dock.control";
import { NgTemplateOutlet } from "@angular/common";
import { SdAnchorControl } from "../sd-anchor.control";
import { SdPaginationControl } from "../sd-pagination.control";
import { SdPaneControl } from "../sd-pane.control";
import { SdEventsDirective } from "../../directives/sd-events.directive";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { SdCheckboxControl } from "../sd-checkbox.control";
import { transformBoolean } from "../../utils/type-tramsforms";
import { SdIconControl } from "../sd-icon.control";
import { SdIconLayersControl } from "../sd-icon-layers.control";
import { ISdResizeEvent } from "../../plugins/events/sd-resize.event-plugin";
import { injectElementRef } from "../../utils/dom/element-ref.injector";
import { useSdSystemConfig } from "../../features/use-sd-system-config";
import { ISortingDef, useSortingManager } from "../../features/use-sorting-manager";
import { useSelectionManager } from "../../features/use-selection-manager";
import { ISdSheetHeaderDef, useSdSheetLayoutEngine } from "./use-sd-sheet-layout-engine";
import { useSdSheetFocusIndicatorRenderer } from "./use-sd-sheet-focus-indicator-renderer";
import { useSdSheetSelectRowIndicatorRenderer } from "./use-sd-sheet-select-row-indicator-renderer";
import { useSdSheetCellAgent } from "./use-sd-sheet-cell-agent";
import { useExpandingManager } from "../../features/use-expanding-manager";

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
    SdCheckboxControl,
    SdIconControl,
    SdIconLayersControl,
  ],
  template: `
    <sd-busy-container [busy]="busy()" type="cube">
      <sd-dock-container [hidden]="busy()">
        @if ((key() || effectivePageCount() > 0) && !hideConfigBar()) {
          <sd-dock>
            <div class="flex-row-inline flex-gap-sm">
              @if (key()) {
                <sd-anchor (click)="onConfigButtonClick()">
                  <sd-icon [icon]="icons.cog" fixedWidth />
                </sd-anchor>
              }
              @if (effectivePageCount() > 1) {
                <sd-pagination
                  [(currentPage)]="currentPage"
                  [totalPageCount]="effectivePageCount()"
                  [visiblePageCount]="visiblePageCount()"
                />
              }
            </div>
          </sd-dock>
        }

        <sd-pane
          class="_sheet-container"
          (scroll)="onContainerScroll($event)"
          [style]="contentStyle()"
        >
          <table (sdResize)="onSheetResize($event)">
            <thead>
              @for (headerRow of headerDefTable(); let r = $index; track r) {
                <tr>
                  <!-- 첫번째 ROW에만 기능컬럼 작성 -->
                  @if (r === 0) {
                    @let _c = expandingManager.hasExpandable() ? -2 : -1;
                    <th
                      class="_fixed _feature-cell _last-depth"
                      [attr.rowspan]="layoutEngine.headerFeatureRowSpan()"
                      [attr.c]="_c"
                      [style.left.px]="fixedColumnLefts()[_c]"
                      (sdResize)="onHeaderLastRowCellResize($event, _c)"
                    >
                      @if (selectionManager.hasSelectable() && selectMode() === 'multi') {
                        <sd-checkbox
                          [value]="selectionManager.isAllSelected()"
                          [inline]="true"
                          theme="white"
                          (valueChange)="selectionManager.toggleAll()"
                        />
                      }
                    </th>

                    <!-- Expand 가능일때, expand 컬럼 추가 -->
                    @if (expandingManager.hasExpandable()) {
                      <th
                        class="_fixed _feature-cell _last-depth"
                        [attr.rowspan]="layoutEngine.headerFeatureRowSpan()"
                        [attr.c]="-1"
                        [style.left.px]="fixedColumnLefts()[-1]"
                        (sdResize)="onHeaderLastRowCellResize($event, -1)"
                      >
                        <sd-icon
                          [icon]="icons.caretRight"
                          fixedWidth
                          [class.tx-theme-primary-default]="expandingManager.isAllExpanded()"
                          [rotate]="expandingManager.isAllExpanded() ? 90 : undefined"
                          (click)="expandingManager.toggleAll()"
                        />
                      </th>
                    }
                  }
                  @for (headerCell of headerRow; let c = $index; track c) {
                    @if (headerCell) {
                      <!-- 마지막 ROW가 아닐때 -->
                      @if (!headerCell.isLastRow) {
                        <th
                          [class._fixed]="headerCell.fixed"
                          [attr.colspan]="headerCell.colspan"
                          [attr.rowspan]="headerCell.rowspan"
                          [attr.c]="c"
                        >
                          <div class="flex-row align-items-end">
                            <div class="_contents flex-grow _padding">
                              <pre>{{ headerCell.text }}</pre>
                            </div>
                          </div>
                        </th>
                      }
                      <!-- 마지막 ROW일때 -->
                      @else {
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
                          [style.left.px]="fixedColumnLefts()[c]"
                          [class.help]="headerCell.control.tooltip()"
                          (sdResize)="onHeaderLastRowCellResize($event, c)"
                          (click)="onHeaderCellClick($event, headerCell)"
                        >
                          <div class="flex-row align-items-end">
                            @let _tempRef = headerCell.control.headerTemplateRef();
                            <div
                              class="_contents flex-grow"
                              [class._padding]="!_tempRef"
                              [attr.style]="headerCell.style"
                            >
                              @if (_tempRef) {
                                <ng-template [ngTemplateOutlet]="_tempRef" />
                              } @else {
                                <pre>{{ headerCell.text }}</pre>
                              }
                            </div>

                            <!-- 정렬 아이콘 -->
                            @if (!headerCell.control.disableSorting()) {
                              @let _key = headerCell.control.key();
                              <div class="_sort-icon">
                                <sd-icon-layers>
                                  <sd-icon [icon]="icons.sort" class="tx-trans-lightest" />
                                  @let _desc = sortingManager.getIsDesc(_key);
                                  @if (_desc === false) {
                                    <sd-icon [icon]="icons.sortDown" />
                                  } @else if (_desc === true) {
                                    <sd-icon [icon]="icons.sortUp" />
                                  }
                                </sd-icon-layers>
                                @let _idxText = sortingManager.getIndexText(_key);
                                @if (_idxText) {
                                  <sub>{{ _idxText }}</sub>
                                }
                              </div>
                            }
                          </div>

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
                  @for (colDef of columnDefs(); let c = $index; track c) {
                    <th
                      [class._fixed]="colDef.fixed"
                      [style.left.px]="fixedColumnLefts()[c]"
                    >
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
                  [hidden]="!expandingManager.isVisible(item)"
                >
                  @let _c = getChildrenFn() ? -2 : -1;
                  <td
                    class="_fixed _feature-cell"
                    [attr.r]="r"
                    [attr.c]="_c"
                    [style.left.px]="this.fixedColumnLefts()[_c]"
                  >
                    @if (selectMode() === "multi") {
                      <sd-checkbox
                        [value]="selectedItems().includes(item)"
                        [inline]="true"
                        theme="white"
                        [disabled]="!selectionManager.isSelectable(item)"
                        [attr.title]="selectionManager.getDisabledMessage(item)"
                        (valueChange)="selectionManager.toggle(item)"
                      />
                    } @else if (selectMode() === "single" && !autoSelect()) {
                      <sd-checkbox
                        [radio]="true"
                        [value]="selectedItems().includes(item)"
                        [inline]="true"
                        theme="white"
                        [disabled]="!selectionManager.isSelectable(item)"
                        [attr.title]="selectionManager.getDisabledMessage(item)"
                        (valueChange)="selectionManager.toggle(item)"
                      />
                    } @else if (selectMode()) {
                      <sd-icon
                        [icon]="icons.arrowRight"
                        fixedWidth
                        [class.tx-theme-primary-default]="selectedItems().includes(item)"
                        (click)="selectionManager.toggle(item)"
                      />
                    }
                  </td>
                  @if (expandingManager.hasExpandable()) {
                    <td
                      class="_fixed _feature-cell"
                      [attr.r]="r"
                      [attr.c]="-1"
                      [style.left.px]="this.fixedColumnLefts()[-1]"
                    >
                      @let itemExpDef = expandingManager.def(item);
                      @if (itemExpDef.depth > 0) {
                        <div
                          class="_depth-indicator"
                          [style.margin-left.em]="itemExpDef.depth - 0.5"
                        ></div>
                      }
                      @if (itemExpDef.hasChildren) {
                        <sd-icon
                          [icon]="icons.caretRight"
                          fixedWidth
                          [rotate]="expandedItems().includes(item) ? 90 : undefined"
                          [class.tx-theme-primary-default]="expandedItems().includes(item)"
                          (click)="expandingManager.toggle(item)"
                        />
                      }
                    </td>
                  }
                  @for (columnDef of columnDefs(); let c = $index; track columnDef.control.key()) {
                    <td
                      tabindex="0"
                      [class._fixed]="columnDef.fixed"
                      [attr.r]="r"
                      [attr.c]="c"
                      [style.width]="columnDef.width"
                      [style.min-width]="columnDef.width"
                      [style.max-width]="columnDef.width"
                      [style.left.px]="this.fixedColumnLefts()[c]"
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
                        [ngTemplateOutlet]="columnDef.control.cellTemplateRef() ?? null"
                        [ngTemplateOutletContext]="{
                          $implicit: item,
                          item: item,
                          index: r,
                          depth: expandingManager.def(item).depth,
                          edit: cellAgent.getIsCellEditMode({r, c}),
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
  //region styles
  styles: [
    /* language=SCSS */ `
      @use "../../scss/mixins";

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

          > sd-dock-container > ._content {
            border: 1px solid $border-color-dark;
            border-radius: var(--border-radius-default);

            > sd-dock {
              background: var(--control-color);
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

                    > sd-icon {
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

        &[sd-focus-mode="row"] {
          > sd-busy-container > sd-dock-container > ._content > sd-pane._sheet-container > ._focus-row-indicator > ._focus-cell-indicator {
            display: none !important;
          }
        }

        &[sd-inset="true"] {
          > sd-busy-container {
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
    `,
  ],
  //endregion
  host: {
    "[attr.sd-inset]": "inset()",
    "[attr.sd-focus-mode]": "focusMode()",
  },
})
export class SdSheetControl<T> {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  private _sdModal = inject(SdModalProvider);

  busy = input(false, { transform: transformBoolean });

  hideConfigBar = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });
  contentStyle = input<string>();
  focusMode = input<"row" | "cell">("cell");
  getItemCellClassFn = input<(item: T, colKey: string) => string | undefined>();
  getItemCellStyleFn = input<(item: T, colKey: string) => string | undefined>();

  itemKeydown = output<ISdSheetItemKeydownEventParam<T>>();
  cellKeydown = output<ISdSheetItemKeydownEventParam<T>>();

  columnControls = contentChildren<SdSheetColumnDirective<T>>(SdSheetColumnDirective);

  //region config

  key = input.required<string>();

  config = useSdSystemConfig<ISdSheetConfig>(this.key);

  async onConfigButtonClick(): Promise<void> {
    const result = await this._sdModal.showAsync(
      SdSheetConfigModal,
      "시트 설정창",
      {
        sheetKey: this.key(),
        controls: this.columnControls(),
        config: this.config.value(),
      },
      {
        useCloseByBackdrop: true,
      },
    );
    if (!result) return;

    this.config.set(result);
  }

  private _saveColumnConfig(columnKey: string, config: Partial<IConfigColumn>) {
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

  //region Layout engine

  layoutEngine = useSdSheetLayoutEngine({
    config: this.config,
    columnControls: this.columnControls,
  });

  columnDefs = computed(() => this.layoutEngine.columnDefs());
  headerDefTable = computed(() => this.layoutEngine.headerDefTable());

  //endregion

  //region fixedColumnLefts

  private _columnWidthRecord = signal<Record<number, number>>({});

  onHeaderLastRowCellResize(event: ISdResizeEvent, c: number) {
    const el = event.target as HTMLTableCellElement;
    const offsetWidth = el.offsetWidth;

    if (this._columnWidthRecord()[c] !== offsetWidth) {
      this._columnWidthRecord.update(v => ({
        ...v,
        [c]: offsetWidth,
      }));
    }
  }

  fixedColumnLefts = computed(() => {
    const colDefs = this.columnDefs();
    const colWidthRecord = this._columnWidthRecord();

    const result: number[] = [];
    let nextLeft: number = 0;
    for (const keyC of Object.keys(colWidthRecord).orderBy()) {
      const c = Number.parseInt(keyC);

      const colDef = c >= 0 ? colDefs[c] : undefined;
      if (c < 0 || colDef?.fixed) {
        result[c] = nextLeft;
        nextLeft += colWidthRecord[c];
      }
    }

    return result;
  });

  //endregion

  //region Resizing

  private _isOnResizing = true;

  onResizerMousedown(event: MouseEvent, colKey: string): void {
    this._isOnResizing = true;

    const thEl = (event.target as HTMLElement).findParent("th")!;
    const indicatorEl = this._elRef.nativeElement.findFirst<HTMLDivElement>(
      "._sheet-container > ._resize-indicator",
    )!;

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

      this._saveColumnConfig(colKey, { width: newWidthPx + "px" });

      setTimeout(() => {
        this._isOnResizing = false;
      }, 300);
    };

    document.documentElement.addEventListener("mousemove", doDrag, false);
    document.documentElement.addEventListener("mouseup", stopDrag, false);
  }

  onResizerDoubleClick(event: MouseEvent, colKey: string) {
    this._saveColumnConfig(colKey, { width: undefined });
  }

  //endregion

  //region Sorting

  sorts = model<ISortingDef[]>([]);
  sortingManager = useSortingManager(this.sorts);

  onHeaderCellClick(event: MouseEvent, headerCell: ISdSheetHeaderDef): void {
    if (headerCell.control.disableSorting()) return;
    if (this._isOnResizing) return;

    if (
      event.target instanceof HTMLElement
      && event.target.classList.contains("_resizer")
    ) return;

    if (event.shiftKey || event.ctrlKey) {
      this.sortingManager.toggle(headerCell.control.key(), true);
    }
    else {
      this.sortingManager.toggle(headerCell.control.key(), false);
    }
  }

  //endregion

  //region Paging

  visiblePageCount = input(10);
  totalPageCount = input(0);
  itemsPerPage = input<number>();
  currentPage = model<number>(0);

  effectivePageCount = computed(() => {
    const itemsPerPage = this.itemsPerPage();
    if (itemsPerPage != null && itemsPerPage !== 0 && this.items().length > 0) {
      return Math.ceil(this.items().length / itemsPerPage);
    }
    else {
      return this.totalPageCount();
    }
  });

  //endregion

  //region itemDefs

  items = input<T[]>([]);
  trackByFn = input<(item: T, index: number) => any>((item) => item);
  trackByKey = input<keyof T>();

  useAutoSort = input(false, { transform: transformBoolean });

  private _sortedItems = computed(() => {
    if (!this.useAutoSort()) return this.items();
    return this.sortingManager.sort(this.items());
  });

  private _sortedPagedItems = computed(() => {
    const itemsPerPage = this.itemsPerPage();
    if (itemsPerPage == null || itemsPerPage === 0) return this._sortedItems();
    if (this.items().length <= 0) return this._sortedItems();

    const currentPage = this.currentPage();
    return this._sortedItems()
      .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  });

  /*itemDefs = computed((): IItemDef<T>[] => {
    let rootItems: IItemDef<T>[] = this._sortedPagedItems().map((item) => ({
      item,
      parentDef: undefined,
      hasChildren: false,
      depth: 0,
    }));

    if (!this.getChildrenFn()) return rootItems;

    const queue: IItemDef<T>[] = [...rootItems];
    const result: IItemDef<T>[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const children = this.getChildrenFn()!(current.item, result.length - 1) ?? [];
      if (children.length > 0) {
        current.hasChildren = true;

        let displayChildren = children;

        if (this.useAutoSort()) {
          displayChildren = this.sortingManager.sort(displayChildren);
        }

        const childDefs: IItemDef<T>[] = displayChildren.map((child) => ({
          item: child,
          parentDef: current,
          hasChildren: false,
          depth: current.depth + 1,
        }));

        queue.push(...childDefs);
      }
    }

    return result;
  });*/

  displayItems = computed(() => this.expandingManager.displayItems());

  //endregion

  //region Expanding

  expandedItems = model<T[]>([]);
  getChildrenFn = input<(item: T, index: number) => T[] | undefined>();

  expandingManager = useExpandingManager({
    items: this._sortedPagedItems,
    expandedItems: this.expandedItems,
    getChildrenFn: this.getChildrenFn,
    sort: (items) => {
      return this.useAutoSort() ? this.sortingManager.sort(items) : items;
    },
  });

  //endregion

  //region Selecting

  selectMode = input<"single" | "multi">();
  selectedItems = model<T[]>([]);
  autoSelect = input<"click" | "focus">();
  getIsItemSelectableFn = input<(item: T) => boolean | string>();

  selectionManager = useSelectionManager({
    displayItems: this.displayItems,
    selectedItems: this.selectedItems,
    selectMode: this.selectMode,
    getIsItemSelectableFn: this.getIsItemSelectableFn,
  });

  onItemCellClick(item: T): void {
    if (this.autoSelect() !== "click") return;
    if (!this.selectionManager.isSelectable(item)) return;

    this.selectionManager.select(item);
  }

  //endregion

  //region Cell Focus And Edit

  // private _editModeCellAddr = signal<{ r: number, c: number } | undefined>(undefined);
  cellAgent = useSdSheetCellAgent();

  @HostListener("keydown.capture", ["$event"])
  onKeydownCapture(event: KeyboardEvent) {
    this.cellAgent.handleKeydown(event);
  }

  onItemCellDoubleClick(event: MouseEvent): void {
    this.cellAgent.handleCellDoubleClick(event);
  }

  //endregion

  private _elRef = injectElementRef<HTMLElement>();

  //region Select row indicator

  selectRowIndicatorRenderer = useSdSheetSelectRowIndicatorRenderer({
    selectedItems: this.selectedItems,
    displayItems: this.displayItems,
  });

  //endregion

  //region Focus indicator

  focusIndicatorRenderer = useSdSheetFocusIndicatorRenderer();

  @HostListener("focus.capture", ["$event"])
  onFocusCapture(event: FocusEvent): void {
    this.focusIndicatorRenderer.handleFocus(event);

    //-- scroll to focused cell

    if (!(event.target instanceof HTMLElement)) return;

    const sheetContainerEl = this._elRef.nativeElement.findFirst("._sheet-container")!;
    const theadEl = sheetContainerEl.findFirst<HTMLTableSectionElement>("> table > thead")!;
    const fixedHeaderLastDepthEls = theadEl.findAll<HTMLTableCellElement>(
      "> tr > th._last-depth._fixed");

    const tdEl = event.target.tagName.toLowerCase() === "td"
      ? event.target
      : event.target.findParent("td");
    if (!(tdEl instanceof HTMLTableCellElement)) return;

    const rect = {
      top: tdEl.offsetTop,
      left: tdEl.offsetLeft - (tdEl.classList.contains("_fixed")
        ? sheetContainerEl.scrollLeft
        : 0),
    };
    const noneFixedPosition = {
      top: theadEl.offsetHeight,
      left: fixedHeaderLastDepthEls.sum((item) => item.offsetWidth),
    };
    const scroll = {
      top: sheetContainerEl.scrollTop,
      left: sheetContainerEl.scrollLeft,
    };

    if (!tdEl.classList.contains("_fixed")) {
      if (rect.top - scroll.top < noneFixedPosition.top) {
        sheetContainerEl.scrollTop = rect.top - noneFixedPosition.top;
      }
      if (rect.left - scroll.left < noneFixedPosition.left) {
        sheetContainerEl.scrollLeft = rect.left - noneFixedPosition.left;
      }
    }

    //-- selection

    const addr = this.cellAgent.getCellAddr(tdEl);
    const item = this.displayItems()[addr.r];
    if (this.autoSelect() === "focus" && this.selectionManager.isSelectable(item)) {
      this.selectionManager.select(item);
    }
  }

  @HostListener("blur.capture", ["$event"])
  onBlurCapture(event: FocusEvent): void {
    this.focusIndicatorRenderer.handleBlur(event);
    this.cellAgent.handleBlur(event);
  }

  onSheetResize(event: ISdResizeEvent): void {
    this.focusIndicatorRenderer.handleTableResize();
  }

  onContainerScroll(event: Event): void {
    this.focusIndicatorRenderer.handleContainerScroll();
  }

  //endregion
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

export interface ISdSheetItemKeydownEventParam<T> {
  item: T;
  key?: string;
  event: KeyboardEvent;
}
