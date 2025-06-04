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
  Signal,
  ViewEncapsulation,
} from "@angular/core";
import { ObjectUtils } from "@simplysm/sd-core-common";
import { SdAnchorControl } from "../../controls/sd-anchor.control";
import { SdButtonControl } from "../../controls/sd-button.control";
import { SdDockContainerControl } from "../../controls/sd-dock-container.control";
import { SdDockControl } from "../../controls/sd-dock.control";
import { SdFormBoxItemControl } from "../../controls/sd-form-box-item.control";
import { SdFormBoxControl } from "../../controls/sd-form-box.control";
import { SdFormControl } from "../../controls/sd-form.control";
import { SdIconControl } from "../../controls/icon/sd-icon.control";
import { SdPaneControl } from "../../controls/sd-pane.control";
import { SdSheetColumnCellTemplateDirective } from "../../controls/sd-sheet/directives/sd-sheet-column-cell.template-directive";
import { SdSheetColumnDirective } from "../../controls/sd-sheet/directives/sd-sheet-column.directive";
import { SdSheetControl } from "../../controls/sd-sheet/sd-sheet.control";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { SdFileDialogProvider } from "../../providers/sd-file-dialog.provider";
import { SdToastProvider } from "../../providers/sd-toast.provider";
import { $computed } from "../../utils/bindings/$computed";
import { $signal } from "../../utils/bindings/$signal";
import { ISdSortingDef } from "../../utils/managers/sd-sorting-manager";
import { setupCumulateSelectedKeys } from "../../utils/setups/setup-cumulate-selected-keys";
import { TSdViewType, useViewTypeSignal } from "../../utils/signals/use-view-type.signal";
import { SdBaseContainerControl } from "../sd-base-container.control";
import { ISelectModalOutputResult } from "../sd-select-modal-button.control";
import { SdSharedDataProvider } from "../shared-data/sd-shared-data.provider";
import { SdDataSheetColumnDirective } from "./sd-data-sheet-column.directive";
import { SdDataSheetFilterDirective } from "./sd-data-sheet-filter.directive";
import { SdDataSheetToolDirective } from "./sd-data-sheet-tool.directive";
import { setupCloserWhenSingleSelectionChange } from "../../utils/setups/setup-closer-when-single-selection-change";
import { $effect } from "../../utils/bindings/$effect";
import { transformBoolean } from "../../utils/type-tramsforms";

