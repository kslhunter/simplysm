import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  Directive,
  effect,
  HostListener,
  inject,
  input,
  model,
  OnInit,
  output,
  reflectComponentType,
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
import { SdPaneControl } from "../../controls/sd-pane.control";
import { SdSheetColumnCellTemplateDirective } from "../../controls/sd-sheet/directives/sd-sheet-column-cell.template-directive";
import { SdSheetColumnDirective } from "../../controls/sd-sheet/directives/sd-sheet-column.directive";
import { SdSheetControl } from "../../controls/sd-sheet/sd-sheet.control";
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
  ],
  template: `
    <sd-base-container
      [busy]="parent.busyCount() > 0"
      [viewType]="parent.currViewType()"
      [initialized]="parent.initialized()"
      [restricted]="parent.restricted?.()"
    >
      <ng-template #content>
        <sd-dock-container class="p-lg">
          @if (filterControls().length > 0) {
            <sd-dock class="pb-lg">
              <sd-form (submit)="onFilterSubmit()">
                <sd-form-box layout="inline">
                  <sd-form-box-item>
                    <sd-button type="submit" theme="info">
                      <fa-icon [icon]="icons.search" [fixedWidth]="true" />
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
          }

          <sd-dock class="pb-xs">
            <div class="flex-row flex-gap-sm">
              @if (parent.editItem) {
                @if (!parent.readonly?.()) {
                  <sd-button size="sm" theme="primary" (click)="onCreateItemButtonClick()">
                    <fa-icon [icon]="icons.add" [fixedWidth]="true" />
                    {{ insertText() }}
                    <small>(CTRL+INSERT)</small>
                  </sd-button>
                }
              }

              @for (toolControl of beforeToolControls(); track toolControl) {
                <ng-template [ngTemplateOutlet]="toolControl.contentTemplateRef()" />
              }

              @if (!parent.selectMode()) {
                @if (parent.toggleDeleteItems) {
                  <sd-button
                    size="sm"
                    theme="link-danger"
                    (click)="onToggleDeleteItemsButtonClick(true)"
                    [disabled]="!parent.isSelectedItemsHasNotDeleted()"
                  >
                    <fa-icon [icon]="icons.eraser" [fixedWidth]="true" />
                    선택 {{ deleteText() }}
                  </sd-button>
                  @if (parent.isSelectedItemsHasDeleted()) {
                    <sd-button
                      size="sm"
                      theme="link-warning"
                      (click)="onToggleDeleteItemsButtonClick(false)"
                    >
                      <fa-icon [icon]="icons.redo" [fixedWidth]="true" />
                      선택 복구
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
              [selectMode]="(parent.selectMode() ?? parent.toggleDeleteItems) ? 'multi' : undefined"
              [autoSelect]="parent.selectMode() === 'single' ? 'click' : undefined"
              [(selectedItems)]="parent.selectedItems"
              [trackByFn]="parent.trackByFn"
              [getItemCellStyleFn]="parent.getItemCellStyleFn"
            >
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
                      <sd-anchor
                        class="flex-row"
                        (click)="onEditItemButtonClick(item, index, $event)"
                      >
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
            </sd-sheet>
          </sd-pane>
        </sd-dock-container>
      </ng-template>

      @if (parent.selectMode()) {
        <ng-template #modalBottom>
          <div
            class="p-sm-default bdt bdt-trans-light flex-row flex-gap-sm"
            style="justify-content: right"
          >
            <sd-button theme="danger" inline (click)="onCancelButtonClick()">
              {{ parent.selectMode() === "multi" ? "모두" : "선택" }}
              해제
            </sd-button>
            @if (parent.selectMode() === "multi") {
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

  parent = injectParent();

  insertText = input("등록");
  deleteText = input("삭제");

  filterControls = contentChildren(SdDataSheetFilterDirective);
  toolControls = contentChildren(SdDataSheetToolDirective);
  columnControls = contentChildren(SdDataSheetColumnDirective<any>);

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

  //-- excel

  async onDownloadExcelButtonClick() {
    await this.parent.doDownloadExcel();
  }

  async onUploadExcelButtonClick() {
    await this.parent.doUploadExcel();
  }

  //-- modal

  async onConfirmButtonClick() {
    await this.parent.doModalConfirm();
  }

  async onCancelButtonClick() {
    await this.parent.doModalCancel();
  }
}

@Directive()
export abstract class AbsSdDataSheet<F extends Record<string, any>, I, K>
  implements ISdSelectModal, OnInit
{
  //-- abstract

  restricted?: Signal<boolean>; // computed (use권한)
  readonly?: Signal<boolean>; // computed (edit권한)
  abstract key: string;

  initFilter?(): F;

  abstract getItemInfo(item: I): ISdDataSheetItemInfo<K>;

  abstract search(param: TSdDataSheetSearchParam<F>): Promise<ISdDataSheetSearchResult<I>>;

  editItem?(item?: I): Promise<boolean | undefined>;

  toggleDeleteItems?(selectedItems: I[], del: boolean): Promise<boolean>;

  downloadExcel?(items: I[]): Promise<void>;

  uploadExcel?(file: File): Promise<void>;

  //-- implement
  #sdToast = inject(SdToastProvider);
  #sdSharedData = inject(SdSharedDataProvider);
  #sdFileDialog = inject(SdFileDialogProvider);

  #viewType = useViewTypeSignal(() => this);
  viewType = input<TSdViewType>();
  currViewType = $computed(() => this.viewType() ?? this.#viewType());

  busyCount = $signal(0);
  initialized = $signal(false);
  close = output<ISelectModalOutputResult>();
  selectMode = input<"single" | "multi">();
  selectedItemKeys = model<K[]>([]);

  items = $signal<I[]>([]);
  summaryData = $signal<Partial<I>>({});

  selectedItems = $signal<I[]>([]);

  trackByFn = (item: I): K => this.getItemInfo(item).key;

  page = $signal(0);
  pageLength = $signal(0);
  sortingDefs = $signal<ISdSortingDef[]>([]);

  //-- search

  filter = $signal<F>({} as F);
  lastFilter = $signal<F>({} as F);

  ngOnInit() {
    if (this.initFilter) {
      const filter = this.initFilter();
      this.filter.set(filter);
      this.lastFilter.set(ObjectUtils.clone(this.filter()));
    }
  }

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

    effect(() => {
      this.page();
      this.lastFilter();
      this.sortingDefs();

      const reflected = reflectComponentType(this.constructor as any)!;
      const inputPropNames = reflected.inputs.map((item) => item.propName);
      for (const inputPropName of inputPropNames) {
        if (["viewType", "selectMode, selectedItemKeys"].includes(inputPropName)) continue;
        this[inputPropName]();
      }

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
  }

  doFilterSubmit() {
    this.page.set(0);
    this.lastFilter.set(ObjectUtils.clone(this.filter()));
  }

  doRefresh() {
    if (this.busyCount() > 0) return;
    if (this.restricted?.()) return;

    this.lastFilter.$mark();
  }

  async refresh() {
    const result = await this.search({
      type: "sheet",
      lastFilter: this.lastFilter(),
      sortingDefs: this.sortingDefs(),
      page: this.page(),
    });
    this.items.set(result.items);
    this.pageLength.set(result.pageLength ?? 0);
    this.summaryData.set(result.summary ?? {});

    this.selectedItems.set(
      this.items().filter((item) =>
        this.selectedItems().some(
          (sel) => this.getItemInfo(sel).key === this.getItemInfo(item).key,
        ),
      ),
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

  //-- delete

  isSelectedItemsHasDeleted = $computed(() =>
    this.selectedItems().some((item) => this.getItemInfo(item).isDeleted),
  );
  isSelectedItemsHasNotDeleted = $computed(() =>
    this.selectedItems().some((item) => !this.getItemInfo(item).isDeleted),
  );

  getItemCellStyleFn = (item: I) =>
    this.getItemInfo(item).isDeleted ? "text-decoration: line-through;" : undefined;

  async doToggleDeleteItems(del: boolean) {
    if (!this.toggleDeleteItems) return;
    if (this.readonly?.()) return;

    this.busyCount.update((v) => v + 1);

    await this.#sdToast.try(async () => {
      const result = await this.toggleDeleteItems!(this.selectedItems(), del);
      if (!result) return;

      await this.refresh();

      this.#sdToast.success(`${del ? "삭제" : "복구"} 되었습니다.`);
    });
    this.busyCount.update((v) => v - 1);
  }

  //-- excel

  async doDownloadExcel() {
    if (!this.downloadExcel) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      const items = (
        await this.search({
          type: "excel",
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

    await this.#sdToast.try(async () => {
      await this.uploadExcel!(file);

      await this.refresh();

      this.#sdToast.success("엑셀 업로드가 완료 되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }

  doModalConfirm() {
    this.close.emit({ selectedItemKeys: this.selectedItemKeys() });
  }

  doModalCancel() {
    this.close.emit({ selectedItemKeys: [] });
  }
}

export interface ISdDataSheetItemInfo<K> {
  key: K;
  isDeleted?: boolean;
}

export type TSdDataSheetSearchParam<F extends Record<string, any>> =
  | ISdDataSheetSearchExcelParam<F>
  | ISdDataSheetSearchSheetParam<F>;

interface ISdDataSheetSearchExcelParam<F extends Record<string, any>> {
  type: "excel";
  lastFilter: F;
  sortingDefs: ISdSortingDef[];
}

interface ISdDataSheetSearchSheetParam<F extends Record<string, any>> {
  type: "sheet";
  lastFilter: F;
  sortingDefs: ISdSortingDef[];
  page: number;
}

export interface ISdDataSheetSearchResult<I> {
  items: I[];
  pageLength?: number;
  summary?: Partial<I>;
}
