import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  HostListener,
  inject,
  input,
  model,
} from "@angular/core";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { SdExcelWorkbook } from "@simplysm/sd-excel";
import { SdBusyContainerControl } from "../../../controls/busy/sd-busy-container.control";
import { SdDockContainerControl } from "../../../controls/layout/sd-dock-container.control";
import { SdDockControl } from "../../../controls/layout/sd-dock.control";
import { SdFormControl } from "../../../controls/form/sd-form.control";
import { SdFormBoxControl } from "../../../controls/form-layout/sd-form-box.control";
import { SdFormBoxItemControl } from "../../../controls/form-layout/sd-form-box-item.control";
import { SdButtonControl } from "../../../controls/button/sd-button.control";
import { SdIconControl } from "../../../controls/icon/sd-icon.control";
import { SdAngularConfigProvider } from "../../../providers/sd-angular-config.provider";
import { NgTemplateOutlet } from "@angular/common";
import { SdPaneControl } from "../../../controls/layout/sd-pane.control";
import { ISdSheetColumnOrderingVM, SdSheetControl } from "../../../controls/sheet/sd-sheet.control";
import { SdSheetColumnDirective } from "../../../controls/sheet/sd-sheet-column.directive";
import { SdAnchorControl } from "../../../controls/button/sd-anchor.control";
import { SdSheetColumnCellTemplateDirective } from "../../../controls/sheet/sd-sheet-column-cell.template-directive";
import { FormatPipe } from "../../../pipes/format.pipe";
import { SdToastProvider } from "../../../controls/toast/sd-toast.provider";
import { SdFileDialogProvider } from "../../../providers/sd-file-dialog.provider";
import { SdModalBase, SdModalProvider, TSdModalConfig } from "../../../controls/modal/sd-modal.provider";
import { SD_VIEW_MODEL_SHEET_ITEM, SdViewModelBase } from "../sd-view-model-base";
import { $computed, $effect, $signal } from "../../../utils/$hooks";
import { SdSheetViewFilterTemplateDirective } from "./sd-sheet-view-filter.template-directive";
import { SdSheetViewColumnTemplateDirective } from "./sd-sheet-view-column.template-directive";
import { SdSharedDataProvider } from "../../shared-data/sd-shared-data.provider";

/**
 * 시트 형태의 데이터를 표시하고 관리하는 기본 컴포넌트입니다.
 * 데이터 조회, 생성, 수정, 삭제 등의 CRUD 작업과 필터링, 정렬 기능을 제공합니다.
 * 
 * @features
 * - 데이터 조회 및 필터링
 * - 항목 생성/수정/삭제 
 * - 엑셀 내보내기/가져오기
 * - 컬럼 정렬 및 순서 변경
 * - 권한 기반 기능 제어
 * - 키보드 단축키 지원
 * 
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-user-list',
 *   template: `
 *     <sd-sheet-view-base>
 *       <!-- filter -->
 *       <ng-template sd-sheet-view-filter label="이름">
 *         <sd-textfield [(value)]="filter.name" label="이름"></sd-textfield>
 *       </ng-template>
 *       
 *       <!-- columns -->
 *       <ng-template sd-sheet-view-column key="name" header="이름">
 *         <div class="p-xs-sm">
 *           {{ item.name }}
 *         </div>
 *       </ng-template>
 *     </sd-sheet-view-base>
 *   `
 * })
 * export class UserListComponent extends SdSheetViewBase<UserViewModel> {
 *   protected override async getItemsAsync(): Promise<User[]> {
 *     return await this.userService.getList(this.filter);
 *   }
 * }
 * ```
 */
