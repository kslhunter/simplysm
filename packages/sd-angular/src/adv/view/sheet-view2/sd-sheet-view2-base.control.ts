import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  Directive,
  inject,
  input,
  model,
  output,
  TemplateRef,
} from "@angular/core";
import { SdBusyContainerControl } from "../../../controls/busy/sd-busy-container.control";
import { SdDockContainerControl } from "../../../controls/layout/sd-dock-container.control";
import { SdDockControl } from "../../../controls/layout/sd-dock.control";
import { SdFormControl } from "../../../controls/form/sd-form.control";
import { SdFormBoxControl } from "../../../controls/form-layout/sd-form-box.control";
import { SdFormBoxItemControl } from "../../../controls/form-layout/sd-form-box-item.control";
import { SdButtonControl } from "../../../controls/button/sd-button.control";
import { SdIconControl } from "../../../controls/icon/sd-icon.control";
import { NgTemplateOutlet } from "@angular/common";
import { SdPaneControl } from "../../../controls/layout/sd-pane.control";
import { ISdSheetColumnOrderingVM, SdSheetControl } from "../../../controls/sheet/sd-sheet.control";
import { SdSheetColumnDirective } from "../../../controls/sheet/sd-sheet-column.directive";
import {
  SdSheetColumnCellTemplateDirective,
} from "../../../controls/sheet/sd-sheet-column-cell.template-directive";
import { SdAnchorControl } from "../../../controls/button/sd-anchor.control";
import { FormatPipe } from "../../../pipes/format.pipe";
import { SdAngularConfigProvider } from "../../../providers/sd-angular-config.provider";
import { SdSharedDataProvider } from "../../shared-data/sd-shared-data.provider";
import { SdToastProvider } from "../../../controls/toast/sd-toast.provider";
import { SdFileDialogProvider } from "../../../providers/sd-file-dialog.provider";
import {
  SdModalBase,
  SdModalProvider,
  TSdModalConfig,
} from "../../../controls/modal/sd-modal.provider";
import { ISdViewModel, TSdViewModelGenericTypes } from "../ISdViewModel";
import { $computed, $effect, $model, $signal } from "../../../utils/$hooks";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { SdExcelWorkbook } from "@simplysm/sd-excel";

