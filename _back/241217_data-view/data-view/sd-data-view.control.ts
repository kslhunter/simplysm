import { ChangeDetectionStrategy, Component, inject, input, output } from "@angular/core";
import {
  SdDataViewModelAbstract,
  TSdDataViewModelGenericTypes,
} from "./sd-data-view-model.abstract";
import { SdBusyContainerControl } from "../../controls/busy/sd-busy-container.control";
import { FormatPipe } from "../../pipes/format.pipe";
import { SdAnchorControl } from "../../controls/button/sd-anchor.control";
import { SdButtonControl } from "../../controls/button/sd-button.control";
import { SdDockContainerControl } from "../../controls/layout/sd-dock-container.control";
import { SdDockControl } from "../../controls/layout/sd-dock.control";
import { SdFormBoxControl } from "../../controls/form-layout/sd-form-box.control";
import { SdFormBoxItemControl } from "../../controls/form-layout/sd-form-box-item.control";
import { SdFormControl } from "../../controls/form/sd-form.control";
import { SdIconControl } from "../../controls/icon/sd-icon.control";
import { SdPaneControl } from "../../controls/layout/sd-pane.control";
import {
  SdSheetColumnCellTemplateDirective,
} from "../../controls/sheet/sd-sheet-column-cell.template-directive";
import { SdSheetColumnDirective } from "../../controls/sheet/sd-sheet-column.directive";
import { SdSheetControl } from "../../controls/sheet/sd-sheet.control";
import { $computed, $effect, $model, $signal } from "../../utils/$hooks";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { NgTemplateOutlet } from "@angular/common";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { SdToastProvider } from "../../controls/toast/sd-toast.provider";
import { SdSharedDataProvider } from "../shared-data/sd-shared-data.provider";
import { SdExcelWorkbook } from "@simplysm/sd-excel";
import { SdFileDialogProvider } from "../../providers/sd-file-dialog.provider";
import { SdModalProvider } from "../../controls/modal/sd-modal.provider";
import { SdDataViewDetailModal } from "./sd-data-view-detail.modal";

