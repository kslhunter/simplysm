import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  HostListener,
  inject,
  input,
  output,
  ViewEncapsulation,
} from "@angular/core";
import { SdAnchorControl } from "../../controls/sd-anchor.control";
import { SdBusyContainerControl } from "../../controls/sd-busy-container.control";
import { SdButtonControl } from "../../controls/sd-button.control";
import { SdDockContainerControl } from "../../controls/sd-dock-container.control";
import { SdDockControl } from "../../controls/sd-dock.control";
import { SdFormBoxItemControl } from "../../controls/sd-form-box-item.control";
import { SdFormBoxControl } from "../../controls/sd-form-box.control";
import { SdFormControl } from "../../controls/sd-form.control";
import { SdIconControl } from "../../controls/sd-icon.control";
import { SdPaneControl } from "../../controls/sd-pane.control";
import {
  SdSheetColumnCellTemplateDirective,
} from "../../controls/sd-sheet/directives/sd-sheet-column-cell.template-directive";
import {
  SdSheetColumnDirective,
} from "../../controls/sd-sheet/directives/sd-sheet-column.directive";
import { SdSheetControl } from "../../controls/sd-sheet/sd-sheet.control";
import { SdTopbarContainerControl } from "../../controls/sd-topbar-container.control";
import { SdTopbarMenuItemControl } from "../../controls/sd-topbar-menu-item.control";
import { SdTopbarMenuControl } from "../../controls/sd-topbar-menu.control";
import { SdTopbarControl } from "../../controls/sd-topbar.control";
import { SdShowEffectDirective } from "../../directives/sd-show-effect.directive";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { SdAppStructureProvider } from "../../providers/sd-app-structure.provider";
import { SdFileDialogProvider } from "../../providers/sd-file-dialog.provider";
import { SdToastProvider } from "../../providers/sd-toast.provider";
import { $computed } from "../../utils/bindings/$computed";
import { $effect } from "../../utils/bindings/$effect";
import { $model } from "../../utils/bindings/$model";
import { $signal } from "../../utils/bindings/$signal";
import { ISdSortingDef } from "../../utils/managers/sd-sorting-manager";
import { setupCumulateSelectedKeys } from "../../utils/setups/setup-cumulate-selected-keys";
import { SdSharedDataProvider } from "../shared-data/sd-shared-data.provider";
import { SdDataSheetColumnDirective } from "./sd-data-sheet-column.directive";
import { SdDataSheetFilterDirective } from "./sd-data-sheet-filter.directive";
import { ISdDataSheetViewModel } from "./sd-data-sheet-view-model";

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
    SdBusyContainerControl,
    SdTopbarContainerControl,
    SdTopbarControl,
  ],
  template: `
    <sd-busy-container [busy]="busyCount() > 0">
      @if (!perms().includes("use")) {
        <sd-pane
          class="tx-theme-grey-light p-xxl tx-center"
          sd-show-effect
        >
          <br />
          <sd-icon [icon]="icons.triangleExclamation" fixedWidth size="5x" />
          <br />
          <br />
          '{{ viewModel().name }}'에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
        </sd-pane>
      } @else {
        <sd-topbar-container>
          <sd-topbar>
            <h4>{{ viewModel().name }}</h4>

            <sd-topbar-menu>
              <sd-topbar-menu-item theme="info" (click)="onRefreshButtonClick()">
                <sd-icon [icon]="icons.refresh" fixedWidth />
                새로고침 <small>(CTRL+ALT+L)</small>
              </sd-topbar-menu-item>
            </sd-topbar-menu>
          </sd-topbar>

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
                    @if (perms().includes('edit')) {
                      <sd-button size="sm" theme="link-primary" (click)="onCreateItemButtonClick()">
                        <sd-icon [icon]="icons.add" fixedWidth />
                        등록 <small>(CTRL+INSERT)</small>
                      </sd-button>
                    }
                  }

                  @if (!selectMode()) {
                    @if (viewModel().toggleDeletesAsync) {
                      <sd-button
                        size="sm"
                        theme="link-danger"
                        (click)=" onToggleDeletesButtonClick(true)"
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
                      <sd-button
                        size="sm"
                        theme="link-success"
                        (click)="onUploadExcelButtonClick()"
                      >
                        <sd-icon [icon]="icons.upload" fixedWidth />
                        엑셀 업로드
                      </sd-button>
                    }
                  }

                  @if (viewModel().downloadExcelAsync) {
                    <sd-button
                      size="sm"
                      theme="link-success"
                      (click)="onDownloadExcelButtonClick()"
                    >
                      <sd-icon [icon]="icons.fileExcel" fixedWidth />
                      엑셀 다운로드
                    </sd-button>
                  }
                </div>
              </sd-dock>

              <sd-pane>
                <sd-sheet
                  [key]="viewModel().key + '-sheet'"
                  [items]="viewModel().items()"
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
                        [cell]="viewModel().items()"
                        let-item
                        let-index="index"
                        let-depth="depth"
                        let-edit="edit"
                      >
                        @if (viewModel().editItemAsync && columnControl.edit()
                        && perms().includes('edit')) {
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
        </sd-topbar-container>
      }
    </sd-busy-container>
  `,
})
export class SdDataSheetControl<F extends Record<string, any>, I, K> {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  private _sdToast = inject(SdToastProvider);
  private _sdAppStructure = inject(SdAppStructureProvider);
  private _sdSharedData = inject(SdSharedDataProvider);
  private _sdFileDialog = inject(SdFileDialogProvider);

  //-- base

  viewModel = input.required<ISdDataSheetViewModel<F, I, K>>();
  perms = $computed(() => this._sdAppStructure.getViewPerms(
    this.viewModel().viewCodes,
    ["use", "edit"],
  ));

