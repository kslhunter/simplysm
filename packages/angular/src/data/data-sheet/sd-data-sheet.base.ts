import {
  computed,
  Directive,
  type InputSignal,
  model,
  output,
  reflectComponentType,
  signal,
  type Signal,
  TemplateRef,
  type WritableSignal,
} from "@angular/core";
import type { ArrayOneWayDiffResult } from "@simplysm/core-common";
import { mark } from "../../core/mark";
import type { SortingDef } from "../sheet/sd-sheet";
import { injectViewTypeSignal } from "../../core/routing/injectViewTypeSignal";
import { setupCumulateSelectedKeys } from "../../core/selection/setupCumulateSelectedKeys";
import { setupCloserWhenSingleSelectionChange } from "./setupCloserWhenSingleSelectionChange";
import { setupCanDeactivate } from "../../core/routing/setupCanDeactivate";
import { TXT_CHANGE_IGNORE_CONFIRM } from "../../core/commons";
import type { SdSelectModal } from "../../controls/button/sd-modal-select-button";
import type { SelectModalOutputResult } from "../../core/select-modal-output-result";
import { useDataSheetFilterManager } from "./useDataSheetFilterManager";
import { injectDataSheetRefreshManager } from "./injectDataSheetRefreshManager";
import { injectDataSheetInlineEditManager } from "./injectDataSheetInlineEditManager";
import { injectDataSheetModalEditManager } from "./injectDataSheetModalEditManager";
import { injectDataSheetExcelManager } from "./injectDataSheetExcelManager";

export type {
  SdDataSheetItemPropInfo,
  SdDataSheetItemInfo,
  SdDataSheetSearchResult,
} from "./sd-data-sheet.types";
import type {
  SdDataSheetItemPropInfo,
  SdDataSheetItemInfo,
  SdDataSheetSearchResult,
} from "./sd-data-sheet.types";

@Directive()
export abstract class SdDataSheetBase<
  TFilter extends Record<string, any>,
  TItem,
  TKey extends string | number | undefined,