@Component({
  selector: "sd-data-view",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    SdBusyContainerControl,
    FormatPipe,
    SdAnchorControl,
    SdButtonControl,
    SdDockContainerControl,
    SdDockControl,
    SdFormBoxControl,
    SdFormBoxItemControl,
    SdFormControl,
    SdIconControl,
    SdPaneControl,
    SdSheetColumnCellTemplateDirective,
    SdSheetColumnDirective,
    SdSheetControl,
    NgTemplateOutlet,
  ],
  template: `
    <sd-busy-container [busy]="busyCount() > 0" class="p-lg">
      @if (initialized()) {
        <sd-dock-container class="show-effect">
          <sd-dock class="pb-lg">
            <sd-form (submit)="onFilterSubmit()">
              <sd-form-box layout="inline">
                <sd-form-box-item>
                  <sd-button type="submit" theme="info">
                    <sd-icon [icon]="icons.search" fixedWidth />
                    조회
                  </sd-button>
                </sd-form-box-item>

                @for (filterControl of vm().sheetFilterControls(); track filterControl) {
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
              @if (this.vm().perms().includes("edit")) {
                <sd-button size="sm" theme="link-primary" (click)="onCreateItemButtonClick()">
                  <sd-icon [icon]="icons.plusCircle" fixedWidth />
                  등록 <small>(CTRL+INSERT)</small>
                </sd-button>

                @if (!selectMode()) {
                  <sd-button
                    size="sm"
                    theme="link-danger"
                    (click)="onDeleteSelectedItemsButtonClick()"
                    [disabled]="!isSelectedItemsHasNotDeleted()"
                  >
                    <sd-icon [icon]="icons.eraser" [fixedWidth]="true" />
                    선택 삭제
                  </sd-button>
                  @if (isSelectedItemsHasDeleted()) {
                    <sd-button
                      size="sm"
                      theme="link-warning"
                      (click)="onRestoreSelectedItemsButtonClick()"
                    >
                      <sd-icon [icon]="icons.redo" [fixedWidth]="true" />
                      선택 복구
                    </sd-button>
                  }
                }

                <sd-button size="sm" theme="link-success" (click)="onUploadExcelButtonClick()">
                  <sd-icon [icon]="icons.upload" fixedWidth />
                  엑셀 업로드
                </sd-button>
              }

              <sd-button size="sm" theme="link-success" (click)="onDownloadExcelButtonClick()">
                <sd-icon [icon]="icons.fileExcel" fixedWidth />
                엑셀 다운로드
              </sd-button>
            </div>
          </sd-dock>

          <sd-pane>
            <sd-sheet
              [key]="vm().key + '-sheet'"
              [items]="vm().items()"
              [(page)]="vm().page"
              [pageLength]="vm().pageLength()"
              [(ordering)]="vm().ordering"
              [getItemCellStyleFn]="getItemCellStyleFn"
              [selectMode]="selectMode() ?? 'multi'"
              [autoSelect]="selectMode() === 'single' ? 'click' : undefined"
              [(selectedItems)]="vm().selectedItems"
              (selectedItemsChange)="onSelectedItemsChange($event)"
            >
              <sd-sheet-column fixed header="#" resizable useOrdering key="id">
                <ng-template [cell]="vm().items()" let-item>
                  <div class="p-xs-sm">
                    @if (this.vm().perms().includes("edit")) {
                      <sd-anchor (click)="onItemClick(item, $event)" class="flex-row flex-gap-sm">
                        <div>
                          <sd-icon [icon]="icons.edit" />
                        </div>
                        <div class="flex-grow tx-right">
                          {{ item.id }}
                        </div>
                      </sd-anchor>
                    } @else {
                      <div class="tx-right">
                        {{ item.id }}
                      </div>
                    }
                  </div>
                </ng-template>
              </sd-sheet-column>

              @for (columnControl of vm().sheetColumnControls(); track columnControl.key()) {
                <sd-sheet-column
                  [key]="columnControl.key()"
                  [fixed]="columnControl.fixed()"
                  [header]="columnControl.header()"
                  [headerStyle]="columnControl.headerStyle()"
                  [tooltip]="columnControl.tooltip()"
                  [width]="columnControl.width()"
                  [useOrdering]="columnControl.useOrdering()"
                  [resizable]="columnControl.resizable()"
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
                    [cell]="vm().items()"
                    let-item
                    let-index="index"
                    let-depth="depth"
                    let-edit="edit"
                  >
                    <ng-template
                      [ngTemplateOutlet]="columnControl.cellTemplateRef() ?? null"
                      [ngTemplateOutletContext]="{
                        $implicit: item,
                        item: item,
                        index: index,
                        depth: depth,
                        edit: edit,
                      }"
                    />
                  </ng-template>
                </sd-sheet-column>
              }

              <sd-sheet-column
                [header]="['최종수정', '일시']"
                resizable
                useOrdering
                key="lastModifyDateTime"
              >
                <ng-template [cell]="vm().items()" let-item>
                  <div class="p-xs-sm tx-center">
                    {{ item.lastModifyDateTime | format: "yyyy-MM-dd HH:mm" }}
                  </div>
                </ng-template>
              </sd-sheet-column>
              <sd-sheet-column
                [header]="['최종수정', '이름']"
                resizable
                useOrdering
                key="lastModifierName"
              >
                <ng-template [cell]="vm().items()" let-item>
                  <div class="p-xs-sm tx-center">
                    {{ item.lastModifierName }}
                  </div>
                </ng-template>
              </sd-sheet-column>
            </sd-sheet>
          </sd-pane>
        </sd-dock-container>
      }
    </sd-busy-container>`,
})
export class SdDataViewControl<VM extends SdDataViewModelAbstract> {
  icons = inject(SdAngularConfigProvider).icons;

  #sdToast = inject(SdToastProvider);
  #sdSharedData = inject(SdSharedDataProvider);
  #sdFileDialog = inject(SdFileDialogProvider);
  #sdModal = inject(SdModalProvider);

  vm = input.required<VM>();

  initialized = $signal(false);
  busyCount = $signal(0);

  selectMode = input<"single" | "multi">();

  _selectedItemIds = input<number[]>([], { alias: "selectedItemIds" });
  _selectedItemIdsChange = output<number[]>({ alias: "selectedItemIdsChange" });
  selectedItemIds = $model(this._selectedItemIds, this._selectedItemIdsChange);

  isSelectedItemsHasDeleted = $computed(() => this.vm()
    .selectedItems()
    .some((item) => item.isDeleted));
  isSelectedItemsHasNotDeleted = $computed(() => this.vm().selectedItems()
    .some((item) => !item.isDeleted));

