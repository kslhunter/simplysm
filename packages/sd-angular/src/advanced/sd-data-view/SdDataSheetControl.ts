import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  contentChildren,
  Directive,
  HostListener,
  inject,
  input,
  InputSignal,
  model,
  output,
  reflectComponentType,
  Signal,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { ObjectUtils, TArrayDiffs2Result } from "@simplysm/sd-core-common";
import { SdButtonControl } from "../../controls/SdButtonControl";
import { SdFormControl } from "../../controls/SdFormControl";
import { SdSheetColumnCellTemplateDirective } from "../../controls/sheet/directives/SdSheetColumnCellTemplateDirective";
import { SdSheetColumnDirective } from "../../controls/sheet/directives/SdSheetColumnDirective";
import { SdSheetControl } from "../../controls/sheet/SdSheetControl";
import { SdFileDialogProvider } from "../../providers/SdFileDialogProvider";
import { SdToastProvider } from "../../providers/SdToastProvider";
import { $computed } from "../../utils/bindings/$computed";
import { $signal } from "../../utils/bindings/$signal";
import { ISdSortingDef } from "../../utils/managers/SdSortingManager";
import { setupCumulateSelectedKeys } from "../../utils/setups/setupCumulateSelectedKeys";
import { useViewTypeSignal } from "../../utils/signals/useViewTypeSignal";
import { SdBaseContainerControl } from "../SdBaseContainerControl";
import { SdSharedDataProvider } from "../shared-data/SdSharedDataProvider";
import { SdDataSheetColumnDirective } from "./SdDataSheetColumnDirective";
import { setupCloserWhenSingleSelectionChange } from "../../utils/setups/setupCloserWhenSingleSelectionChange";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { SdAngularConfigProvider } from "../../providers/SdAngularConfigProvider";
import { ISdSelectModal, ISelectModalOutputResult } from "./SdDataSelectButtonControl";
import { injectParent } from "../../utils/injections/injectParent";
import { FormatPipe } from "../../pipes/FormatPipe";
import { setupCanDeactivate } from "../../utils/setups/setupCanDeactivate";
import { $arr } from "../../utils/bindings/wrappers/$arr";
import { TXT_CHANGE_IGNORE_CONFIRM } from "../../commons";
import { $effect } from "../../utils/bindings/$effect";
import { SdAnchorControl } from "../../controls/SdAnchorControl";