  //-- view

  __initialized = input<boolean>(false, { alias: "initialized" });
  __initializedChange = output<boolean>({ alias: "initializedChange" });
  initialized = $model(this.__initialized, this.__initializedChange);


  busyCount = $signal(0);

  filterControls = contentChildren(SdDataSheetFilterDirective);
  columnControls = contentChildren(SdDataSheetColumnDirective<I>);

  //-- items

  trackByFn = (item: I): K => this.viewModel().getKey(item);

  page = $signal(0);
  pageLength = $signal(0);
  ordering = $signal<ISdSortingDef[]>([]);

  selectedItems = $signal<I[]>([]);
  selectMode = input<"single" | "multi">();

  __selectedItemKeys = input<K[]>([], { alias: "selectedItemKeys" });
  __selectedItemKeysChange = output<K[]>({ alias: "selectedItemKeysChange" });
  selectedItemKeys = $model(this.__selectedItemKeys, this.__selectedItemKeysChange);


  //-- search

  lastFilter = $signal<F>();

  constructor() {
    setupCumulateSelectedKeys({
      items: $computed(() => this.viewModel().items()),
      selectMode: this.selectMode,
      selectedItems: this.selectedItems,
      selectedItemKeys: this.selectedItemKeys,
      keySelectorFn: (item) => this.trackByFn(item),
    });

    $effect([this.page, this.lastFilter, this.ordering], async () => {
      if (!this.perms().includes("use")) {
        this.initialized.set(true);
        return;
      }

      if (!this.lastFilter()) {
        this._updateLastFilter();
      }

      this.busyCount.update((v) => v + 1);
      await this._sdToast.try(async () => {
        await this._sdSharedData.wait();
        await this._refresh();
      });
      this.busyCount.update((v) => v - 1);
      this.initialized.set(true);
    });
  }

  onFilterSubmit() {
    this.page.set(0);

    this._updateLastFilter();
  }

  private _updateLastFilter() {
    const lastFilter: Partial<F> = {};
    for (const key in this.viewModel().filter) {
      lastFilter[key] = this.viewModel().filter[key]();
    }
    this.lastFilter.set(lastFilter as F);
  }

  @HostListener("sdRefreshCommand")
  onRefreshButtonClick() {
    if (this.busyCount() > 0) return;

    this.lastFilter.$mark();
  }

  private async _refresh() {
    if (!this.lastFilter()) return;

    const result = await this.viewModel().searchAsync(
      "sheet",
      this.lastFilter()!,
      this.ordering(),
      this.page(),
    );
    this.viewModel().items.set(result.items);
    this.pageLength.set(result.pageLength ?? 0);

    this.selectedItems.set(
      this.viewModel().items().filter((item) =>
        this.selectedItems().some((sel) =>
          this.viewModel().getKey(sel) === this.viewModel().getKey(item),
        ),
      ),
    );
  }

  //-- edit

  async onCreateItemButtonClick() {
    if (!this.perms().includes("edit")) return;

    await this._editItemAsync();
  }

  async onItemClick(item: I, index: number, event: MouseEvent) {
    if (!this.perms().includes("edit")) return;

    event.preventDefault();
    event.stopPropagation();

    await this._editItemAsync(item);
  }

  private async _editItemAsync(item?: I) {
    if (!this.viewModel().editItemAsync) return;

    const result = await this.viewModel().editItemAsync!(item);
    if (!result) return;

    this.busyCount.update((v) => v + 1);
    await this._sdToast.try(async () => {
      await this._refresh();
    });
    this.busyCount.update((v) => v - 1);
  }

  //-- delete

  isSelectedItemsHasDeleted = $computed(() =>
    this.selectedItems().some((item) => this.viewModel().getIsDeleted(item)),
  );
  isSelectedItemsHasNotDeleted = $computed(() =>
    this.selectedItems().some((item) => !this.viewModel().getIsDeleted(item)),
  );

  getItemCellStyleFn = (item: I) => (
    this.viewModel().getIsDeleted(item) ? "text-decoration: line-through;" : undefined
  );

  async onToggleDeletesButtonClick(del: boolean) {
    if (!this.viewModel().toggleDeletesAsync) return;
    if (!this.perms().includes("edit")) return;

    this.busyCount.update((v) => v + 1);

    await this._sdToast.try(async () => {
      await this.viewModel().toggleDeletesAsync!(this.selectedItems(), del);

      await this._refresh();

      this._sdToast.success(`${del ? "삭제" : "복구"} 되었습니다.`);
    });
    this.busyCount.update((v) => v - 1);
  }

  //-- excel

  async onDownloadExcelButtonClick() {
    if (!this.viewModel().downloadExcelAsync) return;

    this.busyCount.update((v) => v + 1);
    await this._sdToast.try(async () => {
      if (!this.lastFilter()) return;

      const data = await this.viewModel().searchAsync(
        "excel",
        this.lastFilter()!,
        this.ordering(),
        this.page(),
      );
      await this.viewModel().downloadExcelAsync!(data.items);
    });
    this.busyCount.update((v) => v - 1);
  }

  async onUploadExcelButtonClick() {
    if (!this.viewModel().uploadExcelAsync) return;
    if (!this.perms().includes("edit")) return;

    const file = await this._sdFileDialog.showAsync(
      false,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    if (!file) return;

    this.busyCount.update((v) => v + 1);

    await this._sdToast.try(async () => {
      await this.viewModel().uploadExcelAsync!(file);

      await this._refresh();

      this._sdToast.success("엑셀 업로드가 완료 되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }
}