@Component({
  selector: "sd-sheet-view-base",
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
    SdAnchorControl,
    SdSheetColumnCellTemplateDirective,
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
              @if (viewModel().perms().includes("edit")) {
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
                    <sd-button size="sm" theme="link-warning" (click)="onRestoreSelectedItemsButtonClick()">
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
              [key]="viewModel().key + '-sheet'"
              [items]="items()"
              [(page)]="page"
              [pageLength]="pageLength()"
              [(ordering)]="ordering"
              [getItemCellStyleFn]="getItemCellStyleFn"
              [selectMode]="selectMode() ?? 'multi'"
              [autoSelect]="selectMode() === 'single' ? 'click' : undefined"
              [(selectedItems)]="selectedItems"
            >
              <sd-sheet-column fixed header="#" resizable useOrdering key="id">
                <ng-template [cell]="items()" let-item>
                  <div class="p-xs-sm">
                    @if (viewModel().perms().includes("edit")) {
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

              <sd-sheet-column [header]="['최종수정', '일시']" resizable useOrdering key="lastModifyDateTime">
                <ng-template [cell]="items()" let-item>
                  <div class="p-xs-sm tx-center">
                    {{ item.lastModifyDateTime | format: "yyyy-MM-dd HH:mm" }}
                  </div>
                </ng-template>
              </sd-sheet-column>
              <sd-sheet-column [header]="['최종수정', '직원']" resizable useOrdering key="lastModifierName">
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
export class SdSheetViewBaseControl<VM extends SdViewModelBase> {
  icons = inject(SdAngularConfigProvider).icons;

  #sdToast = inject(SdToastProvider);
  #sdFileDialog = inject(SdFileDialogProvider);
  #sdModal = inject(SdModalProvider);
  #sdSharedData = inject(SdSharedDataProvider);

  filterControls = contentChildren(SdSheetViewFilterTemplateDirective);
  columnControls = contentChildren(SdSheetViewColumnTemplateDirective);

  viewModel = input.required<VM>();

  selectMode = input<"single" | "multi">();
  selectedItems = model<VM[typeof SD_VIEW_MODEL_SHEET_ITEM][]>([]);

  items = model.required<VM[typeof SD_VIEW_MODEL_SHEET_ITEM][]>();

  filter = model.required<Record<string, any>>();
  lastFilter = $signal<Record<string, any>>({});

  detailModalConfig = input<TSdModalConfig<SdModalBase<any, boolean>>>();

  page = $signal(0);
  pageLength = $signal(0);
  ordering = $signal<ISdSheetColumnOrderingVM[]>([]);

  initialized = $signal(false);
  busyCount = $signal(0);

  isSelectedItemsHasDeleted = $computed(() => this.selectedItems().some((item) => item.isDeleted));
  isSelectedItemsHasNotDeleted = $computed(() => this.selectedItems().some((item) => !item.isDeleted));

  getItemCellStyleFn = (item: VM[typeof SD_VIEW_MODEL_SHEET_ITEM]) => (item.isDeleted
    ? "text-decoration: line-through;"
    : undefined);

  constructor() {
    $effect([], () => {
      this.lastFilter.set(ObjectUtil.clone(this.filter()));
    });

    $effect([this.page, this.lastFilter, this.ordering], async () => {
      if (!this.viewModel().perms().includes("use")) {
        this.initialized.set(true);
        return;
      }

      this.busyCount.update((v) => v + 1);
      await this.#sdToast.try(async () => {
        await this.#sdSharedData.wait();
        await this.#search();
      });
      this.busyCount.update((v) => v - 1);
      this.initialized.set(true);
    });
  }

  onFilterSubmit() {
    this.page.set(0);
    this.lastFilter.set(ObjectUtil.clone(this.filter()));
  }

  @HostListener("sdRefreshCommand")
  onRefreshButtonClick() {
    this.lastFilter.$mark();
  }

  async onDownloadExcelButtonClick() {
    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      const wb = SdExcelWorkbook.create();
      const ws = await wb.createWorksheetAsync(this.viewModel.name);

      const dataMatrix = await this.viewModel().getExcelDataMatrix(this.lastFilter(), this.ordering());

      await ws.setDataMatrixAsync(dataMatrix);

      const blob = await wb.getBlobAsync();
      blob.download(`${this.viewModel.name}.xlsx`);
    });
    this.busyCount.update((v) => v - 1);
  }

  async #search() {
    const result = await this.viewModel().search(this.lastFilter(), this.ordering(), this.page(), 50);
    this.items.set(result.items);
    this.pageLength.set(result.pageLength);

    this.selectedItems.set(this.items().filter(item => this.selectedItems().some(sel => sel.id === item.id)));
  }

  async onItemClick(item: VM[typeof SD_VIEW_MODEL_SHEET_ITEM], event: MouseEvent) {
    if (!this.viewModel().perms().includes("edit")) return;
    if (!this.detailModalConfig()) return;

    event.preventDefault();
    event.stopPropagation();

    const result = await this.#sdModal.showAsync(
      this.detailModalConfig()!.type,
      `${this.viewModel.name}수정(#${item.id})`,
      {
        itemId: item.id,
        ...this.detailModalConfig()!.params,
      },
    );
    if (!result) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.#search();
    });
    this.busyCount.update((v) => v - 1);
  }

  @HostListener("sdInsertCommand")
  async onCreateItemButtonClick() {
    if (!this.viewModel().perms().includes("edit")) return;

    const result = await this.#sdModal.showAsync(
      this.detailModalConfig()!.type,
      `${this.viewModel.name}등록`,
      {
        ...this.detailModalConfig()!.params,
      },
    );
    if (!result) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.#search();
    });
    this.busyCount.update((v) => v - 1);
  }

  async onDeleteSelectedItemsButtonClick() {
    this.busyCount.update((v) => v + 1);

    await this.#sdToast.try(async () => {
      const inputIds = this.selectedItems().map((item) => item.id);
      await this.viewModel().deletes(inputIds);

      await this.#search();

      this.#sdToast.success("삭제 되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }

  async onRestoreSelectedItemsButtonClick() {
    this.busyCount.update((v) => v + 1);

    await this.#sdToast.try(async () => {
      const inputIds = this.selectedItems().map((item) => item.id);
      await this.viewModel().restores(inputIds);

      await this.#search();

      this.#sdToast.success("복구 되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }

  async onUploadExcelButtonClick() {
    if (!this.viewModel().perms().includes("edit")) return;

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
      const wsDt = await ws.getDataTableAsync();

      await this.viewModel().uploadExcelDataTable(wsName, wsDt);

      await this.#search();

      this.#sdToast.success("엑셀 업로드가 완료 되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }
}