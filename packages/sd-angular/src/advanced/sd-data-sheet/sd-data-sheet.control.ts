import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  contentChildren,
  Directive,
  effect,
  HostListener,
  inject,
  input,
  model,
  output,
  reflectComponentType,
  Signal,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { ObjectUtils, TArrayDiffs2Result } from "@simplysm/sd-core-common";
import { SdAnchorControl } from "../../controls/sd-anchor.control";
import { SdButtonControl } from "../../controls/sd-button.control";
import { SdDockContainerControl } from "../../controls/sd-dock-container.control";
import { SdDockControl } from "../../controls/sd-dock.control";
import { SdFormBoxItemControl } from "../../controls/sd-form-box-item.control";
import { SdFormBoxControl } from "../../controls/sd-form-box.control";
import { SdFormControl } from "../../controls/sd-form.control";
import { SdPaneControl } from "../../controls/sd-pane.control";
import { SdSheetColumnCellTemplateDirective } from "../../controls/sheet/directives/sd-sheet-column-cell.template-directive";
import { SdSheetColumnDirective } from "../../controls/sheet/directives/sd-sheet-column.directive";
import { SdSheetControl } from "../../controls/sheet/sd-sheet.control";
import { SdFileDialogProvider } from "../../providers/sd-file-dialog.provider";
import { SdToastProvider } from "../../providers/sd-toast.provider";
import { $computed } from "../../utils/bindings/$computed";
import { $signal } from "../../utils/bindings/$signal";
import { ISdSortingDef } from "../../utils/managers/sd-sorting-manager";
import { setupCumulateSelectedKeys } from "../../utils/setups/setup-cumulate-selected-keys";
import { TSdViewType, useViewTypeSignal } from "../../utils/signals/use-view-type.signal";
import { SdBaseContainerControl } from "../sd-base-container.control";
import { SdSharedDataProvider } from "../shared-data/sd-shared-data.provider";
import { SdDataSheetColumnDirective } from "./sd-data-sheet-column.directive";
import { SdDataSheetFilterDirective } from "./sd-data-sheet-filter.directive";
import { SdDataSheetToolDirective } from "./sd-data-sheet-tool.directive";
import { setupCloserWhenSingleSelectionChange } from "../../utils/setups/setup-closer-when-single-selection-change";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { SdAngularConfigProvider } from "../../providers/sd-angular-config.provider";
import { ISdSelectModal, ISelectModalOutputResult } from "./sd-data-select-button.control";
import { injectParent } from "../../utils/injections/inject-parent";
import { SdRegionControl } from "../../controls/containers/sd-region";
import { FormatPipe } from "../../pipes/format.pipe";
import { setupCanDeactivate } from "../../utils/setups/setup-can-deactivate";
import { $arr } from "../../utils/bindings/wrappers/$arr";
import { TXT_CHANGE_IGNORE_CONFIRM } from "../../commons";