@Component({
  selector: "sd-sheet-view2-base",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    SdBusyContainerControl,
    SdDockContainerControl,
    SdDockControl,
    SdFormControl,
    SdFormBoxControl,
    SdFormBoxItemControl,
    SdButtonControl,
    SdIconControl,
    NgTemplateOutlet,
    SdPaneControl,
    SdSheetControl,
    SdSheetColumnDirective,
    SdSheetColumnCellTemplateDirective,
    SdAnchorControl,
    FormatPipe,
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

                @for (filterControl of filterControls(); track filterControl) {
                  <sd-form-box-item [label]="filterControl.label()">
                    <ng-template [ngTemplateOutlet]="filterControl.templateRef" />
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
              [items]="items()"
              [(page)]="page"
              [pageLength]="pageLength()"
              [(ordering)]="ordering"
              [getItemCellStyleFn]="getItemCellStyleFn"
              [selectMode]="selectMode() ?? 'multi'"
              [autoSelect]="selectMode() === 'single' ? 'click' : undefined"
              [(selectedItems)]="selectedItems"
              (selectedItemsChange)="onSelectedItemsChange($event)"
            >
              <sd-sheet-column fixed header="#" resizable useOrdering key="id">
                <ng-template [cell]="items()" let-item>
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

              @for (columnControl of columnControls(); track columnControl.key()) {
                <sd-sheet-column
                  [header]="columnControl.header()"
                  resizable
                  useOrdering
                  [key]="columnControl.key()"
                >
                  <ng-template [cell]="items()" let-item>
                    <ng-template
                      [ngTemplateOutlet]="columnControl.templateRef"
                      [ngTemplateOutletContext]="{ 
                        $implicit: item,
                        item: item
                      }"
                    >
                    </ng-template>
                  </ng-template>
                </sd-sheet-column>
              }

              <sd-sheet-column
                [header]="['최종수정', '일시']"
                resizable
                useOrdering
                key="lastModifyDateTime"
              >
                <ng-template [cell]="items()" let-item>
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
                <ng-template [cell]="items()" let-item>
                  <div class="p-xs-sm tx-center">
                    {{ item.lastModifierName }}
                  </div>
                </ng-template>
              </sd-sheet-column>
            </sd-sheet>
          </sd-pane>
        </sd-dock-container>
      }
    </sd-busy-container>
  `,
})
export class SdSheetView2BaseControl<VM extends ISdViewModel> {
  icons = inject(SdAngularConfigProvider).icons;

  #sdSharedData = inject(SdSharedDataProvider);
  #sdToast = inject(SdToastProvider);
  #sdFileDialog = inject(SdFileDialogProvider);
  #sdModal = inject(SdModalProvider);

  filterControls = contentChildren(SdSheetView2FilterTemplateDirective);
  columnControls = contentChildren(SdSheetView2ColumnTemplateDirective);

  vm = input.required<VM>();

  selectMode = input<"single" | "multi">();
  selectedItems = $signal<TSdViewModelGenericTypes<VM>["SI"][]>([]);

  _selectedItemIds = input<number[]>([], { alias: "selectedItemIds" });
  _selectedItemIdsChange = output<number[]>({ alias: "selectedItemIdsChange" });
  selectedItemIds = $model(this._selectedItemIds, this._selectedItemIdsChange);

  items = model<TSdViewModelGenericTypes<VM>["SI"][]>([]);
  summaryData = $signal<Partial<TSdViewModelGenericTypes<VM>["SI"]>>();

  filter = model.required<TSdViewModelGenericTypes<VM>["SF"]>();
  lastFilter = $signal<TSdViewModelGenericTypes<VM>["SF"]>();

  page = $signal(0);
  pageLength = $signal(0);
  ordering = $signal<ISdSheetColumnOrderingVM[]>([]);

  initialized = $signal(false);
  busyCount = $signal(0);

  init = output();

  isSelectedItemsHasDeleted = $computed(() => this.selectedItems().some((item) => item.isDeleted));
  isSelectedItemsHasNotDeleted = $computed(() => this.selectedItems()
    .some((item) => !item.isDeleted));

  getItemCellStyleFn = (item: TSdViewModelGenericTypes<VM>["SI"]) => (item.isDeleted
    ? "text-decoration: line-through;"
    : undefined);

  detailModalConfig = input.required<TSdModalConfig<SdModalBase<{ itemId?: number }, boolean>>>();

  constructor() {
    $effect([], () => {
      this.lastFilter.set(ObjectUtil.clone(this.filter()));
    });

    $effect([this.page, this.lastFilter, this.ordering], async () => {
      if (!this.vm().perms().includes("use")) {
        this.initialized.set(true);
        this.init.emit();
        return;
      }

      this.busyCount.update((v) => v + 1);
      await this.#sdToast.try(async () => {
        await this.#sdSharedData.wait();
        await this.search();
      });
      this.busyCount.update((v) => v - 1);
      this.initialized.set(true);
      this.init.emit();
    });

    $effect([this.items, this.selectedItemIds], () => {
      const newSelectedItems = this.items()
        .filter((item) => this.selectedItemIds().includes(item.id));
      if (!ObjectUtil.equal(this.selectedItems(), newSelectedItems, { onlyOneDepth: true })) {
        this.selectedItems.set(newSelectedItems);
      }
    });
  }

  onSelectedItemsChange(selectedItems: TSdViewModelGenericTypes<VM>["SI"][]) {
    if (this.selectMode() === "single") {
      this.selectedItemIds.set(selectedItems.map((item) => item.id));
    }
    else {
      this.selectedItemIds.update(v => {
        let r = v;
        for (const item of this.items()) {
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
    this.page.set(0);
    this.lastFilter.set(ObjectUtil.clone(this.filter()));
  }

  refresh() {
    this.lastFilter.$mark();
  }

  async onDownloadExcelButtonClick() {
    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      const wb = SdExcelWorkbook.create();
      const ws = await wb.createWorksheetAsync(this.vm().name);

      const dataMatrix = await this.vm()
        .getExcelDataMatrixAsync(this.lastFilter()!, this.ordering());
      await ws.setDataMatrixAsync(dataMatrix);

      const blob = await wb.getBlobAsync();
      blob.download(`${this.vm().name}.xlsx`);
    });
    this.busyCount.update((v) => v - 1);
  }

  async search() {
    const result = await this.vm().searchAsync(this.lastFilter()!, this.ordering(), this.page());
    this.items.set(result.items);
    this.pageLength.set(result.pageLength);
    this.summaryData.set(result.summary);

    this.selectedItems.set(this.items()
      .filter(item => this.selectedItems().some(sel => sel.id === item.id)));
  }

  async onItemClick(item: TSdViewModelGenericTypes<VM>["SI"], event: MouseEvent) {
    if (!this.vm().perms().includes("edit")) return;

    event.preventDefault();
    event.stopPropagation();

    const result = await this.#sdModal.showAsync(
      this.detailModalConfig().type,
      `${this.vm().name}수정(#${item.id})`,
      {
        itemId: item.id,
        ...this.detailModalConfig().params,
      },
    );
    if (!result) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.search();
    });
    this.busyCount.update((v) => v - 1);
  }

  async onCreateItemButtonClick() {
    await this.createItem();
  }

  async createItem() {
    if (!this.vm().perms().includes("edit")) return;

    const result = await this.#sdModal.showAsync(
      this.detailModalConfig().type,
      `${this.vm().name}등록`,
      {
        ...this.detailModalConfig().params,
      },
    );
    if (!result) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.search();
    });
    this.busyCount.update((v) => v - 1);
  }

  async onDeleteSelectedItemsButtonClick() {
    this.busyCount.update((v) => v + 1);

    await this.#sdToast.try(async () => {
      const inputIds = this.selectedItems().map((item) => item.id);
      await this.vm().changeDeleteStatesAsync(inputIds, true);

      await this.search();

      this.#sdToast.success("삭제 되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }

  async onRestoreSelectedItemsButtonClick() {
    this.busyCount.update((v) => v + 1);

    await this.#sdToast.try(async () => {
      const inputIds = this.selectedItems().map((item) => item.id);
      await this.vm().changeDeleteStatesAsync(inputIds, false);

      await this.search();

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

      await this.vm().uploadExcelDataTable(wsName, wsdt);

      await this.search();

      this.#sdToast.success("엑셀 업로드가 완료 되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }
}

@Directive({
  selector: "ng-template[sd-sheet-view2-column]",
  standalone: true,
})
export class SdSheetView2ColumnTemplateDirective {
  templateRef = inject(TemplateRef);

  key = input.required<string>();
  header = input<string | string[]>();
}

@Directive({
  selector: "ng-template[sd-sheet-view2-filter]",
  standalone: true,
})
export class SdSheetView2FilterTemplateDirective {
  templateRef = inject(TemplateRef);

  label = input<string>();
}