> implements SdSelectModal<TItem> {
  //-- abstract
  abstract canUse: Signal<boolean>;
  abstract canEdit: Signal<boolean>;
  hideTool?: Signal<boolean>;

  abstract editMode: "inline" | "modal" | undefined;
  abstract selectMode: InputSignal<"single" | "multi" | undefined>;

  diffsExcludes?: string[];

  abstract bindFilter(): TFilter;

  abstract itemPropInfo: SdDataSheetItemPropInfo<TItem>;
  abstract getItemInfoFn: (item: TItem) => SdDataSheetItemInfo<TKey>;

  prepareRefreshEffect?(): void;

  abstract search(
    usePagination: boolean,
  ): Promise<SdDataSheetSearchResult<TItem>> | SdDataSheetSearchResult<TItem>;

  //-- optional methods (consuming code implements)
  editItem?(item?: TItem): Promise<boolean | undefined> | boolean | undefined;
  toggleDeleteItems?(del: boolean): Promise<boolean>;
  newItem?(): Promise<TItem> | TItem;
  submit?(diffs: ArrayOneWayDiffResult<TItem>[]): Promise<boolean> | boolean;
  downloadExcel?(items: TItem[]): Promise<void> | void;
  uploadExcel?(file: File): Promise<void> | void;

  //-- composable instances
  private readonly _filterMgr: ReturnType<typeof useDataSheetFilterManager<TFilter>>;
  private readonly _refreshMgr: ReturnType<typeof injectDataSheetRefreshManager<TItem, TKey>>;
  private readonly _inlineEditMgr: ReturnType<
    typeof injectDataSheetInlineEditManager<TItem, TKey>
  >;
  private readonly _modalEditMgr: ReturnType<
    typeof injectDataSheetModalEditManager<TItem, TKey>
  >;
  private readonly _excelMgr: ReturnType<typeof injectDataSheetExcelManager<TItem>>;

  //-- shared state (D1: class 소유)
  key = reflectComponentType(this.constructor as any)?.selector ?? this.constructor.name;

  viewType = injectViewTypeSignal(() => this);

  busyCount = signal(0);
  busyMessage = signal<string | undefined>(undefined);
  initialized = signal(false);
  close = output<SelectModalOutputResult<TItem>>();
  submitted = output<boolean>();
  selectedItemKeys = model<TKey[]>([]);
  actionTplRef?: TemplateRef<any>;

  autoSelect = computed<"click" | undefined>(() =>
    (!this.canEdit() || this.editMode === "modal") && this.selectMode() === "single"
      ? "click"
      : undefined,
  );

  items = signal<TItem[]>([]);
  summaryData = signal<Partial<TItem>>({});
  selectedItems = signal<TItem[]>([]);

  trackByFn = (item: TItem): TKey | TItem => this.getItemInfoFn(item).key ?? item;

  page = signal(0);
  pageLength = signal(0);
  sortingDefs = signal<SortingDef[]>([]);

  //-- filter state (composable에서 생성, 재할당)
  filter!: WritableSignal<TFilter>;
  lastFilter!: WritableSignal<TFilter>;

  //-- computed
  isSelectedItemsHasDeleted = computed(() =>
    this.selectedItems().some(
      (item) =>
        this.itemPropInfo.isDeleted != null &&
        (item[this.itemPropInfo.isDeleted] as boolean),
    ),
  );

  isSelectedItemsHasNotDeleted = computed(() =>
    this.selectedItems().some(
      (item) =>
        this.itemPropInfo.isDeleted == null ||
        !(item[this.itemPropInfo.isDeleted] as boolean),
    ),
  );

  getItemCellStyleFn = (item: TItem): string | undefined =>
    this.itemPropInfo.isDeleted != null && (item[this.itemPropInfo.isDeleted] as boolean)
      ? "text-decoration: line-through;"
      : undefined;

  getItemSelectableFn = (item: TItem): boolean => this.getItemInfoFn(item).canSelect;

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

    //-- filter composable
    this._filterMgr = useDataSheetFilterManager({
      bindFilter: () => this.bindFilter(),
      busyCount: this.busyCount,
      canUse: () => this.canUse(),
      page: this.page,
      checkIgnoreChanges: () => this.checkIgnoreChanges(),
    });
    this.filter = this._filterMgr.filter;
    this.lastFilter = this._filterMgr.lastFilter;

    //-- refresh composable
    this._refreshMgr = injectDataSheetRefreshManager({
      busyCount: this.busyCount,
      initialized: this.initialized,
      canUse: () => this.canUse(),
      items: this.items,
      selectedItems: this.selectedItems,
      pageLength: this.pageLength,
      summaryData: this.summaryData,
      page: this.page,
      lastFilter: this.lastFilter,
      sortingDefs: this.sortingDefs,
      getItemInfoFn: (item) => this.getItemInfoFn(item),
      search: (p) => this.search(p),
      prepareRefreshEffect: () => this.prepareRefreshEffect?.(),
      getDiffsExcludes: () => this.diffsExcludes,
    });

    //-- inline edit composable
    this._inlineEditMgr = injectDataSheetInlineEditManager({
      busyCount: this.busyCount,
      canEdit: () => this.canEdit(),
      items: this.items,
      submitted: this.submitted,
      itemPropInfo: () => this.itemPropInfo,
      getItemInfoFn: (item) => this.getItemInfoFn(item),
      getDiffs: () => this._refreshMgr.getDiffs(),
      refresh: () => this._refreshMgr.refresh(),
      getNewItemFn: () => this.newItem?.bind(this),
      getSubmitFn: () => this.submit?.bind(this),
      errorMessageFn: (err) => this._getOrmDataEditToastErrorMessage(err),
    });

    //-- modal edit composable
    this._modalEditMgr = injectDataSheetModalEditManager({
      busyCount: this.busyCount,
      canEdit: () => this.canEdit(),
      selectedItemKeys: this.selectedItemKeys,
      selectedItems: this.selectedItems,
      close: this.close,
      refresh: () => this._refreshMgr.refresh(),
      getEditItemFn: () => this.editItem?.bind(this),
      getToggleDeleteItemsFn: () => this.toggleDeleteItems?.bind(this),
      errorMessageFn: (err) => this._getOrmDataEditToastErrorMessage(err),
    });

    //-- excel composable
    this._excelMgr = injectDataSheetExcelManager({
      busyCount: this.busyCount,
      search: (p) => this.search(p),
      refresh: () => this._refreshMgr.refresh(),
      getDownloadExcelFn: () => this.downloadExcel?.bind(this),
      getUploadExcelFn: () => this.uploadExcel?.bind(this),
      errorMessageFn: (err) => this._getOrmDataEditToastErrorMessage(err),
    });

    setupCanDeactivate(() => this.viewType() === "modal" || this.checkIgnoreChanges());
  }

  //-- D2: class 메서드 (커스터마이징 가능)

  checkIgnoreChanges() {
    return this._refreshMgr.getDiffs().length === 0 || confirm(TXT_CHANGE_IGNORE_CONFIRM);
  }

  doFilterSubmit() {
    this._filterMgr.doFilterSubmit();
  }

  doRefresh() {
    if (this.busyCount() > 0) return;
    if (!this.canUse()) return;
    if (!this.checkIgnoreChanges()) return;

    mark(this.lastFilter);
  }

  async refresh() {
    await this._refreshMgr.refresh();
  }

  //-- inline edit (delegated to composable)

  async doAddItem() {
    await this._inlineEditMgr.doAddItem();
  }

  async doSubmit(opt?: { permCheck?: boolean; hideNoChangeMessage?: boolean }) {
    await this._inlineEditMgr.doSubmit(opt);
  }

  doToggleDeleteItem(item: TItem) {
    this._inlineEditMgr.doToggleDeleteItem(item);
  }

  //-- modal edit (delegated to composable)

  async doEditItem(item?: TItem) {
    await this._modalEditMgr.doEditItem(item);
  }

  async doToggleDeleteItems(del: boolean) {
    await this._modalEditMgr.doToggleDeleteItems(del);
  }

  doModalConfirm() {
    this._modalEditMgr.doModalConfirm();
  }

  doModalCancel() {
    this._modalEditMgr.doModalCancel();
  }

  //-- excel (delegated to composable)

  async doDownloadExcel() {
    await this._excelMgr.doDownloadExcel();
  }

  async doUploadExcel() {
    await this._excelMgr.doUploadExcel();
  }

  //-- private

  private _getOrmDataEditToastErrorMessage(err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("a parent row: a foreign key constraint") ||
      message.includes("conflicted with the REFERENCE")
    ) {
      return "경고! 연결된 작업에 의한 처리 거부. 후속작업 확인 요망";
    }
    return message;
  }
}