  getItemCellStyleFn = (item: TSdDataViewModelGenericTypes<VM>["SI"]) => (
    item.isDeleted ? "text-decoration: line-through;" : undefined
  );

  constructor() {
    $effect([this.vm().page, this.vm().lastFilter, this.vm().ordering], async () => {
      if (!this.vm().perms().includes("use")) {
        this.initialized.set(true);
        return;
      }

      this.busyCount.update((v) => v + 1);
      await this.#sdToast.try(async () => {
        await this.#sdSharedData.wait();
        await this.vm().refreshItemsAsync();
      });
      this.busyCount.update((v) => v - 1);
      this.initialized.set(true);
    });

    $effect([this.vm().items, this.selectedItemIds], () => {
      const newSelectedItems = this.vm().items()
        .filter((item) => this.selectedItemIds().includes(item.id));
      if (!ObjectUtil.equal(this.vm().selectedItems(), newSelectedItems, { onlyOneDepth: true })) {
        this.vm().selectedItems.set(newSelectedItems);
      }
    });
  }

  onSelectedItemsChange(selectedItems: TSdDataViewModelGenericTypes<VM>["SI"][]) {
    if (this.selectMode() === "single") {
      this.selectedItemIds.set(selectedItems.map((item) => item.id));
    }
    else {
      this.selectedItemIds.update(v => {
        let r = v;
        for (const item of this.vm().items()) {
          if (selectedItems.includes(item)) {
            r = [...r, item.id].distinct();
          }
          else {
            r = r.filter(v1 => v1 !== item.id);
          }
        }

        return r;
      });
    }
  }

  onFilterSubmit() {
    this.vm().page.set(0);
    this.vm().lastFilter.set(ObjectUtil.clone(this.vm().filter()));
  }

  async onDownloadExcelButtonClick() {
    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      const wb = SdExcelWorkbook.create();
      const ws = await wb.createWorksheetAsync(this.vm().name);

      const dataMatrix = await this.vm().getExcelDataMatrixAsync();
      await ws.setDataMatrixAsync(dataMatrix);

      const blob = await wb.getBlobAsync();
      blob.download(`${this.vm().name}.xlsx`);
    });
    this.busyCount.update((v) => v - 1);
  }

  async onItemClick(item: TSdDataViewModelGenericTypes<VM>["SI"], event: MouseEvent) {
    if (!this.vm().perms().includes("edit")) return;

    event.preventDefault();
    event.stopPropagation();

    const result = await this.#sdModal.showAsync(
      SdDataViewDetailModal,
      `${this.vm().name}수정(#${item.id})`,
      {
        dataId: item.id,
        vm: this.vm(),
      },
    );
    if (!result) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.vm().refreshItemsAsync();
    });
    this.busyCount.update((v) => v - 1);
  }

  async onCreateItemButtonClick() {
    if (!this.vm().perms().includes("edit")) return;

    const result = await this.#sdModal.showAsync(SdDataViewDetailModal, `${this.vm.name}등록`, {
      vm: this.vm(),
    });
    if (!result) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.vm().refreshItemsAsync();
    });
    this.busyCount.update((v) => v - 1);
  }

  async onDeleteSelectedItemsButtonClick() {
    this.busyCount.update((v) => v + 1);

    await this.#sdToast.try(async () => {
      await this.vm().deleteSelectedItemsAsync();

      await this.vm().refreshItemsAsync();

      this.#sdToast.success("삭제 되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }

  async onRestoreSelectedItemsButtonClick() {
    this.busyCount.update((v) => v + 1);

    await this.#sdToast.try(async () => {
      await this.vm().restoreSelectedItemsAsync();

      await this.vm().refreshItemsAsync();

      this.#sdToast.success("복구 되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }

  async onUploadExcelButtonClick() {
    if (!this.vm().perms().includes("edit")) return;

    const file = await this.#sdFileDialog.showAsync(
      false,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    if (!file) return;

    this.busyCount.update((v) => v + 1);

    await this.#sdToast.try(async () => {
      const wb = await SdExcelWorkbook.loadAsync(file);
      const ws = await wb.getWorksheetAsync(0);
      const wsName = await ws.getNameAsync();
      const wsdt = await ws.getDataTableAsync();

      await this.vm().uploadExcelDataTableAsync(wsName, wsdt);

      await this.vm().refreshItemsAsync();

      this.#sdToast.success("엑셀 업로드가 완료 되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }
}