@Component({
  selector: "sd-data-sheet",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdIconControl,
    SdDockContainerControl,
    SdDockControl,
    SdFormControl,
    SdFormBoxControl,
    SdFormBoxItemControl,
    SdButtonControl,
    SdPaneControl,
    SdSheetControl,
    SdSheetColumnDirective,
    SdSheetColumnCellTemplateDirective,
    SdAnchorControl,
    NgTemplateOutlet,
    SdBaseContainerControl,
  ],
  template: `
    <sd-base-container
      [busy]="busyCount() > 0"
      [viewType]="currViewType()"
      [initialized]="initialized()"
      [visible]="usable()"
    >
      <!--<ng-template #pageTopbar>
        <sd-topbar-menu>
          <sd-topbar-menu-item theme="info" (click)="onRefreshCommand()">
            <sd-icon [icon]="icons.refresh" fixedWidth />
            새로고침
            <small>(CTRL+ALT+L)</small>
          </sd-topbar-menu-item>
        </sd-topbar-menu>
      </ng-template>-->

      <ng-template #content>
        <sd-dock-container class="p-lg">
          <sd-dock class="pb-lg">
            <sd-form (submit)="onFilterSubmit()">
              <sd-form-box layout="inline">
                <sd-form-box-item>
                  <sd-button type="submit" theme="info">
                    <sd-icon [icon]="icons.search" fixedWidth />
                    조회
                  </sd-button>
                </sd-form-box-item>
                @for (filterControl of filterControls(); track filterControl) {
                  <sd-form-box-item
                    [label]="filterControl.label()"
                    [labelTooltip]="filterControl.labelTooltip()"
                  >
                    @if (filterControl.labelTemplateRef()) {
                      <ng-template #label>
                        <ng-template [ngTemplateOutlet]="filterControl.labelTemplateRef()!" />
                      </ng-template>
                    }
                    <ng-template [ngTemplateOutlet]="filterControl.contentTemplateRef()" />
                  </sd-form-box-item>
                }
              </sd-form-box>
            </sd-form>
          </sd-dock>

          <sd-dock class="pb-xs">
            <div class="flex-row flex-gap-sm">
              @for (toolControl of beforeToolControls(); track toolControl) {
                <ng-template [ngTemplateOutlet]="toolControl.contentTemplateRef()" />
              }

              @if (viewModel().editItem) {
                @if (editable()) {
                  <sd-button size="sm" theme="primary" (click)="onCreateItemButtonClick()">
                    <sd-icon [icon]="icons.add" fixedWidth />
                    등록
                    <small>(CTRL+INSERT)</small>
                  </sd-button>
                }
              }

              @if (!selectMode()) {
                @if (viewModel().toggleDeletes) {
                  <sd-button
                    size="sm"
                    theme="link-danger"
                    (click)="onToggleDeletesButtonClick(true)"
                    [disabled]="!isSelectedItemsHasNotDeleted()"
                  >
                    <sd-icon [icon]="icons.eraser" [fixedWidth]="true" />
                    선택 삭제
                  </sd-button>
                  @if (isSelectedItemsHasDeleted()) {
                    <sd-button
                      size="sm"
                      theme="link-warning"
                      (click)="onToggleDeletesButtonClick(false)"
                    >
                      <sd-icon [icon]="icons.redo" [fixedWidth]="true" />
                      선택 복구
                    </sd-button>
                  }
                }

                @if (viewModel().uploadExcel) {
                  <sd-button size="sm" theme="link-success" (click)="onUploadExcelButtonClick()">
                    <sd-icon [icon]="icons.upload" fixedWidth />
                    엑셀 업로드
                  </sd-button>
                }
              }

              @if (viewModel().downloadExcel) {
                <sd-button size="sm" theme="link-success" (click)="onDownloadExcelButtonClick()">
                  <sd-icon [icon]="icons.fileExcel" fixedWidth />
                  엑셀 다운로드
                </sd-button>
              }

              @for (toolControl of afterToolControls(); track toolControl) {
                <ng-template [ngTemplateOutlet]="toolControl.contentTemplateRef()" />
              }
            </div>
          </sd-dock>

          <sd-pane>
            <sd-sheet
              [key]="viewModel().key + '-sheet'"
              [items]="items()"
              [(currentPage)]="page"
              [totalPageCount]="pageLength()"
              [(sorts)]="ordering"
              [selectMode]="(selectMode() ?? viewModel().toggleDeletes) ? 'multi' : undefined"
              [autoSelect]="selectMode() === 'single' ? 'click' : undefined"
              [(selectedItems)]="selectedItems"
              [trackByFn]="trackByFn"
              [getItemCellStyleFn]="getItemCellStyleFn"
            >
              @for (columnControl of columnControls(); track columnControl.key) {
                <sd-sheet-column
                  [key]="columnControl.key()"
                  [fixed]="columnControl.fixed()"
                  [header]="columnControl.header()"
                  [headerStyle]="columnControl.headerStyle()"
                  [tooltip]="columnControl.tooltip()"
                  [width]="columnControl.width()"
                  [disableSorting]="columnControl.disableSorting()"
                  [disableResizing]="columnControl.disableResizing()"
                  [hidden]="columnControl.hidden()"
                  [collapse]="columnControl.collapse()"
                >
                  @if (columnControl.headerTemplateRef()) {
                    <ng-template #header>
                      <ng-template [ngTemplateOutlet]="columnControl.headerTemplateRef()!" />
                    </ng-template>
                  }
                  @if (columnControl.summaryTemplateRef()) {
                    <ng-template #summary>
                      <ng-template [ngTemplateOutlet]="columnControl.summaryTemplateRef()!" />
                    </ng-template>
                  }

                  <ng-template
                    [cell]="items()"
                    let-item
                    let-index="index"
                    let-depth="depth"
                    let-edit="edit"
                  >
                    @if (viewModel().editItem && columnControl.edit() && editable()) {
                      <sd-anchor class="flex-row" (click)="onItemClick(item, index, $event)">
                        <div class="p-xs-sm pr-0">
                          <sd-icon [icon]="icons.edit" />
                        </div>
                        <div class="flex-grow">
                          <ng-template
                            [ngTemplateOutlet]="columnControl.cellTemplateRef()"
                            [ngTemplateOutletContext]="{
                              $implicit: item,
                              item: item,
                              index: index,
                              depth: depth,
                              edit: edit,
                            }"
                          />
                        </div>
                      </sd-anchor>
                    } @else {
                      <ng-template
                        [ngTemplateOutlet]="columnControl.cellTemplateRef()"
                        [ngTemplateOutletContext]="{
                          $implicit: item,
                          item: item,
                          index: index,
                          depth: depth,
                          edit: edit,
                        }"
                      />
                    }
                  </ng-template>
                </sd-sheet-column>
              }
            </sd-sheet>
          </sd-pane>
        </sd-dock-container>
      </ng-template>

      @if (selectMode()) {
        <ng-template #modalBottom>
          <sd-dock
            position="bottom"
            class="p-sm-default bdt bdt-trans-light flex-row flex-gap-sm"
            style="justify-content: right"
          >
            <sd-button theme="danger" inline (click)="onCancelButtonClick()">
              {{ selectMode() === "multi" ? "모두" : "선택" }}
              해제
            </sd-button>
            @if (selectMode() === "multi") {
              <sd-button theme="primary" inline (click)="onConfirmButtonClick()">
                확인({{ selectedItemKeys().length }})
              </sd-button>
            }
          </sd-dock>
        </ng-template>
      }
    </sd-base-container>
  `,
})
export class SdDataSheetControl<VM extends ISdDataSheetViewModel<any, any, any>> {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  #sdToast = inject(SdToastProvider);
  #sdSharedData = inject(SdSharedDataProvider);
  #sdFileDialog = inject(SdFileDialogProvider);

