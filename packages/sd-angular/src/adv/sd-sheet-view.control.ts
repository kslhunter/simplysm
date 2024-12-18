import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  contentChildren,
  Directive,
  inject,
  input,
  model,
  TemplateRef,
  Type,
  ViewEncapsulation,
} from "@angular/core";
import { FormatPipe } from "../pipes/format.pipe";
import { SdAnchorControl } from "../controls/button/sd-anchor.control";
import { SdButtonControl } from "../controls/button/sd-button.control";
import { SdDockContainerControl } from "../controls/layout/sd-dock-container.control";
import { SdDockControl } from "../controls/layout/sd-dock.control";
import { SdFormBoxControl } from "../controls/form-layout/sd-form-box.control";
import { SdFormBoxItemControl } from "../controls/form-layout/sd-form-box-item.control";
import { SdFormControl } from "../controls/form/sd-form.control";
import { SdIconControl } from "../controls/icon/sd-icon.control";
import { SdPaneControl } from "../controls/layout/sd-pane.control";
import {
  SdSheetColumnCellTemplateDirective,
} from "../controls/sheet/sd-sheet-column-cell.template-directive";
import { SdSheetColumnDirective } from "../controls/sheet/sd-sheet-column.directive";
import { ISdSheetColumnOrderingVM, SdSheetControl } from "../controls/sheet/sd-sheet.control";
import { NgTemplateOutlet } from "@angular/common";
import { transformBoolean } from "../utils/tramsforms";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { SdAngularConfigProvider } from "../providers/sd-angular-config.provider";
import { $computed, $effect, $signal } from "../utils/$hooks";
import { ISdViewModel, TSdViewModelGenericTypes } from "./ISdViewModel";
import { SD_MODAL_INPUT, SdModalBase, SdModalProvider } from "../controls/modal/sd-modal.provider";
import { SdToastProvider } from "../controls/toast/sd-toast.provider";
import { SdFileDialogProvider } from "../providers/sd-file-dialog.provider";
import { SdSharedDataProvider } from "./shared-data/sd-shared-data.provider";
import { SdExcelWorkbook } from "@simplysm/sd-excel";
import { SdBusyContainerControl } from "../controls/busy/sd-busy-container.control";