@Component({
  selector: "sd-data-sheet",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
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
    FaIconComponent,
    SdRegionControl,
    FormatPipe,
  ],
  template: `
    <sd-base-container
      [busy]="parent.busyCount() > 0"
      [viewType]="parent.currViewType()"
      [initialized]="parent.initialized()"
      [restricted]="parent.restricted?.()"
    >
      <ng-template #content>
        <sd-dock-container>
          @if (filterControls().length > 0) {
            <sd-dock>
              <sd-region>
                <sd-form (submit)="onFilterSubmit()">
                  <sd-form-box layout="inline" class="p-default">
                    <sd-form-box-item>
                      <sd-button type="submit" theme="info">
                        <fa-icon [icon]="icons.search" [fixedWidth]="true" />
                        조회
                      </sd-button>
                    </sd-form-box-item>
                    @for (filterControl of filterControls(); track filterControl) {
                      <sd-form-box-item [label]="filterControl.label()" [labelTooltip]="filterControl.labelTooltip()">
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
              </sd-region>
            </sd-dock>
          }

          <sd-form #formCtrl (submit)="onSubmit()">
            <sd-region contentClass="p-default">
              <sd-dock-container>
                <sd-dock class="pb-xs">
                  <div class="flex-row flex-gap-sm">
                    @if (!parent.readonly?.()) {
                      @if (parent.submit) {
                        <sd-button type="submit" size="sm" theme="primary">
                          <fa-icon [icon]="icons.save" [fixedWidth]="true" />
                          저장
                          <small>(CTRL+S)</small>
                        </sd-button>
                      }
                      @if (parent.editItem && !parent.isCreateDisabled?.()) {
                        <sd-button size="sm" theme="primary" (click)="onCreateItemButtonClick()">
                          <fa-icon [icon]="icons.add" [fixedWidth]="true" />
                          {{ insertText() }}
                          <small>(CTRL+INSERT)</small>
                        </sd-button>
                      }
                      @if (parent.addNewItem && !parent.isCreateDisabled?.()) {
                        <sd-button size="sm" theme="link-warning" (click)="onAddItemButtonClick()">
                          <fa-icon [icon]="icons.add" [fixedWidth]="true" />
                          행 추가
                          <small>(CTRL+INSERT)</small>
                        </sd-button>
                      }
                    }

                    @for (toolControl of beforeToolControls(); track toolControl) {
                      <ng-template [ngTemplateOutlet]="toolControl.contentTemplateRef()" />
                    }

                    @if (!parent.readonly?.()) {
                      @if (!parent.selectMode() && parent.toggleDeleteItems) {
                        <sd-button
                          size="sm"
                          theme="link-danger"
                          (click)="onToggleDeleteItemsButtonClick(true)"
                          [disabled]="!parent.isSelectedItemsHasNotDeleted()"
                        >
                          <fa-icon [icon]="deleteIcon()" [fixedWidth]="true" />
                          선택 {{ deleteText() }}
                        </sd-button>
                        @if (parent.isSelectedItemsHasDeleted()) {
                          <sd-button size="sm" theme="link-warning" (click)="onToggleDeleteItemsButtonClick(false)">
                            <fa-icon [icon]="restoreIcon()" [fixedWidth]="true" />
                            선택 {{ restoreText() }}
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

                    @for (toolControl of afterToolControls(); track toolControl) {
                      <ng-template [ngTemplateOutlet]="toolControl.contentTemplateRef()" />
                    }
                  </div>
                </sd-dock>

                <sd-pane>
                  <sd-sheet
                    [key]="parent.key + '-sheet'"
                    [items]="parent.items()"
                    [(currentPage)]="parent.page"
                    [totalPageCount]="parent.pageLength()"
                    [(sorts)]="parent.sortingDefs"
                    [selectMode]="parent.realSelectMode()"
                    [autoSelect]="parent.realSelectMode() === 'single' ? 'click' : undefined"
                    [(selectedItems)]="parent.selectedItems"
                    [trackByFn]="parent.trackByFn"
                    [getItemCellStyleFn]="parent.getItemCellStyleFn"
                    [getItemSelectableFn]="parent.getItemSelectableFn"
                  >
                    @if (parent.itemPropInfo?.isDeleted && !parent.readonly?.() && !parent.isDeleteDisabled?.()) {
                      <sd-sheet-column fixed [key]="parent.itemPropInfo!.isDeleted!">
                        <ng-template #header>
                          <div class="p-xs-sm tx-center">
                            <fa-icon [icon]="deleteIcon()" />
                          </div>
                        </ng-template>
                        <ng-template [cell]="parent.items()" let-item>
                          <div class="p-xs-sm tx-center">
                            <sd-anchor (click)="onToggleDeleteItemButtonClick(item)" theme="danger">
                              <fa-icon [icon]="item[parent.itemPropInfo!.isDeleted!] ? restoreIcon() : deleteIcon()" [fixedWidth]="true" />
                              {{ item[parent.itemPropInfo!.isDeleted!] ? restoreText() : deleteText() }}
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
                          [cell]="parent.items()"
                          let-item
                          let-index="index"
                          let-depth="depth"
                          let-edit="edit"
                        >
                          @if (parent.editItem && columnControl.edit() && !parent.readonly?.()) {
                            <sd-anchor class="flex-row" (click)="onEditItemButtonClick(item, index, $event)">
                              <div class="p-xs-sm pr-0">
                                <fa-icon [icon]="icons.edit" [fixedWidth]="true" />
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

                    @if (parent.itemPropInfo?.lastModifiedAt) {
                      <sd-sheet-column header="수정일시" [key]="parent.itemPropInfo!.lastModifiedAt!">
                        <ng-template [cell]="parent.items()" let-item>
                          <div class="p-xs-sm tx-center">
                            {{ item[parent.itemPropInfo!.lastModifiedAt!] | format: "yyyy-MM-dd HH:mm" }}
                          </div>
                        </ng-template>
                      </sd-sheet-column>
                    }
                    @if (parent.itemPropInfo?.lastModifiedBy) {
                      <sd-sheet-column header="수정자" [key]="parent.itemPropInfo!.lastModifiedBy!">
                        <ng-template [cell]="parent.items()" let-item>
                          <div class="p-xs-sm tx-center">
                            {{ item[parent.itemPropInfo!.lastModifiedBy!] }}
                          </div>
                        </ng-template>
                      </sd-sheet-column>
                    }
                  </sd-sheet>
                </sd-pane>
              </sd-dock-container>
            </sd-region>
          </sd-form>
        </sd-dock-container>
      </ng-template>

      @if (parent.realSelectMode()) {
        <ng-template #modalBottom>
          <div class="p-sm-default bdt bdt-trans-light flex-row flex-gap-sm" style="justify-content: right">
            @if (modalBottomTemplate()) {
              <ng-template [ngTemplateOutlet]="modalBottomTemplate()!" />
            }

            <sd-button theme="danger" inline (click)="onCancelButtonClick()">
              {{ parent.realSelectMode() === "multi" ? "모두" : "선택" }}
              해제
            </sd-button>
            @if (parent.realSelectMode() === "multi") {
              <sd-button theme="primary" inline (click)="onConfirmButtonClick()">
                확인({{ parent.selectedItemKeys().length }})
              </sd-button>
            }
          </div>
        </ng-template>
      }
    </sd-base-container>
  `,
})
export class SdDataSheetControl {
  protected readonly icons = inject(SdAngularConfigProvider).icons;

