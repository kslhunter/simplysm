import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  contentChildren,
  inject,
  input,
  model,
  output,
  TemplateRef,
  Type,
  untracked,
  ViewEncapsulation,
} from "@angular/core";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { ISdSheetColumnOrderingVM, SdSheetControl } from "../controls/SdSheetControl";
import { SdSheetColumnDirective } from "../directives/SdSheetColumnDirective";
import { SdSheetColumnCellTemplateDirective } from "../directives/SdSheetColumnCellTemplateDirective";
import { SdAnchorControl } from "../controls/SdAnchorControl";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { NgTemplateOutlet } from "@angular/common";
import { Queryable } from "@simplysm/sd-orm-common";
import { $computed, $effect, $signal, TEffFn } from "../utils/$hooks";
import { SdSharedDataProvider } from "../providers/SdSharedDataProvider";
import { SdToastProvider } from "../providers/SdToastProvider";
import { SdDockContainerControl } from "../controls/SdDockContainerControl";
import { SdDockControl } from "../controls/SdDockControl";
import { SdFormControl } from "../controls/SdFormControl";
import { SdFormBoxControl } from "../controls/SdFormBoxControl";
import { SdFormBoxItemControl } from "../controls/SdFormBoxItemControl";
import { SdButtonControl } from "../controls/SdButtonControl";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { SD_MODAL_INPUT, SdModalBase, SdModalProvider } from "../providers/SdModalProvider";
import { SdFileDialogProvider } from "../providers/SdFileDialogProvider";
import { SdExcelWorkbook, TSdExcelValueType } from "@simplysm/sd-excel";
import { SdSheetViewFilterDirective } from "./SdSheetViewFilterDirective";
import { SdSheetViewColumnDirective } from "./SdSheetViewColumnDirective";
import { SdBusyContainerControl } from "../controls/SdBusyContainerControl";

@Component({
  selector: "sd-sheet-view",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdSheetControl,
    SdSheetColumnDirective,
    SdSheetColumnCellTemplateDirective,
    SdAnchorControl,
    FaIconComponent,
    NgTemplateOutlet,
    SdDockContainerControl,
    SdDockControl,
    SdFormControl,
    SdFormBoxControl,
    SdFormBoxItemControl,
    SdButtonControl,
    SdBusyContainerControl,
  ],
  template: `
    <sd-busy-container [busy]="busyCount() > 0 || !initialized()">
      @if (initialized()) {
        <sd-dock-container>
          @if (header()) {
            <sd-dock>
              <header class="page-header">{{ header() }}</header>
            </sd-dock>
          }

          <sd-dock class="pb-lg">
            <sd-form (submit)="onFilterSubmit()">
              <sd-form-box layout="inline">
                <sd-form-box-item>
                  <sd-button type="submit" theme="info">
                    <fa-icon [icon]="icons.search" [fixedWidth]="true" />
                    조회
                  </sd-button>
                </sd-form-box-item>
                @for (filterDirective of filterDirectives(); track filterDirective) {
                  <sd-form-box-item [label]="filterDirective.label()">
                    <ng-template [ngTemplateOutlet]="filterDirective.templateRef" />
                  </sd-form-box-item>
                }
              </sd-form-box>
            </sd-form>
          </sd-dock>

          <sd-dock class="pb-xs">
            <div class="flex-row flex-gap-sm">
              @if (!disabled()) {
                @if (detailModalInfo()) {
                  <sd-button size="sm" theme="link-primary" (click)="onCreateItemButtonClick()">
                    <fa-icon [icon]="icons.plusCircle" [fixedWidth]="true" />
                    등록
                  </sd-button>
                }

                @if (!selectMode()) {
                  @if (deleteItemsFn()) {
                    <sd-button
                      size="sm"
                      theme="link-danger"
                      (click)="onDeleteSelectedItemsButtonClick()"
                      [disabled]="!isSelectedItemsHasNotDeleted()"
                    >
                      <fa-icon [icon]="icons.eraser" [fixedWidth]="true" />
                      선택 삭제
                    </sd-button>
                  }
                  @if (restoreItemsFn()) {
                    @if (isSelectedItemsHasDeleted()) {
                      <sd-button size="sm" theme="link-danger" (click)="onRestoreSelectedItemsButtonClick()">
                        <fa-icon [icon]="icons.redo" [fixedWidth]="true" />
                        선택 복구
                      </sd-button>
                    }
                  }
                }
                @if (uploadExcelFn()) {
                  <sd-button size="sm" theme="link-success" (click)="onUploadExcelButtonClick()">
                    <fa-icon [icon]="icons.upload" [fixedWidth]="true" />
                    엑셀 업로드
                  </sd-button>
                }
              }

              @if (downloadExcelFn()) {
                <sd-button size="sm" theme="link-success" (click)="onDownloadExcelButtonClick()">
                  <fa-icon [icon]="icons.fileExcel" [fixedWidth]="true" />
                  엑셀 다운로드
                </sd-button>
              }

              <ng-template [ngTemplateOutlet]="toolsTemplateRef() ?? null"></ng-template>
            </div>
          </sd-dock>

          <sd-sheet
            [key]="key()"
            [items]="items()"
            [(page)]="page"
            [pageLength]="pageLength()"
            [(ordering)]="ordering"
            [getItemCellStyleFn]="getItemCellStyleFn"
            [selectMode]="selectMode() ?? 'multi'"
            [autoSelect]="selectMode() === 'single' ? 'click' : undefined"
            [(selectedItems)]="selectedItems"
            [getIsItemSelectableFn]="getIsItemSelectableFn()"
          >
            <sd-sheet-column [fixed]="true" header="#" [resizable]="true" [useOrdering]="true" key="id">
              <ng-template [cell]="items()" let-item>
                @if (!disabled() && detailModalInfo()) {
                  <div class="p-xs-sm">
                    <sd-anchor (click)="onItemEditButtonClick(item, $event)" class="flex-row flex-gap-sm">
                      <div>
                        <fa-icon [icon]="icons.edit" />
                      </div>
                      <div class="flex-grow tx-right">
                        {{ item.id }}
                      </div>
                    </sd-anchor>
                  </div>
                } @else {
                  <div class="p-xs-sm tx-right">
                    {{ item.id }}
                  </div>
                }
              </ng-template>
            </sd-sheet-column>

            @for (columnDirective of columnDirectives(); track columnDirective.key) {
              <sd-sheet-column
                [header]="columnDirective.header()"
                [resizable]="true"
                [useOrdering]="true"
                [key]="columnDirective.key()"
              >
                <ng-template [cell]="items()" let-item let-index="index" let-depth="depth" let-edit="edit">
                  <ng-template
                    [ngTemplateOutlet]="columnDirective.cellTemplateRef()"
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
          </sd-sheet>
        </sd-dock-container>
      }
    </sd-busy-container>
  `,
})
export class SdSheetViewControl<F, T extends { id: number; isDeleted?: boolean }> {
  icons = inject(SdAngularConfigProvider).icons;

