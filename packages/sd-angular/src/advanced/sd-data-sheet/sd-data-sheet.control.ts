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
import { SdIconControl } from "../../controls/sd-icon.control";
import { SdPaneControl } from "../../controls/sd-pane.control";
import { SdSheetColumnCellTemplateDirective } from "../../controls/sd-sheet/directives/sd-sheet-column-cell.template-directive";
import { SdSheetColumnDirective } from "../../controls/sd-sheet/directives/sd-sheet-column.directive";
import { SdSheetControl } from "../../controls/sd-sheet/sd-sheet.control";
import { SdTopbarMenuItemControl } from "../../controls/sd-topbar-menu-item.control";
import { SdTopbarMenuControl } from "../../controls/sd-topbar-menu.control";
import { SdShowEffectDirective } from "../../directives/sd-show-effect.directive";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { SdFileDialogProvider } from "../../providers/sd-file-dialog.provider";
import { SdToastProvider } from "../../providers/sd-toast.provider";
import { $computed } from "../../utils/bindings/$computed";
import { $effect } from "../../utils/bindings/$effect";
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

@Component({
  selector: "sd-data-sheet",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdTopbarMenuControl,
    SdTopbarMenuItemControl,
    SdIconControl,
    SdDockContainerControl,
    SdDockControl,
    SdShowEffectDirective,
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
    <sd-base-container [busy]="busyCount() > 0" [viewType]="currViewType()">
      <ng-template #pageTopbar>
        <sd-topbar-menu>
          <sd-topbar-menu-item theme="info" (click)="onRefreshCommand()">
            <sd-icon [icon]="icons.refresh" fixedWidth />
            새로고침
            <small>(CTRL+ALT+L)</small>
          </sd-topbar-menu-item>
        </sd-topbar-menu>
      </ng-template>

      <ng-template #content>
        @if (initialized()) {
          <sd-dock-container class="p-lg" sd-show-effect>
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
                @if (viewModel().editItemAsync) {
                  @if (viewModel().perms().includes("edit")) {
                    <sd-button size="sm" theme="link-primary" (click)="onCreateItemButtonClick()">
                      <sd-icon [icon]="icons.add" fixedWidth />
                      등록
                      <small>(CTRL+INSERT)</small>
                    </sd-button>
                  }
                }

                @if (!selectMode()) {
                  @if (viewModel().toggleDeletesAsync) {
                    <sd-button
                      size="sm"
                      theme="link-danger"
                      (click)="onToggleDeletesButtonClick(true)"
                      [disabled]="!isSelectedItemsHasNotDeleted()"
                    >
                      <sd-icon [icon]="icons.delete" [fixedWidth]="true" />
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

                  @if (viewModel().uploadExcelAsync) {
                    <sd-button size="sm" theme="link-success" (click)="onUploadExcelButtonClick()">
                      <sd-icon [icon]="icons.upload" fixedWidth />
                      엑셀 업로드
                    </sd-button>
                  }
                }

                @if (viewModel().downloadExcelAsync) {
                  <sd-button size="sm" theme="link-success" (click)="onDownloadExcelButtonClick()">
                    <sd-icon [icon]="icons.fileExcel" fixedWidth />
                    엑셀 다운로드
                  </sd-button>
                }

                @for (toolControl of toolControls(); track toolControl) {
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
                [selectMode]="selectMode() ?? 'multi'"
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
                      @if (viewModel().editItemAsync &&
                      columnControl.edit() &&
                      viewModel().perms().includes("edit")) {
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
        }
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

  private _sdToast = inject(SdToastProvider);
  private _sdSharedData = inject(SdSharedDataProvider);
  private _sdFileDialog = inject(SdFileDialogProvider);

  //-- base

  viewModel = input.required<VM>();

  private _viewType = useViewTypeSignal();
  viewType = input<TSdViewType>();
  currViewType = $computed(() => this.viewType() ?? this._viewType());

  //-- view

  initialized = $signal(false);
  busyCount = $signal(0);

  filterControls = contentChildren(SdDataSheetFilterDirective);
  toolControls = contentChildren(SdDataSheetToolDirective);
  columnControls = contentChildren(SdDataSheetColumnDirective<TVMItem<VM>>);

  //-- items

  items = $signal<TVMItem<VM>[]>([]);

  selectedItems = model<TVMItem<VM>[]>([]);

  trackByFn = (item: TVMItem<VM>): TVMItemKey<VM> => this.viewModel().getKey(item);

  page = $signal(0);
  pageLength = $signal(0);
  ordering = $signal<ISdSortingDef[]>([]);

  selectMode = input<"single" | "multi">();

  selectedItemKeys = model<TVMItemKey<VM>[]>([]);

  orgFirstSelectedItemKey = $signal<TVMItemKey<VM>>();

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

    $effect([this.page, this.lastFilter, this.ordering], async () => {
      if (!this.viewModel().perms().includes("use")) {
        this.initialized.set(true);
        return;
      }

      if (this.lastFilter() == null) {
        this._updateLastFilter();
      }

      this.busyCount.update((v) => v + 1);
      await this._sdToast.try(async () => {
        await this._sdSharedData.wait();
        await this.refreshAsync();
      });
      this.busyCount.update((v) => v - 1);
      this.initialized.set(true);
    });

    $effect([], () => {
      this.orgFirstSelectedItemKey.set(this.selectedItemKeys().first());
    });

    $effect([this.selectedItemKeys], () => {
      if (
        this.selectMode() === "single" &&
        this.orgFirstSelectedItemKey() !== this.selectedItemKeys().first()
      ) {
        this.close.emit({ selectedItemKeys: this.selectedItemKeys() });
      }
    });
  }

  onFilterSubmit() {
    this.page.set(0);

    this._updateLastFilter();
  }

  private _updateLastFilter() {
    this.lastFilter.set(ObjectUtils.clone(this.viewModel().filter()));
  }

  @HostListener("sdRefreshCommand")
  onRefreshCommand() {
    if (this.busyCount() > 0) return;

    this.lastFilter.$mark();
  }

  async refreshAsync() {
    if (this.lastFilter() == null) return;

    const result = await this.viewModel().searchAsync(
      "sheet",
      this.lastFilter(),
      this.ordering(),
      this.page(),
    );
    this.items.set(result.items);
    this.pageLength.set(result.pageLength ?? 0);

    this.selectedItems.set(
      this.items().filter((item) =>
        this.selectedItems().some(
          (sel) => this.viewModel().getKey(sel) === this.viewModel().getKey(item),
        ),
      ),
    );
  }

  async searchAllAsync() {
    return (
      await this.viewModel().searchAsync("excel", this.lastFilter(), this.ordering())
    ).items;
  }

  //-- edit

  async onCreateItemButtonClick() {
    if (!this.viewModel().perms().includes("edit")) return;

    await this._editItemAsync();
  }

  async onItemClick(item: TVMItem<VM>, index: number, event: MouseEvent) {
    if (!this.viewModel().perms().includes("edit")) return;

    event.preventDefault();
    event.stopPropagation();

    await this._editItemAsync(item);
  }

  private async _editItemAsync(item?: TVMItem<VM>) {
    if (!this.viewModel().editItemAsync) return;

    const result = await this.viewModel().editItemAsync!(item);
    if (!result) return;

    this.busyCount.update((v) => v + 1);
    await this._sdToast.try(async () => {
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
    if (!this.viewModel().toggleDeletesAsync) return;
    if (!this.viewModel().perms().includes("edit")) return;

    this.busyCount.update((v) => v + 1);

    await this._sdToast.try(async () => {
      const result = await this.viewModel().toggleDeletesAsync!(this.selectedItems(), del);
      if (!result) return;

      await this.refreshAsync();

      this._sdToast.success(`${del ? "삭제" : "복구"} 되었습니다.`);
    });
    this.busyCount.update((v) => v - 1);
  }

  //-- excel

  async onDownloadExcelButtonClick() {
    if (!this.viewModel().downloadExcelAsync) return;

    this.busyCount.update((v) => v + 1);
    await this._sdToast.try(async () => {
      if (this.lastFilter() == null) return;

      const data = await this.viewModel().searchAsync("excel", this.lastFilter(), this.ordering());
      await this.viewModel().downloadExcelAsync!(data.items);
    });
    this.busyCount.update((v) => v - 1);
  }

  async onUploadExcelButtonClick() {
    if (!this.viewModel().uploadExcelAsync) return;
    if (!this.viewModel().perms().includes("edit")) return;

    const file = await this._sdFileDialog.showAsync(
      false,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    if (!file) return;

    this.busyCount.update((v) => v + 1);

    await this._sdToast.try(async () => {
      await this.viewModel().uploadExcelAsync!(file);

      await this.refreshAsync();

      this._sdToast.success("엑셀 업로드가 완료 되었습니다.");
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
  perms: Signal<string[]>;

  filter: Signal<F>;

  getKey(item: I): K;

  getIsDeleted?(item: I): boolean;

  searchAsync(
    type: "excel" | "sheet",
    lastFilter: F,
    sortingDefs: ISdSortingDef[],
    page?: number,
  ): Promise<{ items: I[]; pageLength?: number }>;

  editItemAsync?(item?: I): Promise<boolean>;

  toggleDeletesAsync?(selectedItems: I[], del: boolean): Promise<boolean>;

  downloadExcelAsync?(items: I[]): Promise<void>;

  uploadExcelAsync?(file: File): Promise<void>;
}

// export type TFilterSignals<F> = { [P in keyof F]: WritableSignal<F[P]> };

type TVMFilter<T extends ISdDataSheetViewModel<any, any, any>> = ReturnType<T["filter"]>;
type TVMItem<T extends ISdDataSheetViewModel<any, any, any>> = Parameters<T["getKey"]>[0];
type TVMItemKey<T extends ISdDataSheetViewModel<any, any, any>> = ReturnType<T["getKey"]>;
