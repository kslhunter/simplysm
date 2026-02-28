import {
  children,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  type JSX,
  onCleanup,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { createStore, produce, reconcile } from "solid-js/store";
import { createControllableStore } from "../../../hooks/createControllableStore";
import type { DateTime } from "@simplysm/core-common";
import { objClone, objGetChainValue } from "@simplysm/core-common";
import "@simplysm/core-common"; // register extensions
import type { SortingDef } from "../../data/sheet/types";
import { DataSheet } from "../../data/sheet/DataSheet";
import { DataSheetColumn } from "../../data/sheet/DataSheetColumn";
import { BusyContainer } from "../../feedback/busy/BusyContainer";
import { useNotification } from "../../feedback/notification/NotificationContext";
import { useI18nOptional } from "../../../providers/i18n/I18nContext";
import { Button } from "../../form-control/Button";
import { Icon } from "../../display/Icon";
import { FormGroup } from "../../layout/FormGroup";
import { createTopbarActions, TopbarContext } from "../../layout/topbar/TopbarContext";
import { useDialogInstance } from "../../disclosure/DialogInstanceContext";
import { Dialog } from "../../disclosure/Dialog";
import { Link } from "../../display/Link";
import { createEventListener } from "@solid-primitives/event-listener";
import { useBeforeLeave } from "@solidjs/router";
import clsx from "clsx";
import {
  IconDeviceFloppy,
  IconExternalLink,
  IconFileExcel,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconTrashOff,
  IconUpload,
} from "@tabler/icons-solidjs";
import { registerCrud, unregisterCrud, activateCrud, isActiveCrud } from "../crudRegistry";
import { CrudSheetColumn, isCrudSheetColumnDef } from "./CrudSheetColumn";
import { CrudSheetFilter, isCrudSheetFilterDef } from "./CrudSheetFilter";
import { CrudSheetTools, isCrudSheetToolsDef } from "./CrudSheetTools";
import { CrudSheetHeader, isCrudSheetHeaderDef } from "./CrudSheetHeader";
import type {
  CrudSheetColumnDef,
  CrudSheetContext,
  CrudSheetFilterDef,
  CrudSheetHeaderDef,
  CrudSheetProps,
  CrudSheetToolsDef,
  SearchResult,
} from "./types";

interface CrudSheetComponent {
  <TItem, TFilter extends Record<string, any>>(props: CrudSheetProps<TItem, TFilter>): JSX.Element;
  Column: typeof CrudSheetColumn;
  Filter: typeof CrudSheetFilter;
  Tools: typeof CrudSheetTools;
  Header: typeof CrudSheetHeader;
}

const CrudSheetBase = <TItem, TFilter extends Record<string, any>>(
  props: CrudSheetProps<TItem, TFilter>,
) => {
  const [local] = splitProps(props, [
    "search",
    "getItemKey",
    "persistKey",
    "editable",
    "itemEditable",
    "itemDeletable",
    "itemDeleted",
    "isItemSelectable",
    "lastModifiedAtProp",
    "lastModifiedByProp",
    "onSubmitted",
    "filterInitial",
    "items",
    "onItemsChange",
    "inlineEdit",
    "modalEdit",
    "excel",
    "selectMode",
    "onSelect",
    "hideAutoTools",
    "class",
    "children",
  ]);

  const noti = useNotification();
  const i18n = useI18nOptional();
  const topbarCtx = useContext(TopbarContext);
  const dialogInstance = useDialogInstance();
  const isModal = dialogInstance !== undefined;
  const isSelectMode = () => local.selectMode != null;
  const canEdit = () => (isSelectMode() ? false : (local.editable ?? true));

  // -- Children Resolution --
  const resolved = children(() => local.children);
  const defs = createMemo(() => {
    const arr = resolved.toArray();
    return {
      filter: arr.find(isCrudSheetFilterDef) as CrudSheetFilterDef<TFilter> | undefined,
      columns: arr.filter(isCrudSheetColumnDef) as unknown as CrudSheetColumnDef<TItem>[],
      tools: arr.find(isCrudSheetToolsDef) as CrudSheetToolsDef<TItem> | undefined,
      header: arr.find(isCrudSheetHeaderDef) as CrudSheetHeaderDef | undefined,
    };
  });

  // -- State --
  const [items, setItems] = createControllableStore<TItem[]>({
    value: () => local.items ?? [],
    onChange: () => local.onItemsChange,
  });
  let originalItems: TItem[] = [];

  // eslint-disable-next-line solid/reactivity -- filterInitial is used only for initial value
  const [filter, setFilter] = createStore<TFilter>((local.filterInitial ?? {}) as TFilter);
  const [lastFilter, setLastFilter] = createSignal<TFilter>(objClone(filter));

  const [page, setPage] = createSignal(1);
  const [totalPageCount, setTotalPageCount] = createSignal(0);
  const [sorts, setSorts] = createSignal<SortingDef[]>([]);

  const [busyCount, setBusyCount] = createSignal(0);
  const [ready, setReady] = createSignal(false);

  const [selectedItems, setSelectedItems] = createSignal<TItem[]>([]);
  const [selectedKeys, setSelectedKeys] = createSignal<Set<string | number>>(new Set());

  let formRef: HTMLFormElement | undefined;

  const crudId = createUniqueId();
  onCleanup(() => unregisterCrud(crudId));
  createEventListener(() => formRef, "pointerdown", () => activateCrud(crudId));
  createEventListener(() => formRef, "focusin", () => activateCrud(crudId));

  createEffect(() => {
    void doRefresh();
  });

  // -- Key-based selection: restore selectedItems when items change --
  createEffect(() => {
    const currentItems = items as unknown as TItem[];
    const keys = selectedKeys();
    if (keys.size === 0) {
      if (selectedItems().length > 0) {
        setSelectedItems([]);
      }
      return;
    }
    const restored = currentItems.filter((item) => {
      const key = local.getItemKey(item);
      return key != null && keys.has(key);
    });
    setSelectedItems(restored);
  });

  async function doRefresh() {
    setBusyCount((c) => c + 1);
    try {
      await refresh();
    } catch (err) {
      noti.error(err, i18n?.t("crudSheet.lookupFailed") ?? "Lookup failed");
    }
    setBusyCount((c) => c - 1);
    setReady(true);
  }

  async function refresh() {
    const result: SearchResult<TItem> = await local.search(lastFilter(), page(), sorts());
    setItems(reconcile(result.items));
    originalItems = objClone(result.items);
    setTotalPageCount(result.pageCount ?? 0);
  }

  /* eslint-disable solid/reactivity -- called only in event handlers, immediate store read */
  function getItemDiffs() {
    return items.oneWayDiffs(originalItems, (item) => local.getItemKey(item), {
      excludes: local.inlineEdit?.diffsExcludes,
    });
  }
  /* eslint-enable solid/reactivity */

  function checkIgnoreChanges(): boolean {
    if (!local.inlineEdit) return true;
    if (getItemDiffs().length === 0) return true;
    return confirm(i18n?.t("crudSheet.discardChanges") ?? "You have unsaved changes. Discard them?");
  }

  // -- Filter --
  function handleFilterSubmit(e: Event) {
    e.preventDefault();
    if (!checkIgnoreChanges()) return;
    setPage(1);
    setLastFilter(() => objClone(filter));
  }

  async function handleRefresh() {
    if (!checkIgnoreChanges()) return;
    await doRefresh();
  }

  // -- Inline Edit --
  function handleAddRow() {
    if (!local.inlineEdit) return;
    setItems(
      produce((draft) => {
        draft.unshift(local.inlineEdit!.newItem());
      }),
    );
  }

  function handleToggleDelete(item: TItem, index: number) {
    if (!(local.itemDeletable?.(item) ?? true)) return;
    if (local.inlineEdit?.deleteProp == null) return;
    const dp = local.inlineEdit.deleteProp;

    if (local.getItemKey(item) == null) {
      setItems(
        produce((draft) => {
          draft.splice(index, 1);
        }),
      );
      return;
    }

    setItems(index as any, dp as any, !(item[dp] as boolean) as any);
  }

  async function handleSave() {
    if (busyCount() > 0) return;
    if (!canEdit()) return;
    if (!local.inlineEdit) return;

    const diffs = getItemDiffs();

    if (diffs.length === 0) {
      noti.info(i18n?.t("crudSheet.notice") ?? "Notice", i18n?.t("crudSheet.noChanges") ?? "No changes to save.");
      return;
    }

    setBusyCount((c) => c + 1);
    try {
      await local.inlineEdit.submit(diffs);
      noti.success(i18n?.t("crudSheet.saveCompleted") ?? "Save completed", i18n?.t("crudSheet.saveSuccess") ?? "Saved successfully.");
      await refresh();
      local.onSubmitted?.();
    } catch (err) {
      noti.error(err, i18n?.t("crudSheet.saveFailed") ?? "Save failed");
    }
    setBusyCount((c) => c - 1);
  }

  async function handleFormSubmit(e: Event) {
    e.preventDefault();
    await handleSave();
  }

  // -- Modal Edit --
  async function handleEditItem(item?: TItem) {
    if (!local.modalEdit) return;
    const result = await local.modalEdit.editItem(item);
    if (!result) return;

    setBusyCount((c) => c + 1);
    try {
      await refresh();
    } catch (err) {
      noti.error(err, i18n?.t("crudSheet.lookupFailed") ?? "Lookup failed");
    }
    setBusyCount((c) => c - 1);
  }

  async function handleDeleteItems() {
    if (!local.modalEdit?.deleteItems) return;
    const result = await local.modalEdit.deleteItems(selectedItems());
    if (!result) return;

    setBusyCount((c) => c + 1);
    try {
      await refresh();
      noti.success(i18n?.t("crudSheet.deleteCompleted") ?? "Delete completed", i18n?.t("crudSheet.deleteSuccess") ?? "Deleted successfully.");
    } catch (err) {
      noti.error(err, i18n?.t("crudSheet.deleteFailed") ?? "Delete failed");
    }
    setBusyCount((c) => c - 1);
  }

  async function handleRestoreItems() {
    if (!local.modalEdit?.restoreItems) return;
    const result = await local.modalEdit.restoreItems(selectedItems());
    if (!result) return;

    setBusyCount((c) => c + 1);
    try {
      await refresh();
      noti.success(i18n?.t("crudSheet.restoreCompleted") ?? "Restore completed", i18n?.t("crudSheet.restoreSuccess") ?? "Restored successfully.");
    } catch (err) {
      noti.error(err, i18n?.t("crudSheet.restoreFailed") ?? "Restore failed");
    }
    setBusyCount((c) => c - 1);
  }

  // -- Excel --
  async function handleExcelDownload() {
    if (!local.excel) return;

    setBusyCount((c) => c + 1);
    try {
      const result = await local.search(lastFilter(), undefined, sorts());
      await local.excel.download(result.items);
    } catch (err) {
      noti.error(err, i18n?.t("crudSheet.excelDownloadFailed") ?? "Excel download failed");
    }
    setBusyCount((c) => c - 1);
  }

  function handleExcelUpload() {
    if (!local.excel?.upload) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file == null) return;

      setBusyCount((c) => c + 1);
      try {
        await local.excel!.upload!(file);
        noti.success(i18n?.t("crudSheet.excelCompleted") ?? "Completed", i18n?.t("crudSheet.excelUploadSuccess") ?? "Excel upload completed successfully.");
        await refresh();
      } catch (err) {
        noti.error(err, i18n?.t("crudSheet.excelUploadFailed") ?? "Excel upload failed");
      }
      setBusyCount((c) => c - 1);
    };
    input.click();
  }

  // -- Select Mode --
  function handleSelectedItemsChange(newSelectedItems: TItem[]) {
    // Current page items key Set
    const currentItems = items as unknown as TItem[];
    const currentKeys = new Set<string | number>();
    for (const item of currentItems) {
      const key = local.getItemKey(item);
      if (key != null) currentKeys.add(key);
    }

    // Newly selected items key
    const newSelectedKeys = new Set<string | number>();
    for (const item of newSelectedItems) {
      const key = local.getItemKey(item);
      if (key != null) newSelectedKeys.add(key);
    }

    // Preserve other page keys + update current page keys
    const merged = new Set<string | number>();
    for (const key of selectedKeys()) {
      if (!currentKeys.has(key)) {
        merged.add(key); // Preserve other page keys
      }
    }
    for (const key of newSelectedKeys) {
      merged.add(key); // Add current page selection
    }

    setSelectedKeys(merged);
    setSelectedItems(newSelectedItems);
  }

  function clearSelection() {
    setSelectedKeys(new Set<string | number>());
    setSelectedItems([]);
  }

  function handleSelectConfirm() {
    local.onSelect?.({
      items: selectedItems(),
      keys: [...selectedKeys()],
    });
  }

  function handleSelectCancel() {
    clearSelection();
    local.onSelect?.({ items: [], keys: [] });
  }

  // -- Keyboard Shortcuts --
  createEventListener(document, "keydown", async (e: KeyboardEvent) => {
    if (!isActiveCrud(crudId)) return;
    if (e.ctrlKey && e.key === "s" && !isSelectMode()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      formRef?.requestSubmit();
    }
    if (e.ctrlKey && e.altKey && e.key === "l") {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!checkIgnoreChanges()) return;
      await doRefresh();
    }
  });

  // -- Route Leave Guard --
  // eslint-disable-next-line solid/reactivity -- inlineEdit is used only for initial value
  if (!isModal && local.inlineEdit) {
    try {
      useBeforeLeave((e) => {
        if (!checkIgnoreChanges()) {
          e.preventDefault();
        }
      });
    } catch {
      // Skip if no Router context
    }
  }

  // -- Topbar Actions --
  if (topbarCtx) {
    createTopbarActions(() => (
      <>
        <Show when={canEdit() && local.inlineEdit}>
          <Button
            size="lg"
            variant="ghost"
            theme="primary"
            onClick={() => formRef?.requestSubmit()}
          >
            <Icon icon={IconDeviceFloppy} class="mr-1" />
            {i18n?.t("crudSheet.save") ?? "Save"}
          </Button>
        </Show>
        <Button size="lg" variant="ghost" theme="info" onClick={handleRefresh}>
          <Icon icon={IconRefresh} class="mr-1" />
          {i18n?.t("crudSheet.refresh") ?? "Refresh"}
        </Button>
      </>
    ));
  }

  // -- Context for Tools --
  const ctx: CrudSheetContext<TItem> = {
    items: () => items as unknown as TItem[],
    selectedItems,
    page,
    sorts,
    busy: () => busyCount() > 0,
    hasChanges: () => {
      if (!local.inlineEdit) return false;
      return getItemDiffs().length > 0;
    },
    save: handleSave,
    refresh: async () => {
      await doRefresh();
    },
    addItem: handleAddRow,
    setPage,
    setSorts,
    clearSelection,
  };

  // -- Render --
  const deleteProp = () => local.inlineEdit?.deleteProp;
  const isItemDeleted = (item: TItem) => local.itemDeleted?.(item) ?? false;

  return (
    <>
      {/* Modal mode: Dialog.Action (refresh button in header) */}
      <Show when={isModal}>
        <Dialog.Action>
          <button
            class="flex items-center px-2 text-base-400 hover:text-base-600"
            onClick={handleRefresh}
          >
            <Icon icon={IconRefresh} />
          </button>
        </Dialog.Action>
      </Show>

      <BusyContainer
        ready={ready()}
        busy={busyCount() > 0}
        class={clsx("flex h-full flex-col", local.class)}
      >
        {/* Control mode: inline save/refresh bar */}
        <Show when={!isModal && !topbarCtx}>
          <div class="flex gap-2 p-2 pb-0">
            <Show when={canEdit() && local.inlineEdit}>
              <Button
                size="sm"
                theme="primary"
                variant="ghost"
                onClick={() => formRef?.requestSubmit()}
              >
                <Icon icon={IconDeviceFloppy} class="mr-1" />
                {i18n?.t("crudSheet.save") ?? "Save"}
              </Button>
            </Show>
            <Button size="sm" theme="info" variant="ghost" onClick={handleRefresh}>
              <Icon icon={IconRefresh} class="mr-1" />
              {i18n?.t("crudSheet.refresh") ?? "Refresh"}
            </Button>
          </div>
        </Show>

        {/* Header (optional) */}
        <Show when={defs().header}>{(headerDef) => headerDef().children}</Show>

        {/* Filter */}
        <Show when={defs().filter}>
          {(filterDef) => (
            <form class="p-2" onSubmit={handleFilterSubmit}>
              <FormGroup inline>
                <FormGroup.Item>
                  <Button type="submit" theme="info" variant="solid">
                    <Icon icon={IconSearch} class="mr-1" />
                    {i18n?.t("crudSheet.search") ?? "Search"}
                  </Button>
                </FormGroup.Item>
                {filterDef().children(filter, setFilter)}
              </FormGroup>
            </form>
          )}
        </Show>

        {/* Toolbar */}
        <Show when={!isSelectMode()}>
          <div class="flex gap-2 p-2 pb-0">
            <Show when={!local.hideAutoTools}>
              {/* Inline edit buttons */}
              <Show when={canEdit() && local.inlineEdit}>
                <Button size="sm" theme="primary" variant="ghost" onClick={handleAddRow}>
                  <Icon icon={IconPlus} class="mr-1" />{i18n?.t("crudSheet.addRow") ?? "Add Row"}
                </Button>
              </Show>

              {/* Modal edit buttons */}
              <Show when={canEdit() && local.modalEdit}>
                <Button
                  size="sm"
                  theme="primary"
                  variant="ghost"
                  onClick={() => void handleEditItem()}
                >
                  <Icon icon={IconPlus} class="mr-1" />
                  {i18n?.t("crudSheet.register") ?? "Register"}
                </Button>
              </Show>
              <Show when={canEdit() && local.modalEdit?.deleteItems}>
                <Button
                  size="sm"
                  theme="danger"
                  variant="ghost"
                  onClick={handleDeleteItems}
                  disabled={
                    selectedItems().length === 0 ||
                    !selectedItems().some(
                      (item) =>
                        (local.itemDeletable?.(item) ?? true) &&
                        !(local.itemDeleted?.(item) ?? false),
                    )
                  }
                >
                  <Icon icon={IconTrash} class="mr-1" />
                  {i18n?.t("crudSheet.deleteSelected") ?? "Delete Selected"}
                </Button>
              </Show>
              <Show when={canEdit() && local.modalEdit?.restoreItems}>
                <Button
                  size="sm"
                  theme="warning"
                  variant="ghost"
                  onClick={handleRestoreItems}
                  disabled={
                    selectedItems().length === 0 ||
                    !selectedItems().some((item) => local.itemDeleted?.(item) ?? false)
                  }
                >
                  <Icon icon={IconTrashOff} class="mr-1" />
                  {i18n?.t("crudSheet.restoreSelected") ?? "Restore Selected"}
                </Button>
              </Show>

              {/* Excel buttons */}
              <Show when={canEdit() && local.excel?.upload}>
                <Button size="sm" theme="success" variant="ghost" onClick={handleExcelUpload}>
                  <Icon icon={IconUpload} class="mr-1" />
                  {i18n?.t("crudSheet.excelUpload") ?? "Excel Upload"}
                </Button>
              </Show>
              <Show when={local.excel}>
                <Button size="sm" theme="success" variant="ghost" onClick={handleExcelDownload}>
                  <Icon icon={IconFileExcel} class="mr-1" />
                  {i18n?.t("crudSheet.excelDownload") ?? "Excel Download"}
                </Button>
              </Show>
            </Show>

            {/* Custom tools */}
            <Show when={defs().tools}>{(toolsDef) => toolsDef().children(ctx)}</Show>
          </div>
        </Show>

        {/* DataSheet */}
        <form ref={(el) => { formRef = el; registerCrud(crudId, el); }} class="flex-1 overflow-hidden p-2 pt-1" onSubmit={handleFormSubmit}>
          <DataSheet
            class="h-full"
            items={items}
            persistKey={local.persistKey != null ? `${local.persistKey}-sheet` : undefined}
            page={totalPageCount() > 0 ? page() : undefined}
            onPageChange={setPage}
            totalPageCount={totalPageCount()}
            sorts={sorts()}
            onSortsChange={setSorts}
            isItemSelectable={local.isItemSelectable}
            selectMode={
              isSelectMode()
                ? local.selectMode
                : local.modalEdit?.deleteItems != null || local.modalEdit?.restoreItems != null
                  ? "multiple"
                  : undefined
            }
            selectedItems={selectedItems()}
            onSelectedItemsChange={handleSelectedItemsChange}
            autoSelect={isSelectMode() && local.selectMode === "single" ? "click" : undefined}
            cellClass={(item) => {
              if (isItemDeleted(item)) {
                return "line-through";
              }
              return undefined;
            }}
          >
            {/* Auto delete column (inline edit only) */}
            <Show when={deleteProp() != null && canEdit()}>
              <DataSheetColumn<TItem>
                key="__delete"
                header=""
                fixed
                sortable={false}
                resizable={false}
              >
                {(dsCtx) => (
                  <div class="flex items-center justify-center px-1 py-0.5">
                    <Link
                      theme="danger"
                      disabled={!(local.itemDeletable?.(dsCtx.item) ?? true)}
                      onClick={() => handleToggleDelete(dsCtx.item, dsCtx.index)}
                    >
                      <Icon icon={isItemDeleted(dsCtx.item) ? IconTrashOff : IconTrash} />
                    </Link>
                  </div>
                )}
              </DataSheetColumn>
            </Show>

            {/* User-defined columns -- map CrudSheetColumn to DataSheetColumn */}
            <For each={defs().columns}>
              {(col) => (
                <DataSheetColumn<TItem>
                  key={col.key}
                  header={col.header}
                  headerContent={col.headerContent}
                  headerStyle={col.headerStyle}
                  summary={col.summary}
                  tooltip={col.tooltip}
                  fixed={col.fixed}
                  hidden={col.hidden}
                  collapse={col.collapse}
                  width={col.width}
                  class={col.class}
                  sortable={col.sortable}
                  resizable={col.resizable}
                >
                  {(dsCtx) => {
                    const crudCtx = {
                      ...dsCtx,
                      setItem: <TKey extends keyof TItem>(key: TKey, value: TItem[TKey]) => {
                        setItems(dsCtx.index as any, key as any, value as any);
                      },
                    };

                    // modalEdit editable column -- wrap with edit link
                    if (
                      local.modalEdit &&
                      col.editTrigger &&
                      canEdit() &&
                      (local.itemEditable?.(dsCtx.item) ?? true)
                    ) {
                      return (
                        <Link
                          class={clsx("flex", "gap-1")}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleEditItem(dsCtx.item);
                          }}
                        >
                          <div class={"p-1"}>
                            <Icon icon={IconExternalLink} />
                          </div>
                          <div class={"flex-1"}>{col.cell(crudCtx)}</div>
                        </Link>
                      );
                    }

                    return col.cell(crudCtx);
                  }}
                </DataSheetColumn>
              )}
            </For>

            {/* Auto lastModified columns */}
            <Show when={local.lastModifiedAtProp}>
              <DataSheetColumn<TItem> key={local.lastModifiedAtProp!} header={i18n?.t("crudSheet.lastModified") ?? "Last Modified"} hidden>
                {(dsCtx) => (
                  <div class="px-2 py-1 text-center">
                    {(
                      objGetChainValue(dsCtx.item, local.lastModifiedAtProp!, true) as
                        | DateTime
                        | undefined
                    )?.toFormatString("yyyy-MM-dd HH:mm")}
                  </div>
                )}
              </DataSheetColumn>
            </Show>

            <Show when={local.lastModifiedByProp}>
              <DataSheetColumn<TItem> key={local.lastModifiedByProp!} header={i18n?.t("crudSheet.modifiedBy") ?? "Modified By"} hidden>
                {(dsCtx) => (
                  <div class="px-2 py-1 text-center">
                    {objGetChainValue(dsCtx.item, local.lastModifiedByProp!, true) as string}
                  </div>
                )}
              </DataSheetColumn>
            </Show>
          </DataSheet>
        </form>

        {/* Select mode bottom bar */}
        <Show when={isModal && isSelectMode()}>
          <div class="flex gap-2 border-t p-2">
            <div class="flex-1" />
            <Show when={selectedItems().length > 0}>
              <Button size="sm" theme="danger" onClick={handleSelectCancel}>
                {local.selectMode === "multiple" ? (i18n?.t("crudSheet.deselectAll") ?? "Deselect All") : (i18n?.t("crudSheet.deselect") ?? "Deselect")}
              </Button>
            </Show>
            <Show when={local.selectMode === "multiple"}>
              <Button size="sm" theme="primary" onClick={handleSelectConfirm}>
                {i18n?.t("crudSheet.confirm") ?? "Confirm"} ({selectedItems().length})
              </Button>
            </Show>
          </div>
        </Show>
      </BusyContainer>
    </>
  );
};

export const CrudSheet = CrudSheetBase as unknown as CrudSheetComponent;
CrudSheet.Column = CrudSheetColumn;
CrudSheet.Filter = CrudSheetFilter;
CrudSheet.Tools = CrudSheetTools;
CrudSheet.Header = CrudSheetHeader;