@Component({
  selector: "sd-data-sheet",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdFormControl,
    SdButtonControl,
    SdSheetControl,
    SdSheetColumnDirective,
    SdSheetColumnCellTemplateDirective,
    NgTemplateOutlet,
    SdBaseContainerControl,
    FaIconComponent,
    FormatPipe,
    SdAnchorControl,
  ],
  template: `
    <sd-base-container
      [busy]="parent.busyCount() > 0"
      [busyMessage]="parent.busyMessage()"
      [viewType]="parent.viewType()"
      [initialized]="parent.initialized()"
      [restricted]="!parent.canUse()"
    >
      <ng-template #pageTopbarTpl>
        @if (parent.canEdit() && parent.submit) {
          <sd-button theme="link-primary" (click)="onSubmitButtonClick()">
            <fa-icon [icon]="icons.save" [fixedWidth]="true" />
            저장
            <small>(CTRL+S)</small>
          </sd-button>
        }
        <sd-button theme="link-info" (click)="onRefreshButtonClick()">
          <fa-icon [icon]="icons.refresh" [fixedWidth]="true" />
          새로고침
          <small>(CTRL+ALT+L)</small>
        </sd-button>

        <ng-template [ngTemplateOutlet]="pageTopbarTplRef() ?? null" />
      </ng-template>

      <ng-template #contentTpl>
        <div class="flex-column fill">
          @if (parent.canEdit() && parent.submit && parent.viewType() === "control") {
            <div class="flex-row gap-sm p-default bdb bdb-theme-grey-lightest">
              <sd-button size="sm" theme="primary" (click)="onSubmitButtonClick()">
                <fa-icon [icon]="icons.save" [fixedWidth]="true" />
                저장
                <small>(CTRL+S)</small>
              </sd-button>
              <sd-button size="sm" theme="info" (click)="onRefreshButtonClick()">
                <fa-icon [icon]="icons.refresh" [fixedWidth]="true" />
                새로고침
                <small>(CTRL+ALT+L)</small>
              </sd-button>
            </div>
          }

          <ng-template [ngTemplateOutlet]="prevTplRef() ?? null" />

          @if (filterTplRef()) {
            <div class="p-default">
              <sd-form (submit)="onFilterSubmit()">
                <div class="form-box-inline">
                  <div>
                    <sd-button type="submit" theme="info">
                      <fa-icon [icon]="icons.search" [fixedWidth]="true" />
                      조회
                    </sd-button>
                  </div>
                  <ng-template [ngTemplateOutlet]="filterTplRef()!" />
                </div>
              </sd-form>
            </div>
          }

          @if (!parent.hideTool || !parent.hideTool()) {
            @if (parent.canEdit() || beforeToolTplRef() || parent.downloadExcel) {
              <div class="flex-row gap-sm p-xs-default">
                @if (parent.canEdit()) {
                  @if (parent.editMode === "modal" && parent.editItem) {
                    <sd-button size="sm" theme="link-primary" (click)="onCreateItemButtonClick()">
                      <fa-icon [icon]="icons.add" [fixedWidth]="true" />
                      {{ insertText() ?? "등록" }}
                    </sd-button>
                  } @else if (parent.editMode === "inline" && parent.newItem) {
                    <sd-button size="sm" theme="link-primary" (click)="onAddItemButtonClick()">
                      <fa-icon [icon]="icons.add" [fixedWidth]="true" />
                      행 추가
                    </sd-button>
                  }
                }

                <ng-template [ngTemplateOutlet]="beforeToolTplRef() ?? null" />

                @if (parent.canEdit()) {
                  @if (parent.editMode === "modal" && parent.toggleDeleteItems) {
                    <sd-button
                      size="sm"
                      theme="link-danger"
                      (click)="onToggleDeleteItemsButtonClick(true)"
                      [disabled]="!parent.isSelectedItemsHasNotDeleted()"
                    >
                      <fa-icon [icon]="deleteIcon()" [fixedWidth]="true" />
                      선택 {{ deleteText() ?? "삭제" }}
                    </sd-button>
                    @if (parent.isSelectedItemsHasDeleted()) {
                      <sd-button
                        size="sm"
                        theme="link-warning"
                        (click)="onToggleDeleteItemsButtonClick(false)"
                      >
                        <fa-icon [icon]="restoreIcon()" [fixedWidth]="true" />
                        선택 {{ restoreText() ?? "복구" }}
                      </sd-button>
                    }
                  }

                  @if (parent.uploadExcel) {
                    <sd-button size="sm" theme="link-success" (click)="onUploadExcelButtonClick()">
                      <fa-icon [icon]="icons.upload" [fixedWidth]="true" />
                      엑셀 업로드
                    </sd-button>
                  }
                }

                @if (parent.downloadExcel) {
                  <sd-button size="sm" theme="link-success" (click)="onDownloadExcelButtonClick()">
                    <fa-icon [icon]="icons.fileExcel" [fixedWidth]="true" />
                    엑셀 다운로드
                  </sd-button>
                }

                <ng-template [ngTemplateOutlet]="toolTplRef() ?? null" />
              </div>
            }
          }

          <sd-form #formCtrl (submit)="onSubmit()" class="flex-fill p-default pt-0">
            <sd-sheet
              [key]="parent.key + '-sheet'"
              [items]="parent.items()"
              [(currentPage)]="parent.page"
              [totalPageCount]="parent.pageLength()"
              [(sorts)]="parent.sortingDefs"
              [selectMode]="parent.selectMode()"
              [autoSelect]="parent.autoSelect()"
              [(selectedItems)]="parent.selectedItems"
              [trackByFn]="parent.trackByFn"
              [getItemCellStyleFn]="parent.getItemCellStyleFn"
              [getItemSelectableFn]="parent.getItemSelectableFn"
            >
              @if (
                parent.editMode === "inline" && parent.canEdit() && parent.itemPropInfo.isDeleted
              ) {
                <sd-sheet-column fixed [key]="parent.itemPropInfo.isDeleted">
                  <ng-template #headerTpl>
                    <div class="p-xs-sm tx-center">
                      <fa-icon [icon]="deleteIcon()" />
                    </div>
                  </ng-template>
                  <ng-template [cell]="parent.items()" let-item>
                    <div class="p-xs-sm tx-center">
                      <sd-anchor
                        theme="danger"
                        (click)="onToggleDeleteItemButtonClick(item)"
                        [disabled]="!parent.getItemInfoFn(item).canDelete"
                      >
                        <fa-icon
                          [icon]="
                            item[parent.itemPropInfo.isDeleted] ? restoreIcon() : deleteIcon()
                          "
                          [fixedWidth]="true"
                        />
                        {{ item[parent.itemPropInfo.isDeleted] ? restoreText() : deleteText() }}
                      </sd-anchor>
                    </div>
                  </ng-template>
                </sd-sheet-column>
              }

              @for (columnControl of columnControls(); track columnControl.key()) {
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
                  @if (columnControl.headerTplRef()) {
                    <ng-template #headerTpl>
                      <ng-template [ngTemplateOutlet]="columnControl.headerTplRef()!" />
                    </ng-template>
                  }
                  @if (columnControl.summaryTplRef()) {
                    <ng-template #summaryTpl>
                      <ng-template [ngTemplateOutlet]="columnControl.summaryTplRef()!" />
                    </ng-template>
                  }

                  <ng-template
                    [cell]="parent.items()"
                    let-item
                    let-index="index"
                    let-depth="depth"
                    let-edit="edit"
                  >
                    @if (
                      parent.editMode === "modal" &&
                      parent.canEdit() &&
                      columnControl.edit() &&
                      parent.getItemInfoFn(item).canEdit
                    ) {
                      <sd-anchor
                        (click)="onEditItemButtonClick(item, index, $event)"
                        class="flex-row"
                      >
                        <div class="p-xs-sm">
                          <fa-icon [icon]="icons.edit" [fixedWidth]="true" />
                        </div>
                        <div class="flex-fill">
                          <ng-template
                            [ngTemplateOutlet]="columnControl.cellTplRef()"
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
                        [ngTemplateOutlet]="columnControl.cellTplRef()"
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

              @if (parent.itemPropInfo.lastModifiedAt) {
                <sd-sheet-column
                  header="수정일시"
                  [key]="parent.itemPropInfo.lastModifiedAt!"
                  hidden
                >
                  <ng-template [cell]="parent.items()" let-item>
                    <div class="p-xs-sm tx-center">
                      {{ item[parent.itemPropInfo.lastModifiedAt!] | format: "yyyy-MM-dd HH:mm" }}
                    </div>
                  </ng-template>
                </sd-sheet-column>
              }
              @if (parent.itemPropInfo.lastModifiedBy) {
                <sd-sheet-column header="수정자" [key]="parent.itemPropInfo.lastModifiedBy!" hidden>
                  <ng-template [cell]="parent.items()" let-item>
                    <div class="p-xs-sm tx-center">
                      {{ item[parent.itemPropInfo.lastModifiedBy!] }}
                    </div>
                  </ng-template>
                </sd-sheet-column>
              }
            </sd-sheet>
          </sd-form>
        </div>
      </ng-template>

      @if (parent.selectMode()) {
        <ng-template #modalBottomTpl>
          <div class="p-sm-default flex-row gap-sm">
            <div class="flex-fill flex-row gap-sm">
              @if (modalBottomTplRef()) {
                <ng-template [ngTemplateOutlet]="modalBottomTplRef()!" />
              }
            </div>

            <sd-button size="sm" theme="danger" (click)="onCancelButtonClick()">
              {{ parent.selectMode() === "multi" ? "모두" : "선택" }}
              해제
            </sd-button>
            @if (parent.selectMode() === "multi") {
              <sd-button size="sm" theme="primary" (click)="onConfirmButtonClick()">
                확인({{ parent.selectedItemKeys().length }})
              </sd-button>
            }
          </div>
        </ng-template>

        <ng-template #modalActionTpl>
          <sd-anchor
            theme="grey"
            class="p-sm-default"
            (click)="onRefreshButtonClick()"
            title="새로고침(CTRL+ALT+L)"
          >
            <fa-icon [icon]="icons.refresh" [fixedWidth]="true" />
          </sd-anchor>
        </ng-template>
      }
    </sd-base-container>
  `,
})
export class SdDataSheetControl {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  parent = injectParent<AbsSdDataSheet<any, any, any>>();