  #sdToast = inject(SdToastProvider);
  #sdSharedData = inject(SdSharedDataProvider);
  #sdModal = inject(SdModalProvider);
  #sdFileDialog = inject(SdFileDialogProvider);

  key = input.required<string>();
  itemName = input.required<string>();
  header = input<string>();
  disabled = input(false);
  selectMode = input<"single" | "multi">();
  selectedItems = model<T[]>([]);

  items = model.required<T[]>();

  filter = input.required<F>();
  lastFilter = model.required();

  ordering = model.required<ISdSheetColumnOrderingVM[]>();

  searchEffFn = input.required<TEffFn<<R>(next: (qr: Queryable<any, T>) => Promise<R>) => Promise<R>>>();
  deleteItemsFn = input<(items: T[]) => Promise<void>>();
  restoreItemsFn = input<(items: T[]) => Promise<void>>();
  uploadExcelFn = input<(dt: Record<string, any>[]) => Promise<void>>();
  downloadExcelFn = input<(items: T[]) => Promise<TSdExcelValueType[][]> | TSdExcelValueType[][]>();

  detailModalInfo = input<TDetailModalInfo<T, SdModalBase<any, boolean>>>();

  getIsItemSelectableFn = input<(item: T) => boolean | string>();

  initEnd = output();

  filterDirectives = contentChildren(SdSheetViewFilterDirective);
  columnDirectives = contentChildren(SdSheetViewColumnDirective);
  toolsTemplateRef = contentChild<any, TemplateRef<void>>("toolsTemplate", { read: TemplateRef });

  page = $signal(0);
  pageLength = $signal(0);

  busyCount = $signal(0);
  initialized = $signal(false);

  isSelectedItemsHasDeleted = $computed(() => this.selectedItems().some((item) => item.isDeleted ?? false));
  isSelectedItemsHasNotDeleted = $computed(() => this.selectedItems().some((item) => !(item.isDeleted ?? false)));

  getItemCellStyleFn = (item: T) => (item.isDeleted ? "text-decoration: line-through;" : undefined);

