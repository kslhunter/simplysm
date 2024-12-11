import { Directive, inject, input, model, output } from "@angular/core";
import { SdToastProvider } from "../../../controls/toast/sd-toast.provider";
import { SdFileDialogProvider } from "../../../providers/sd-file-dialog.provider";
import { SdModalBase, SdModalProvider, TSdModalConfig } from "../../../controls/modal/sd-modal.provider";
import { $computed, $effect, $model, $signal } from "../../../utils/$hooks";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { ISdSheetColumnOrderingVM } from "../../../controls/sheet/sd-sheet.control";
import { SdExcelWorkbook } from "@simplysm/sd-excel";
import { SD_VM_SHEET_FILTER, SD_VM_SHEET_ITEM, SdViewModelAbstract } from "../sd-view-model.abstract";

@Directive()
export abstract class SdSheetViewAbstract<VM extends SdViewModelAbstract, MODAL extends SdModalBase<{
  itemId?: number
}, boolean>> {
  #sdToast = inject(SdToastProvider);
  #sdFileDialog = inject(SdFileDialogProvider);
  #sdModal = inject(SdModalProvider);

  abstract vm: SdViewModelAbstract;

  selectMode = input<"single" | "multi">();
  selectedItems = $signal<VM[typeof SD_VM_SHEET_ITEM][]>([]);

  _selectedItemIds = input<number[]>([], { alias: "selectedItemIds" });
  _selectedItemIdsChange = output<number[]>({ alias: "selectedItemIdsChange" });
  selectedItemIds = $model(this._selectedItemIds, this._selectedItemIdsChange);

  items = $signal<VM[typeof SD_VM_SHEET_ITEM][]>([]);

  filter = $signal<VM[typeof SD_VM_SHEET_FILTER]>(this.getDefaultFilter());
  lastFilter = $signal(ObjectUtil.clone(this.filter()));

  page = $signal(0);
  pageLength = $signal(0);
  ordering = $signal<ISdSheetColumnOrderingVM[]>([]);

  initialized = model(false);
  busyCount = $signal(0);

  isSelectedItemsHasDeleted = $computed(() => this.selectedItems().some((item) => item.isDeleted));
  isSelectedItemsHasNotDeleted = $computed(() => this.selectedItems().some((item) => !item.isDeleted));

  getItemCellStyleFn = (item: VM[typeof SD_VM_SHEET_ITEM]) => (item.isDeleted
    ? "text-decoration: line-through;"
    : undefined);

  abstract getDefaultFilter(): VM[typeof SD_VM_SHEET_FILTER];

  abstract getDetailModalConfig(): TSdModalConfig<MODAL>;

  constructor() {
    $effect([this.page, this.lastFilter, this.ordering], async () => {
      if (!this.vm.perms().includes("use")) {
        this.initialized.set(true);
        return;
      }

      this.busyCount.update((v) => v + 1);
      await this.#sdToast.try(async () => {
        await this.#search();
      });
      this.busyCount.update((v) => v - 1);
      this.initialized.set(true);
    });

    $effect([this.items, this.selectedItemIds], () => {
      const newSelectedItems = this.items().filter((item) => this.selectedItemIds().includes(item.id));
      if (!ObjectUtil.equal(this.selectedItems(), newSelectedItems, { onlyOneDepth: true })) {
        this.selectedItems.set(newSelectedItems);
      }
    });
  }

  onSelectedItemsChange(selectedItems: VM[typeof SD_VM_SHEET_ITEM][]) {
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

  onRefreshButtonClick() {
    this.lastFilter.$mark();
  }

  async onDownloadExcelButtonClick() {
    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      const wb = SdExcelWorkbook.create();
      const ws = await wb.createWorksheetAsync(this.vm.name);

      const dataMatrix = await this.vm.getExcelDataMatrixAsync(this.lastFilter(), this.ordering());
      await ws.setDataMatrixAsync(dataMatrix);

      const blob = await wb.getBlobAsync();
      blob.download(`${this.vm.name}.xlsx`);
    });
    this.busyCount.update((v) => v - 1);
  }

  async #search() {
    const result = await this.vm.searchAsync(this.lastFilter(), this.ordering(), this.page());
    this.items.set(result.items);
    this.pageLength.set(result.pageLength);

    this.selectedItems.set(this.items().filter(item => this.selectedItems().some(sel => sel.id === item.id)));
  }

  async onItemClick(item: VM[typeof SD_VM_SHEET_ITEM], event: MouseEvent) {
    if (!this.vm.perms().includes("edit")) return;

    event.preventDefault();
    event.stopPropagation();

    const defaultModalConfig = this.getDetailModalConfig();

    const result = await this.#sdModal.showAsync(defaultModalConfig.type, `${this.vm.name}수정(#${item.id})`, {
      itemId: item.id,
      ...defaultModalConfig.params,
    });
    if (!result) return;

    this.busyCount.update((v) => v + 1);
    await this.#sdToast.try(async () => {
      await this.#search();
    });
    this.busyCount.update((v) => v - 1);
  }

  async onCreateItemButtonClick() {
    if (!this.vm.perms().includes("edit")) return;

    const defaultModalConfig = this.getDetailModalConfig();

    const result = await this.#sdModal.showAsync(defaultModalConfig.type, `${this.vm.name}등록`, {
      ...defaultModalConfig.params,
    });
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
      await this.vm.changeDeleteStatesAsync(inputIds, true);

      await this.#search();

      this.#sdToast.success("삭제 되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }

  async onRestoreSelectedItemsButtonClick() {
    this.busyCount.update((v) => v + 1);

    await this.#sdToast.try(async () => {
      const inputIds = this.selectedItems().map((item) => item.id);
      await this.vm.changeDeleteStatesAsync(inputIds, false);

      await this.#search();

      this.#sdToast.success("복구 되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }

  async onUploadExcelButtonClick() {
    if (!this.vm.perms().includes("edit")) return;

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

      await this.vm.uploadExcelDataTable(wsName, wsdt);

      await this.#search();

      this.#sdToast.success("엑셀 업로드가 완료 되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }
}