  formCtrl = viewChild<SdFormControl>("formCtrl");

  insertText = input<string>();
  deleteText = input<string>();
  restoreText = input<string>();
  deleteIcon = input(this.icons.eraser);
  restoreIcon = input(this.icons.redo);

  pageTopbarTplRef = contentChild("pageTopbarTpl", { read: TemplateRef });
  prevTplRef = contentChild("prevTpl", { read: TemplateRef });
  filterTplRef = contentChild("filterTpl", { read: TemplateRef });
  beforeToolTplRef = contentChild("beforeToolTpl", { read: TemplateRef });
  toolTplRef = contentChild("toolTpl", { read: TemplateRef });
  modalBottomTplRef = contentChild("modalBottomTpl", { read: TemplateRef });

  columnControls = contentChildren(SdDataSheetColumnDirective<any>);

  modalActionTplRef = viewChild("modalActionTpl", { read: TemplateRef });

  constructor() {
    $effect(() => {
      this.parent.actionTplRef = this.modalActionTplRef();
    });
  }

  onFilterSubmit() {
    this.parent.doFilterSubmit();
  }

  @HostListener("sdRefreshCommand")
  onRefreshButtonClick() {
    this.parent.doRefresh();
  }

  //-- edit

  async onCreateItemButtonClick() {
    await this.parent.doEditItem();
  }