  constructor() {
    $effect(() => {
      this.page();
      this.lastFilter();
      this.ordering();

      for (const sig of this.searchEffFn().signals) {
        sig();
      }

      void untracked(async () => {
        if (this.lastFilter() == null) {
          this.lastFilter.set(ObjectUtil.clone(this.filter()));
        }

        this.busyCount.update((v) => v + 1);
        await this.#sdToast.try(async () => {
          await this.#sdSharedData.wait();
          await this.#search();
        });
        this.busyCount.update((v) => v - 1);
        this.initialized.set(true);

        this.initEnd.emit();
      });
    });
  }

  onFilterSubmit() {
    this.page.set(0);
    this.lastFilter.set(ObjectUtil.clone(this.filter()));
  }

  async onDownloadExcelButtonClick() {
    if (!this.downloadExcelFn()) return;

    this.busyCount.update((v) => v + 1);

    await this.#sdToast.try(async () => {
      const wb = SdExcelWorkbook.create();
      const ws = await wb.createWorksheetAsync(this.itemName());

      const items = await this.searchEffFn()(async (qr) => {
        let queryable = qr;

        for (const orderingItem of this.ordering()) {
          queryable = queryable.orderBy(orderingItem.key, orderingItem.desc);
        }

        return await queryable.resultAsync();
      });
      await ws.setDataMatrixAsync(await this.downloadExcelFn()!(items));

      const blob = await wb.getBlobAsync();
      blob.download(`${this.itemName()}.xlsx`);
    });

    this.busyCount.update((v) => v - 1);
  }

  async #search() {
    const items = await this.searchEffFn()(async (qr) => {
      let queryable = qr;

      for (const orderingItem of this.ordering()) {
        queryable = queryable.orderBy(orderingItem.key, orderingItem.desc);
      }
      if (!this.ordering().some((item) => item.key === "id")) {
        queryable = queryable.orderBy((item) => item.id as any, true);
      }

      return await queryable.limit(this.page() * 50, 50).resultAsync();
    });

    const totalCount = await this.searchEffFn()(async (qr) => await qr.countAsync());

    this.items.set(items);
    this.pageLength.set(Math.ceil(totalCount / 50));
  }

  async onUploadExcelButtonClick() {
    if (!this.uploadExcelFn()) return;
    if (this.disabled()) return;

    const file = await this.#sdFileDialog.showAsync(
      false,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    if (!file) return;

    this.busyCount.update((v) => v + 1);

    await this.#sdToast.try(async () => {
      const wb = await SdExcelWorkbook.loadAsync(file);
      const ws = await wb.getWorksheetAsync(0);
      const dt = await ws.getDataTableAsync();

      await this.uploadExcelFn()!(dt);

      await this.#search();
      this.#sdToast.success("엑셀 업로드가 완료 되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }

  async onDeleteSelectedItemsButtonClick() {
    if (!this.deleteItemsFn()) return;
    if (this.disabled()) return;

    this.busyCount.update((v) => v + 1);

    await this.#sdToast.try(async () => {
      await this.deleteItemsFn()!(this.selectedItems());

      await this.#search();
      this.#sdToast.success("삭제 되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }

  async onRestoreSelectedItemsButtonClick() {
    if (!this.restoreItemsFn()) return;
    if (this.disabled()) return;

    this.busyCount.update((v) => v + 1);

    await this.#sdToast.try(async () => {
      await this.restoreItemsFn()!(this.selectedItems());

      await this.#search();
      this.#sdToast.success("복구 되었습니다.");
    });

    this.busyCount.update((v) => v - 1);
  }

  async onCreateItemButtonClick() {
    if (!this.detailModalInfo()) return;
    if (this.disabled()) return;

    const result = await this.#sdModal.showAsync(
      this.detailModalInfo()!.type,
      this.itemName() + `등록`,
      this.detailModalInfo()!.paramsFn(),
    );
    if (!result) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.#search();
    });
    this.busyCount.update((v) => v - 1);
  }

  async onItemEditButtonClick(item: T, event: MouseEvent) {
    if (!this.detailModalInfo()) return;
    if (this.disabled()) return;

    event.preventDefault();
    event.stopPropagation();

    const result = await this.#sdModal.showAsync(
      this.detailModalInfo()!.type,
      this.itemName() + `수정(#${item.id})`,
      this.detailModalInfo()!.paramsFn(item),
    );
    if (!result) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.#search();
    });
    this.busyCount.update((v) => v - 1);
  }
}

export type TDetailModalInfo<T, MT extends SdModalBase<any, boolean>> = {
  type: Type<MT>;
  paramsFn: (item?: T) => MT[typeof SD_MODAL_INPUT];
};