  parent = injectParent<AbsSdDataSheet<any, any, any>>();

  formCtrl = viewChild<SdFormControl>("formCtrl");

  insertText = input("등록");
  deleteText = input("삭제");
  restoreText = input("복구");
  deleteIcon = input(this.icons.eraser);
  restoreIcon = input(this.icons.redo);

  filterControls = contentChildren(SdDataSheetFilterDirective);
  toolControls = contentChildren(SdDataSheetToolDirective);
  columnControls = contentChildren(SdDataSheetColumnDirective<any>);

  modalBottomTemplate = contentChild("modalBottom", { read: TemplateRef });

  beforeToolControls = $computed(() => this.toolControls().filter((item) => item.prepend()));
  afterToolControls = $computed(() => this.toolControls().filter((item) => !item.prepend()));

  onFilterSubmit() {
    this.parent.doFilterSubmit();
  }

  @HostListener("sdRefreshCommand")
  onRefreshCommand() {
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
    if (this.parent.busyCount() > 0) return;

    this.formCtrl()?.requestSubmit();
  }

  async onSubmit() {
    await this.parent.doSubmit();
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
export abstract class AbsSdDataSheet<F extends Record<string, any>, I, K> implements ISdSelectModal {
  //-- abstract

  restricted?: Signal<boolean>; // computed (use권한)
  readonly?: Signal<boolean>; // computed (edit권한)

  isCreateDisabled?: Signal<boolean>; // computed (등록버튼 없애기)
  isDeleteDisabled?: Signal<boolean>; // computed (등록버튼 없애기)

  defaultSelectMode?: "single" | "multi" | "none";

  bindFilter?(): F;

  abstract itemKeyFn: (item: I) => K;

  itemPropInfo?: ISdDataSheetItemPropInfo<I>;

  prepareRefreshEffect?(): void;

  abstract search(
    param: ISdDataSheetSearchParam<F>,
  ): Promise<ISdDataSheetSearchResult<I>> | ISdDataSheetSearchResult<I>;

  editItem?(item?: I): Promise<boolean | undefined> | boolean | undefined;

  toggleDeleteItems?(selectedItems: I[], del: boolean): Promise<boolean>;

  addNewItem?(): Promise<I> | I;

  submit?(diffs: TArrayDiffs2Result<I>[]): Promise<boolean> | boolean;

  downloadExcel?(items: I[]): Promise<void> | void;

  uploadExcel?(file: File): Promise<void> | void;

  //-- implement
  #sdToast = inject(SdToastProvider);
  #sdSharedData = inject(SdSharedDataProvider);
  #sdFileDialog = inject(SdFileDialogProvider);

  key = reflectComponentType(this.constructor as any)?.selector;

  #viewType = useViewTypeSignal(() => this);
  viewType = input<TSdViewType>();
  currViewType = $computed(() => this.viewType() ?? this.#viewType());

  busyCount = $signal(0);
  initialized = $signal(false);
  close = output<ISelectModalOutputResult>();
  selectMode = input<"single" | "multi" | "none">();
  selectedItemKeys = model<K[]>([]);

  items = $signal<I[]>([]);
  summaryData = $signal<Partial<I>>({});

  selectedItems = $signal<I[]>([]);

  trackByFn = (item: I): K | I => this.itemKeyFn(item) ?? item;

  page = $signal(0);
  pageLength = $signal(0);
  sortingDefs = $signal<ISdSortingDef[]>([]);

  realSelectMode = $computed(() =>
    this.selectMode() ? this.selectMode() : this.toggleDeleteItems ? "multi" : this.defaultSelectMode,
  );

  //-- search

  filter = $signal<F>({} as F);
  lastFilter = $signal<F>({} as F);

  getItemSelectableFn = (item: I) => this.itemKeyFn(item) != null;

  constructor() {
    setupCumulateSelectedKeys({
      items: this.items,
      selectMode: this.realSelectMode,
      selectedItems: this.selectedItems,
      selectedItemKeys: this.selectedItemKeys,
      keySelectorFn: (item) => this.itemKeyFn(item),
    });

    setupCloserWhenSingleSelectionChange({
      selectMode: this.realSelectMode,
      selectedItemKeys: this.selectedItemKeys,
      close: this.close,
    });

    effect(() => {
      if (this.bindFilter) {
        const filter = this.bindFilter();
        this.filter.set(filter);
        this.lastFilter.set(ObjectUtils.clone(filter));
      }
    });

    effect(() => {
      this.page();
      this.lastFilter();
      this.sortingDefs();
      this.prepareRefreshEffect?.();

      queueMicrotask(async () => {
        if (this.restricted?.()) {
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

    setupCanDeactivate(() => this.currViewType() === "modal" || this.checkIgnoreChanges());
  }

  checkIgnoreChanges() {
    return $arr(this.items).diffs().length === 0 || confirm(TXT_CHANGE_IGNORE_CONFIRM);
  }

  doFilterSubmit() {
    if (this.busyCount() > 0) return;
    if (this.restricted?.()) return;
    if (!this.checkIgnoreChanges()) return;

    this.page.set(0);
    this.lastFilter.set(ObjectUtils.clone(this.filter()));
  }

  doRefresh() {
    if (this.busyCount() > 0) return;
    if (this.restricted?.()) return;
    if (!this.checkIgnoreChanges()) return;

    this.lastFilter.$mark();
  }

  async refresh() {
    const result = await this.search({
      lastFilter: this.lastFilter(),
      sortingDefs: this.sortingDefs(),
      page: this.page(),
    });
    this.items.set(result.items);
    $arr(this.items).snapshot((item) => this.itemKeyFn(item));

    this.pageLength.set(result.pageLength ?? 0);
    this.summaryData.set(result.summary ?? {});

    this.selectedItems.set(
      this.items().filter((item) => this.selectedItems().some((sel) => this.itemKeyFn(sel) === this.itemKeyFn(item))),
    );
  }

  //-- edit

  async doEditItem(item?: I) {
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
    if (!this.addNewItem) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      const newItem = await this.addNewItem!();
      this.items.update((items) => [newItem, ...items]);
    });
    this.busyCount.update((v) => v - 1);
    this.initialized.set(true);
  }

  async doSubmit() {
    if (this.busyCount() > 0) return;
    if (this.readonly?.()) return;
    if (!this.submit) return;

    const diffs = $arr(this.items).diffs();

    if (diffs.length === 0) {
      this.#sdToast.info("변경사항이 없습니다.");
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
  }

  //-- delete

  isSelectedItemsHasDeleted = $computed(() =>
    this.selectedItems().some(
      (item) => this.itemPropInfo?.isDeleted != null && (item[this.itemPropInfo.isDeleted] as boolean),
    ),
  );
  isSelectedItemsHasNotDeleted = $computed(() =>
    this.selectedItems().some(
      (item) => this.itemPropInfo?.isDeleted == null || !(item[this.itemPropInfo.isDeleted] as boolean),
    ),
  );

  getItemCellStyleFn = (item: I) =>
    this.itemPropInfo?.isDeleted != null && (item[this.itemPropInfo.isDeleted] as boolean)
      ? "text-decoration: line-through;"
      : undefined;

  async doToggleDeleteItems(del: boolean) {
    if (!this.toggleDeleteItems) return;
    if (this.readonly?.()) return;

    this.busyCount.update((v) => v + 1);

    await this.#sdToast.try(
      async () => {
        const result = await this.toggleDeleteItems!(this.selectedItems(), del);
        if (!result) return;

        await this.refresh();

        this.#sdToast.success(`${del ? "삭제" : "복구"} 되었습니다.`);
      },
      (err) => this.#getOrmDataEditToastErrorMessage(err),
    );
    this.busyCount.update((v) => v - 1);
  }

  doToggleDeleteItem(item: I) {
    if (this.itemPropInfo?.isDeleted == null) return;
    if (this.readonly?.()) return;

    if (this.itemKeyFn(item) == null) {
      this.items.update((items) => items.filter((item1) => item1 !== item));
      return;
    }

    (item[this.itemPropInfo.isDeleted] as boolean) = !(item[this.itemPropInfo.isDeleted] as boolean);
    this.items.$mark();
  }

  //-- excel

  async doDownloadExcel() {
    if (!this.downloadExcel) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      const items = (
        await this.search({
          lastFilter: this.lastFilter(),
          sortingDefs: this.sortingDefs(),
        })
      ).items;
      await this.downloadExcel!(items);
    });
    this.busyCount.update((v) => v - 1);
  }

  async doUploadExcel() {
    if (!this.uploadExcel) return;
    if (this.readonly?.()) return;

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
    this.close.emit({ selectedItemKeys: this.selectedItemKeys() });
  }

  doModalCancel() {
    this.close.emit({ selectedItemKeys: [] });
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
  isDeleted?: keyof I & string;
  lastModifiedAt?: keyof I & string;
  lastModifiedBy?: keyof I & string;
}

export interface ISdDataSheetSearchParam<F extends Record<string, any>> {
  lastFilter: F;
  sortingDefs: ISdSortingDef[];
  page?: number;
}

export interface ISdDataSheetSearchResult<I> {
  items: I[];
  pageLength?: number;
  summary?: Partial<I>;
}