  async onEditItemButtonClick(item: any, index: number, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    await this.parent.doEditItem(item);
  }

  async onToggleDeleteItemsButtonClick(del: boolean) {
    await this.parent.doToggleDeleteItems(del);
  }

  onToggleDeleteItemButtonClick(item: any) {
    this.parent.doToggleDeleteItem(item);
  }

  @HostListener("sdSaveCommand")
  onSubmitButtonClick() {
    this.formCtrl()?.requestSubmit();
  }

  async onSubmit() {
    await this.parent.doSubmit({ permCheck: true });
  }

  async onAddItemButtonClick() {
    await this.parent.doAddItem();
  }

  //-- excel

  async onDownloadExcelButtonClick() {
    await this.parent.doDownloadExcel();
  }

  async onUploadExcelButtonClick() {
    await this.parent.doUploadExcel();
  }

  //-- modal

  onConfirmButtonClick() {
    this.parent.doModalConfirm();
  }

  onCancelButtonClick() {
    this.parent.doModalCancel();
  }
}

@Directive()
export abstract class AbsSdDataSheet<
  TFilter extends Record<string, any>,
  TItem,
  TKey extends string | number | undefined,
> implements ISdSelectModal<TItem>
{
  //-- abstract
  abstract canUse: Signal<boolean>;
  abstract canEdit: Signal<boolean>;
  hideTool?: Signal<boolean>;

  abstract editMode: "inline" | "modal" | undefined;
  abstract selectMode: InputSignal<"single" | "multi" | undefined>;

  abstract bindFilter(): TFilter;

  abstract itemPropInfo: ISdDataSheetItemPropInfo<TItem>;
  abstract getItemInfoFn: (item: TItem) => ISdDataSheetItemInfo<TKey>;

  prepareRefreshEffect?(): void;

  abstract search(
    usePagination: boolean,
  ): Promise<ISdDataSheetSearchResult<TItem>> | ISdDataSheetSearchResult<TItem>;

  //-- modal
  // 등록/편집
  editItem?(item?: TItem): Promise<boolean | undefined> | boolean | undefined;

  // 선택삭제
  toggleDeleteItems?(del: boolean): Promise<boolean>;
  //----------

  //-- inline
  // 행추가
  newItem?(): Promise<TItem> | TItem;

  // 저장
  submit?(diffs: TArrayDiffs2Result<TItem>[]): Promise<boolean> | boolean;
  //----------

  // 엑셀다운로드
  downloadExcel?(items: TItem[]): Promise<void> | void;

  // 엑셀업로드
  uploadExcel?(file: File): Promise<void> | void;

  //-- implement
  #sdToast = inject(SdToastProvider);
  #sdSharedData = inject(SdSharedDataProvider);
  #sdFileDialog = inject(SdFileDialogProvider);

  key = reflectComponentType(this.constructor as any)?.selector;

  viewType = useViewTypeSignal(() => this);

  busyCount = $signal(0);
  busyMessage = $signal<string>();
  initialized = $signal(false);
  close = output<ISelectModalOutputResult<TItem>>();
  submitted = output<boolean>();
  selectedItemKeys = model<TKey[]>([]);
  actionTplRef?: TemplateRef<any>;

  autoSelect = $computed<"click" | undefined>(() =>
    (!this.canEdit() || this.editMode === "modal") && this.selectMode() === "single"
      ? "click"
      : undefined,
  );

  items = $signal<TItem[]>([]);
  summaryData = $signal<Partial<TItem>>({});

  selectedItems = $signal<TItem[]>([]);

  trackByFn = (item: TItem): TKey | TItem => this.getItemInfoFn(item).key ?? item;

  page = $signal(0);
  pageLength = $signal(0);
  sortingDefs = $signal<ISdSortingDef[]>([]);

  //-- search

  filter = $signal<TFilter>({} as TFilter);
  lastFilter = $signal<TFilter>({} as TFilter);

  constructor() {
    setupCumulateSelectedKeys({
      items: this.items,
      selectedItems: this.selectedItems,
      selectedItemKeys: this.selectedItemKeys,

      selectMode: () => this.selectMode(),
      keySelectorFn: (item) => this.getItemInfoFn(item).key,
    });

    setupCloserWhenSingleSelectionChange({
      selectedItemKeys: this.selectedItemKeys,
      selectedItems: this.selectedItems,

      selectMode: () => this.selectMode(),
      close: this.close,
    });

    $effect(() => {
      const filter = this.bindFilter();
      this.filter.set(filter);
      this.lastFilter.set(ObjectUtils.clone(filter));
    });

    $effect(() => {
      this.page();
      this.lastFilter();
      this.sortingDefs();
      this.prepareRefreshEffect?.();

      queueMicrotask(async () => {
        if (!this.canUse()) {
          this.initialized.set(true);
          return;
        }

        this.busyCount.update((v) => v + 1);
        await this.#sdToast.try(async () => {
          await this.#sdSharedData.wait();
          await this.refresh();
        });
        this.busyCount.update((v) => v - 1);
        this.initialized.set(true);
      });
    });

    setupCanDeactivate(() => this.viewType() === "modal" || this.checkIgnoreChanges());
  }

  checkIgnoreChanges() {
    return $arr(this.items).diffs().length === 0 || confirm(TXT_CHANGE_IGNORE_CONFIRM);
  }

  doFilterSubmit() {
    if (this.busyCount() > 0) return;
    if (!this.canUse()) return;
    if (!this.checkIgnoreChanges()) return;

    this.page.set(0);
    this.lastFilter.set(ObjectUtils.clone(this.filter()));
  }

  doRefresh() {
    if (this.busyCount() > 0) return;
    if (!this.canUse()) return;
    if (!this.checkIgnoreChanges()) return;

    this.lastFilter.$mark();
  }

  async refresh() {
    const result = await this.search(true);
    this.items.set(result.items);
    $arr(this.items).snapshot((item) => this.getItemInfoFn(item).key);

    this.pageLength.set(result.pageLength ?? 0);
    this.summaryData.set(result.summary ?? {});

    this.selectedItems.set(
      this.items().filter((item) =>
        this.selectedItems().some(
          (sel) => this.getItemInfoFn(sel).key === this.getItemInfoFn(item).key,
        ),
      ),
    );
  }

  //-- edit

  async doEditItem(item?: TItem) {
    if (!this.editItem) return;

    const result = await this.editItem(item);
    if (!result) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.refresh();
    });
    this.busyCount.update((v) => v - 1);
  }

  async doAddItem() {
    if (!this.newItem) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      const newItem = (await this.newItem!()) as TItem;
      this.items.update((items) => [newItem, ...items]);
    });
    this.busyCount.update((v) => v - 1);
  }

  async doSubmit(opt?: { permCheck?: boolean; hideNoChangeMessage?: boolean }) {
    if (this.busyCount() > 0) return;
    if (opt?.permCheck && !this.canEdit()) return;
    if (!this.submit) return;

    const diffs = $arr(this.items).diffs();

    if (diffs.length === 0) {
      if (!opt?.hideNoChangeMessage) {
        this.#sdToast.info("변경사항이 없습니다.");
      }
      return;
    }

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(
      async () => {
        const result = await this.submit!(diffs);
        if (!result) return;

        this.#sdToast.success("저장되었습니다.");

        await this.refresh();
      },
      (err) => this.#getOrmDataEditToastErrorMessage(err),
    );
    this.busyCount.update((v) => v - 1);

    this.submitted.emit(true);
  }

  //-- delete

  isSelectedItemsHasDeleted = $computed(() =>
    this.selectedItems().some(
      (item) =>
        this.itemPropInfo.isDeleted != null && (item[this.itemPropInfo.isDeleted] as boolean),
    ),
  );
  isSelectedItemsHasNotDeleted = $computed(() =>
    this.selectedItems().some(
      (item) =>
        this.itemPropInfo.isDeleted == null || !(item[this.itemPropInfo.isDeleted] as boolean),
    ),
  );

  getItemCellStyleFn = (item: TItem) =>
    this.itemPropInfo.isDeleted != null && (item[this.itemPropInfo.isDeleted] as boolean)
      ? "text-decoration: line-through;"
      : undefined;

  getItemSelectableFn = (item: TItem) => this.getItemInfoFn(item).canSelect;

  async doToggleDeleteItems(del: boolean) {
    if (!this.canEdit()) return;
    if (!this.toggleDeleteItems) return;

    this.busyCount.update((v) => v + 1);

    await this.#sdToast.try(
      async () => {
        const result = await this.toggleDeleteItems!(del);
        if (!result) return;

        await this.refresh();

        this.#sdToast.success(`${del ? "삭제" : "복구"} 되었습니다.`);
      },
      (err) => this.#getOrmDataEditToastErrorMessage(err),
    );
    this.busyCount.update((v) => v - 1);
  }

  doToggleDeleteItem(item: TItem) {
    if (!this.canEdit()) return;
    if (this.itemPropInfo.isDeleted == null) return;

    if (this.getItemInfoFn(item).key == null) {
      this.items.update((items) => items.filter((item1) => item1 !== item));
      return;
    }

    (item[this.itemPropInfo.isDeleted] as boolean) = !(item[
      this.itemPropInfo.isDeleted
    ] as boolean);
    this.items.$mark();
  }

  //-- excel

  async doDownloadExcel() {
    if (!this.downloadExcel) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      const items = (await this.search(false)).items;
      await this.downloadExcel!(items);
    });
    this.busyCount.update((v) => v - 1);
  }

  async doUploadExcel() {
    if (!this.uploadExcel) return;

    const file = await this.#sdFileDialog.showAsync(
      false,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    if (!file) return;

    this.busyCount.update((v) => v + 1);

    await this.#sdToast.try(
      async () => {
        await this.uploadExcel!(file);

        await this.refresh();

        this.#sdToast.success("엑셀 업로드가 완료 되었습니다.");
      },
      (err) => this.#getOrmDataEditToastErrorMessage(err),
    );
    this.busyCount.update((v) => v - 1);
  }

  doModalConfirm() {
    this.close.emit({
      selectedItemKeys: this.selectedItemKeys(),
      selectedItems: this.selectedItems(),
    });
  }

  doModalCancel() {
    this.close.emit({
      selectedItemKeys: [],
      selectedItems: [],
    });
  }

  #getOrmDataEditToastErrorMessage(err: Error) {
    if (
      err.message.includes("a parent row: a foreign key constraint") ||
      err.message.includes("conflicted with the REFERENCE")
    ) {
      return "경고! 연결된 작업에 의한 처리 거부. 후속작업 확인 요망";
    } else {
      return err.message;
    }
  }
}

export interface ISdDataSheetItemPropInfo<I> {
  isDeleted: (keyof I & string) | undefined;
  lastModifiedAt: (keyof I & string) | undefined;
  lastModifiedBy: (keyof I & string) | undefined;
}

export interface ISdDataSheetItemInfo<K> {
  key: K;
  canSelect: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface ISdDataSheetSearchResult<I> {
  items: I[];
  pageLength?: number;
  summary?: Partial<I>;
}