@Component({
  selector: "sd-sheet-view",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
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
    SdBusyContainerControl,
  ],
  template: `
    <sd-busy-container [busy]="busyCount() > 0">
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

                <!-- filters -->
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
              @if (vm().perms().includes('edit')) {
                @if (this.detailModalType()) {
                  <sd-button size="sm" theme="link-primary" (click)="onCreateItemButtonClick()">
                    <sd-icon [icon]="icons.plusCircle" fixedWidth />
                    등록 <small>(CTRL+INSERT)</small>
                  </sd-button>
                }

                @if (!selectMode()) {
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

                <sd-button size="sm" theme="link-success" (click)="onUploadExcelButtonClick()">
                  <sd-icon [icon]="icons.upload" fixedWidth />
                  엑셀 업로드
                </sd-button>
              }

              <sd-button size="sm" theme="link-success" (click)="onDownloadExcelButtonClick()">
                <sd-icon [icon]="icons.fileExcel" fixedWidth />
                엑셀 다운로드
              </sd-button>

              <!-- buttons -->
              <ng-content />
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
                    @if (vm().perms().includes('edit') && this.detailModalType()) {
                      <sd-anchor
                        (click)="onItemClick(item, $event)"
                        class="flex-row flex-gap-sm"
                      >
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
                    [cell]="items()"
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
  styles: [
    /* language=SCSS */ `
      sd-sheet-view {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class SdSheetViewControl<VM extends ISdViewModel, TMODAL extends SdModalBase<any, boolean>> {
  icons = inject(SdAngularConfigProvider).icons;

  #sdToast = inject(SdToastProvider);
  #sdModal = inject(SdModalProvider);
  #sdFileDialog = inject(SdFileDialogProvider);
  #sdSharedData = inject(SdSharedDataProvider);

  filterControls = contentChildren(SdSheetViewFilterDirective);
  columnControls = contentChildren(SdSheetViewColumnDirective);

  vm = input.required<VM>();

  items = model.required<TSdViewModelGenericTypes<VM>["SI"][]>();

  selectedItems = model<TSdViewModelGenericTypes<VM>["SI"][]>([]);
  selectMode = input<"single" | "multi">();
  selectedItemIds = model<number[]>([]);

  initialized = model(false);
  busyCount = model(0);

  filter = model.required<TSdViewModelGenericTypes<VM>["SF"]>();
  lastFilter = $signal<TSdViewModelGenericTypes<VM>["SF"]>();

  page = model(0);
  pageLength = model(0);
  ordering = model<ISdSheetColumnOrderingVM[]>([]);

  detailModalParams = input<TMODAL[typeof SD_MODAL_INPUT]>();
  detailModalType = input<Type<TMODAL>>();

  isSelectedItemsHasDeleted = $computed(() => this.selectedItems().some((item) => item.isDeleted));
  isSelectedItemsHasNotDeleted = $computed(() => this.selectedItems()
    .some((item) => !item.isDeleted));

  getItemCellStyleFn = (item: TSdViewModelGenericTypes<VM>["SI"]) => (
    item.isDeleted ? "text-decoration: line-through;" : undefined
  );

  constructor() {
    $effect([], () => {
      this.lastFilter.set(ObjectUtil.clone(this.filter()));
    });

    $effect([this.page, this.lastFilter, this.ordering], async () => {
      if (!this.vm().perms().includes("use")) {
        this.initialized.set(true);
        return;
      }

      await this.refresh();
      this.initialized.set(true);
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

  async refresh() {
    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.#sdSharedData.wait();
      await this.#refresh();
    });
    this.busyCount.update((v) => v - 1);
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

  async #refresh() {
    const result = await this.vm().searchAsync(this.lastFilter()!, this.ordering(), this.page());
    this.items.set(result.items);
    this.pageLength.set(result.pageLength);

    this.selectedItems.set(this.items()
      .filter(item => this.selectedItems().some(sel => sel.id === item.id)));
  }

  async onCreateItemButtonClick() {
    if (!this.vm().perms().includes("edit")) return;

    await this.#editItem();
  }

  async onItemClick(item: TSdViewModelGenericTypes<VM>["SI"], event: MouseEvent) {
    if (!this.vm().perms().includes("edit")) return;

    event.preventDefault();
    event.stopPropagation();

    await this.#editItem(item.id);
  }

  async #editItem(itemId?: number) {
    if (!this.detailModalType()) return;

    const result = await this.#sdModal.showAsync(
      this.detailModalType()!,
      itemId != null ? `${this.vm().name}수정(#${itemId})` : `${this.vm().name}등록`,
      {
        itemId: itemId,
        ...this.detailModalParams(),
      },
    );
    if (!result) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.#refresh();
    });
    this.busyCount.update((v) => v - 1);
  }

  async onToggleDeletesButtonClick(del: boolean) {
    if (!this.vm().perms().includes("edit")) return;

    this.busyCount.update((v) => v + 1);

    await this.#sdToast.try(async () => {
      const inputIds = this.selectedItems().map((item) => item.id);
      await this.vm().toggleDeletesAsync(inputIds, del);

      await this.#refresh();

      this.#sdToast.success(`${del ? "삭제" : "복구"} 되었습니다.`);
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

      await this.#refresh();

      this.#sdToast.success("엑셀 업로드가 완료 되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }
}


@Directive({
  selector: "sd-sheet-view-filter",
  standalone: true,
})
export class SdSheetViewFilterDirective {
  label = input<string>();
  labelTooltip = input<string>();

  labelTemplateRef = contentChild<any, TemplateRef<void>>("label", { read: TemplateRef });
  contentTemplateRef = contentChild.required<any, TemplateRef<void>>(
    "content",
    { read: TemplateRef },
  );
}

@Directive({
  selector: "sd-sheet-view-column",
  standalone: true,
})
export class SdSheetViewColumnDirective extends SdSheetColumnDirective<any> {
  override useOrdering = input(true, { transform: transformBoolean });
  override resizable = input(true, { transform: transformBoolean });
}