  //-- base

  viewModel = input.required<VM>();

  #viewType = useViewTypeSignal();
  viewType = input<TSdViewType>();
  currViewType = $computed(() => this.viewType() ?? this.#viewType());

  disabled = input(false, { transform: transformBoolean });
  usable = $computed(() => !this.viewModel().perms || this.viewModel().perms!().includes("use"));
  editable = $computed(
    () =>
      (!this.viewModel().perms || this.viewModel().perms!().includes("edit")) && !this.disabled(),
  );

  //-- view

  initialized = model(false);
  busyCount = model(0);

  filterControls = contentChildren(SdDataSheetFilterDirective);
  toolControls = contentChildren(SdDataSheetToolDirective);
  columnControls = contentChildren(SdDataSheetColumnDirective<TVMItem<VM>>);

  beforeToolControls = $computed(() => this.toolControls().filter((item) => item.prepend()));
  afterToolControls = $computed(() => this.toolControls().filter((item) => !item.prepend()));

  //-- items

  items = $signal<TVMItem<VM>[]>([]);
  summary = $signal<Partial<TVMItem<VM>>>({});

  selectedItems = model<TVMItem<VM>[]>([]);

  trackByFn = (item: TVMItem<VM>): TVMItemKey<VM> => this.viewModel().getKey(item);

  page = $signal(0);
  pageLength = $signal(0);
  ordering = $signal<ISdSortingDef[]>([]);

  selectMode = input<"single" | "multi">();

  selectedItemKeys = model<TVMItemKey<VM>[]>([]);

  //-- search

  lastFilter = $signal<TVMFilter<VM>>();

  constructor() {
    setupCumulateSelectedKeys({
      items: this.items,
      selectMode: this.selectMode,
      selectedItems: this.selectedItems,
      selectedItemKeys: this.selectedItemKeys,
      keySelectorFn: (item) => this.trackByFn(item),
    });

    setupCloserWhenSingleSelectionChange({
      selectMode: this.selectMode,
      selectedItemKeys: this.selectedItemKeys,
      close: this.close,
    });

    $effect(
      [
        () => {
          this.page();
          this.lastFilter();
          this.ordering();
          for (const searchCondition of this.viewModel().searchConditions ?? []) {
            searchCondition();
          }
        },
      ],
      async () => {
        if (!this.usable()) {
          this.initialized.set(true);
          return;
        }

        if (this.lastFilter() == null) {
          this.#updateLastFilter();
        }

        this.busyCount.update((v) => v + 1);
        await this.#sdToast.try(async () => {
          await this.#sdSharedData.wait();
          await this.refreshAsync();
        });
        this.busyCount.update((v) => v - 1);
        this.initialized.set(true);
      },
    );
  }

  onFilterSubmit() {
    this.page.set(0);

    this.#updateLastFilter();
  }

  #updateLastFilter() {
    this.lastFilter.set(ObjectUtils.clone(this.viewModel().filter()));
  }

  @HostListener("sdRefreshCommand")
  onRefreshCommand() {
    if (this.busyCount() > 0) return;

    this.lastFilter.$mark();
  }

  async refreshAsync() {
    if (this.lastFilter() == null) return;

    const result = await this.searchAsync("sheet");
    this.items.set(result.items);
    this.pageLength.set(result.pageLength ?? 0);
    this.summary.set(result.summary ?? {});

    this.selectedItems.set(
      this.items().filter((item) =>
        this.selectedItems().some(
          (sel) => this.viewModel().getKey(sel) === this.viewModel().getKey(item),
        ),
      ),
    );
  }

  async searchAsync<T extends "sheet" | "excel">(type: T) {
    return await this.viewModel().search(type, this.lastFilter(), this.ordering(), this.page());
  }

  //-- edit

  async onCreateItemButtonClick() {
    if (!this.editable()) return;

    await this.#editItemAsync();
  }

  async onItemClick(item: TVMItem<VM>, index: number, event: MouseEvent) {
    if (!this.editable()) return;

    event.preventDefault();
    event.stopPropagation();

    await this.#editItemAsync(item);
  }

  async #editItemAsync(item?: TVMItem<VM>) {
    if (!this.viewModel().editItem) return;

    const result = await this.viewModel().editItem!(item);
    if (!result) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.refreshAsync();
    });
    this.busyCount.update((v) => v - 1);
  }

  //-- delete

  isSelectedItemsHasDeleted = $computed(() =>
    this.selectedItems().some((item) => this.viewModel().getIsDeleted?.(item) ?? false),
  );
  isSelectedItemsHasNotDeleted = $computed(() =>
    this.selectedItems().some((item) => !(this.viewModel().getIsDeleted?.(item) ?? false)),
  );

  getItemCellStyleFn = (item: TVMItem<VM>) =>
    this.viewModel().getIsDeleted?.(item) ? "text-decoration: line-through;" : undefined;

  async onToggleDeletesButtonClick(del: boolean) {
    if (!this.viewModel().toggleDeletes) return;
    if (!this.editable()) return;

    this.busyCount.update((v) => v + 1);

    await this.#sdToast.try(async () => {
      const result = await this.viewModel().toggleDeletes!(this.selectedItems(), del);
      if (!result) return;

      await this.refreshAsync();

      this.#sdToast.success(`${del ? "삭제" : "복구"} 되었습니다.`);
    });
    this.busyCount.update((v) => v - 1);
  }

  //-- excel

  async onDownloadExcelButtonClick() {
    if (!this.viewModel().downloadExcel) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      if (this.lastFilter() == null) return;

      const items = (await this.searchAsync("excel")).items;
      await this.viewModel().downloadExcel!(items);
    });
    this.busyCount.update((v) => v - 1);
  }

  async onUploadExcelButtonClick() {
    if (!this.viewModel().uploadExcel) return;
    if (!this.editable()) return;

    const file = await this.#sdFileDialog.showAsync(
      false,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    if (!file) return;

    this.busyCount.update((v) => v + 1);

    await this.#sdToast.try(async () => {
      await this.viewModel().uploadExcel!(file);

      await this.refreshAsync();

      this.#sdToast.success("엑셀 업로드가 완료 되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }

  //-- modal

  close = output<ISelectModalOutputResult>();

  onConfirmButtonClick() {
    this.close.emit({ selectedItemKeys: this.selectedItemKeys() });
  }

  onCancelButtonClick() {
    this.close.emit({ selectedItemKeys: [] });
  }
}

export interface ISdDataSheetViewModel<F extends Record<string, any>, I, K> {
  key: string;
  name: string;
  perms?: Signal<string[]>;

  filter: Signal<F>;

  getKey(item: I): K;

  getIsDeleted?(item: I): boolean;

  searchConditions?: Signal<any>[];

  search<T extends "excel" | "sheet">(
    type: T,
    lastFilter: F,
    sortingDefs: ISdSortingDef[],
    page: number,
  ): Promise<{ items: I[]; pageLength?: number; summary?: Partial<I> }>;

  editItem?(item?: I): Promise<boolean | undefined>;

  toggleDeletes?(selectedItems: I[], del: boolean): Promise<boolean>;

  downloadExcel?(items: I[]): Promise<void>;

  uploadExcel?(file: File): Promise<void>;
}

type TVMFilter<T extends ISdDataSheetViewModel<any, any, any>> = ReturnType<T["filter"]>;
type TVMItem<T extends ISdDataSheetViewModel<any, any, any>> = Parameters<T["getKey"]>[0];
type TVMItemKey<T extends ISdDataSheetViewModel<any, any, any>> = ReturnType<T["getKey"]>;
