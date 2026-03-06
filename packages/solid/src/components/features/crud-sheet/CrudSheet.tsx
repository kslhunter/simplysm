import {
  createEffect,
  createSignal,
  createUniqueId,
  For,
  onCleanup,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { createStore, produce, reconcile } from "solid-js/store";
import { createControllableStore } from "../../../hooks/createControllableStore";
import type { DateTime } from "@simplysm/core-common";
import { obj } from "@simplysm/core-common";
import "@simplysm/core-common"; // register extensions
import { openFileDialog } from "@simplysm/core-browser";
import type { SortingDef } from "../../data/sheet/DataSheet.types";
import { DataSheet } from "../../data/sheet/DataSheet";
import { DataSheetColumn } from "../../data/sheet/DataSheetColumn";
import { normalizeHeader } from "../../data/sheet/DataSheet.utils";
import { BusyContainer } from "../../feedback/busy/BusyContainer";
import { useNotification } from "../../feedback/notification/NotificationProvider";
import { useI18n } from "../../../providers/i18n/I18nProvider";
import { Button } from "../../form-control/Button";
import { Icon } from "../../display/Icon";
import { FormGroup } from "../../layout/FormGroup";
import { useTopbarActions, TopbarContext } from "../../layout/topbar/Topbar";
import { Dialog } from "../../disclosure/Dialog";
import { Link } from "../../display/Link";
import { createEventListener } from "@solid-primitives/event-listener";
import { useBeforeLeave } from "@solidjs/router";
import clsx from "clsx";
import { text } from "../../../styles/base.styles";
import { gap, pad } from "../../../styles/control.styles";
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
import { CrudSheetColumn, createCrudSheetColumnSlotsAccessor } from "./CrudSheetColumn";
import { CrudSheetFilter, createCrudSheetFilterSlotAccessor } from "./CrudSheetFilter";
import { CrudSheetTools, createCrudSheetToolsSlotAccessor } from "./CrudSheetTools";
import { CrudSheetHeader, createCrudSheetHeaderSlotAccessor } from "./CrudSheetHeader";
import type {
  CrudSheetCellContext,
  CrudSheetContext,
  CrudSheetProps,
  SearchResult,
} from "./CrudSheet.types";

const CrudSheetBase = <TItem, TFilter extends Record<string, unknown>>(
  props: CrudSheetProps<TItem, TFilter>,
) => {
  const [local] = splitProps(props, [
    "search",
    "getItemKey",
    "storageKey",
    "editable",
    "isItemEditable",
    "isItemDeletable",
    "isItemDeleted",
    "isItemSelectable",
    "lastModifiedAtProp",
    "lastModifiedByProp",
    "onSubmitComplete",
    "filterInitial",
    "items",
    "onItemsChange",
    "inlineEdit",
    "dialogEdit",
    "excel",
    "selectionMode",
    "onSelect",
    "hideAutoTools",
    "close",
    "class",
    "children",
  ]);

  const noti = useNotification();
  const i18n = useI18n();
  const topbarCtx = useContext(TopbarContext);
  const isInDialog = local.close !== undefined;
  const isSelectMode = () => local.selectionMode != null;
  const canEdit = () => (isInDialog && isSelectMode() ? false : (local.editable ?? true));

  // -- Slot Accessors --
  const [headerSlot, HeaderProvider] = createCrudSheetHeaderSlotAccessor();
  const [filterSlot, FilterProvider] = createCrudSheetFilterSlotAccessor();
  const [toolsSlot, ToolsProvider] = createCrudSheetToolsSlotAccessor();
  const [columnSlots, ColumnsProvider] = createCrudSheetColumnSlotsAccessor();

  // -- State --
  const [items, setItems] = createControllableStore<TItem[]>({
    value: () => local.items ?? [],
    onChange: () => local.onItemsChange,
  });
  let originalItems: TItem[] = [];

  const [filter, setFilter] = createStore<TFilter>((local.filterInitial ?? {}) as TFilter);
  const [lastFilter, setLastFilter] = createSignal<TFilter>(obj.clone(filter));

  const [page, setPage] = createSignal(1);
  const [totalPageCount, setTotalPageCount] = createSignal(0);
  const [sorts, setSorts] = createSignal<SortingDef[]>([]);

  const [busyCount, setBusyCount] = createSignal(0);
  const [ready, setReady] = createSignal(false);

  const [selection, setSelection] = createSignal<TItem[]>([]);
  const [selectedKeys, setSelectedKeys] = createSignal<Set<string | number>>(new Set());

  let formRef: HTMLFormElement | undefined;

  const crudId = createUniqueId();
  onCleanup(() => unregisterCrud(crudId));
  createEventListener(() => formRef, "pointerdown", () => activateCrud(crudId));
  createEventListener(() => formRef, "focusin", () => activateCrud(crudId));

  let refreshVersion = 0;

  createEffect(() => {
    void doRefresh();
  });

  // -- Key-based selection: restore selection when items change --
  createEffect(() => {
    const currentItems = items;
    const keys = selectedKeys();
    if (keys.size === 0) {
      if (selection().length > 0) {
        setSelection([]);
      }
      return;
    }
    const restored = currentItems.filter((item) => {
      const key = local.getItemKey(item);
      return key != null && keys.has(key);
    });
    setSelection(restored);
  });

  async function doRefresh() {
    const version = ++refreshVersion;
    setBusyCount((c) => c + 1);
    try {
      await refresh();
      if (version !== refreshVersion) return;
      setReady(true);
    } catch (err) {
      if (version !== refreshVersion) return;
      noti.error(err, i18n.t("crudSheet.lookupFailed"));
    } finally {
      setBusyCount((c) => c - 1);
    }
  }

  async function refresh() {
    const result: SearchResult<TItem> = await local.search(lastFilter(), page(), sorts());
    setItems(reconcile(result.items));
    originalItems = obj.clone(result.items);
    setTotalPageCount(result.pageCount ?? 0);
  }

  function getItemDiffs() {
    return items.oneWayDiffs(originalItems, (item) => local.getItemKey(item), {
      excludes: local.inlineEdit?.diffsExcludes,
    });
  }

  function checkIgnoreChanges(): boolean {
    if (!local.inlineEdit) return true;
    if (getItemDiffs().length === 0) return true;
    return confirm(i18n.t("crudSheet.discardChanges"));
  }

  // -- Filter --
  function handleFilterSubmit(e: Event) {
    e.preventDefault();
    if (!checkIgnoreChanges()) return;
    setPage(1);
    setLastFilter(() => obj.clone(filter));
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
    if (!(local.isItemDeletable?.(item) ?? true)) return;
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

    setItems(
      produce((draft) => {
        (draft[index] as Record<string, unknown>)[dp] = !(item[dp] as boolean);
      }),
    );
  }

  async function handleSave() {
    if (busyCount() > 0) return;
    if (!canEdit()) return;
    if (!local.inlineEdit) return;

    const diffs = getItemDiffs();

    if (diffs.length === 0) {
      noti.info(i18n.t("crudSheet.notice"), i18n.t("crudSheet.noChanges"));
      return;
    }

    setBusyCount((c) => c + 1);
    try {
      await local.inlineEdit.submit(diffs);
      noti.success(i18n.t("crudSheet.saveCompleted"), i18n.t("crudSheet.saveSuccess"));
      await refresh();
      local.onSubmitComplete?.();
    } catch (err) {
      noti.error(err, i18n.t("crudSheet.saveFailed"));
    }
    setBusyCount((c) => c - 1);
  }

  async function handleFormSubmit(e: Event) {
    e.preventDefault();
    await handleSave();
  }

  // -- Dialog Edit --
  async function handleEditItem(item?: TItem) {
    if (!local.dialogEdit) return;
    const result = await local.dialogEdit.editItem(item);
    if (!result) return;

    setBusyCount((c) => c + 1);
    try {
      await refresh();
    } catch (err) {
      noti.error(err, i18n.t("crudSheet.lookupFailed"));
    }
    setBusyCount((c) => c - 1);
  }

  async function handleDeleteItems() {
    if (!local.dialogEdit?.deleteItems) return;
    const result = await local.dialogEdit.deleteItems(selection());
    if (!result) return;

    setBusyCount((c) => c + 1);
    try {
      await refresh();
      noti.success(i18n.t("crudSheet.deleteCompleted"), i18n.t("crudSheet.deleteSuccess"));
    } catch (err) {
      noti.error(err, i18n.t("crudSheet.deleteFailed"));
    }
    setBusyCount((c) => c - 1);
  }

  async function handleRestoreItems() {
    if (!local.dialogEdit?.restoreItems) return;
    const result = await local.dialogEdit.restoreItems(selection());
    if (!result) return;

    setBusyCount((c) => c + 1);
    try {
      await refresh();
      noti.success(i18n.t("crudSheet.restoreCompleted"), i18n.t("crudSheet.restoreSuccess"));
    } catch (err) {
      noti.error(err, i18n.t("crudSheet.restoreFailed"));
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
      noti.error(err, i18n.t("crudSheet.excelDownloadFailed"));
    }
    setBusyCount((c) => c - 1);
  }

  async function handleExcelUpload() {
    if (!local.excel?.upload) return;

    const files = await openFileDialog({ accept: ".xlsx" });
    const file = files?.[0];
    if (file == null) return;

    setBusyCount((c) => c + 1);
    try {
      await local.excel.upload(file);
      noti.success(i18n.t("crudSheet.excelCompleted"), i18n.t("crudSheet.excelUploadSuccess"));
      await refresh();
    } catch (err) {
      noti.error(err, i18n.t("crudSheet.excelUploadFailed"));
    }
    setBusyCount((c) => c - 1);
  }

  // -- Select Mode --
  function handleSelectionChange(newSelection: TItem[]) {
    // Current page items key Set
    const currentItems = items;
    const currentKeys = new Set<string | number>();
    for (const item of currentItems) {
      const key = local.getItemKey(item);
      if (key != null) currentKeys.add(key);
    }

    // Newly selected items key
    const newSelectedKeys = new Set<string | number>();
    for (const item of newSelection) {
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
    setSelection(newSelection);
  }

  function clearSelection() {
    setSelectedKeys(new Set<string | number>());
    setSelection([]);
  }

  function handleSelectConfirm() {
    local.onSelect?.({
      items: selection(),
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
  if (!isInDialog && local.inlineEdit) {
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
    useTopbarActions(() => (
      <>
        <Show when={canEdit() && local.inlineEdit}>
          <Button
            size="lg"
            variant="ghost"
            theme="primary"
            onClick={() => formRef?.requestSubmit()}
          >
            <Icon icon={IconDeviceFloppy} class="mr-1" />
            {i18n.t("crudSheet.save")}
          </Button>
        </Show>
        <Button size="lg" variant="ghost" theme="info" onClick={handleRefresh}>
          <Icon icon={IconRefresh} class="mr-1" />
          {i18n.t("crudSheet.refresh")}
        </Button>
      </>
    ));
  }

  // -- Context for Tools --
  const ctx: CrudSheetContext<TItem> = {
    items: () => items,
    selection,
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
  const isItemDeleted = (item: TItem) => local.isItemDeleted?.(item) ?? false;

  return (
    <>
      <ColumnsProvider>
        <HeaderProvider>
          <FilterProvider>
            <ToolsProvider>{local.children}</ToolsProvider>
          </FilterProvider>
        </HeaderProvider>
      </ColumnsProvider>

      {/* Dialog mode: Dialog.Action (refresh button in header) */}
      <Show when={isInDialog}>
        <Dialog.Action>
          <button
            class={clsx("flex items-center px-2 hover:text-base-600", text.muted)}
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
        <Show when={!isInDialog && !topbarCtx}>
          <div class="flex gap-2 p-2 pb-0">
            <Show when={canEdit() && local.inlineEdit}>
              <Button
                size="sm"
                theme="primary"
                variant="ghost"
                onClick={() => formRef?.requestSubmit()}
              >
                <Icon icon={IconDeviceFloppy} class="mr-1" />
                {i18n.t("crudSheet.save")}
              </Button>
            </Show>
            <Button size="sm" theme="info" variant="ghost" onClick={handleRefresh}>
              <Icon icon={IconRefresh} class="mr-1" />
              {i18n.t("crudSheet.refresh")}
            </Button>
          </div>
        </Show>

        {/* Header (optional) */}
        <Show when={headerSlot()}>{(slot) => slot().children}</Show>

        {/* Filter */}
        <Show when={filterSlot()}>
          {(slot) => (
            <form class="p-2" onSubmit={handleFilterSubmit}>
              <FormGroup inline>
                <FormGroup.Item>
                  <Button type="submit" theme="info" variant="solid">
                    <Icon icon={IconSearch} class="mr-1" />
                    {i18n.t("crudSheet.search")}
                  </Button>
                </FormGroup.Item>
                {slot().children(filter, setFilter)}
              </FormGroup>
            </form>
          )}
        </Show>

        {/* Toolbar */}
        <Show when={!(isInDialog && isSelectMode())}>
          <div class="flex gap-2 p-2 pb-0">
            <Show when={!local.hideAutoTools}>
              {/* Inline edit buttons */}
              <Show when={canEdit() && local.inlineEdit}>
                <Button size="sm" theme="primary" variant="ghost" onClick={handleAddRow}>
                  <Icon icon={IconPlus} class="mr-1" />{i18n.t("crudSheet.addRow")}
                </Button>
              </Show>

              {/* Dialog edit buttons */}
              <Show when={canEdit() && local.dialogEdit}>
                <Button
                  size="sm"
                  theme="primary"
                  variant="ghost"
                  onClick={() => void handleEditItem()}
                >
                  <Icon icon={IconPlus} class="mr-1" />
                  {i18n.t("crudSheet.register")}
                </Button>
              </Show>
              <Show when={canEdit() && local.dialogEdit?.deleteItems}>
                <Button
                  size="sm"
                  theme="danger"
                  variant="ghost"
                  onClick={handleDeleteItems}
                  disabled={
                    selection().length === 0 ||
                    !selection().some(
                      (item) =>
                        (local.isItemDeletable?.(item) ?? true) &&
                        !(local.isItemDeleted?.(item) ?? false),
                    )
                  }
                >
                  <Icon icon={IconTrash} class="mr-1" />
                  {i18n.t("crudSheet.deleteSelected")}
                </Button>
              </Show>
              <Show when={canEdit() && local.dialogEdit?.restoreItems}>
                <Button
                  size="sm"
                  theme="warning"
                  variant="ghost"
                  onClick={handleRestoreItems}
                  disabled={
                    selection().length === 0 ||
                    !selection().some((item) => local.isItemDeleted?.(item) ?? false)
                  }
                >
                  <Icon icon={IconTrashOff} class="mr-1" />
                  {i18n.t("crudSheet.restoreSelected")}
                </Button>
              </Show>

              {/* Excel buttons */}
              <Show when={canEdit() && local.excel?.upload}>
                <Button size="sm" theme="success" variant="ghost" onClick={handleExcelUpload}>
                  <Icon icon={IconUpload} class="mr-1" />
                  {i18n.t("crudSheet.excelUpload")}
                </Button>
              </Show>
              <Show when={local.excel}>
                <Button size="sm" theme="success" variant="ghost" onClick={handleExcelDownload}>
                  <Icon icon={IconFileExcel} class="mr-1" />
                  {i18n.t("crudSheet.excelDownload")}
                </Button>
              </Show>
            </Show>

            {/* Custom tools */}
            <Show when={toolsSlot()}>{(slot) => slot().children(ctx)}</Show>
          </div>
        </Show>

        {/* DataSheet */}
        <form ref={(el) => { formRef = el; registerCrud(crudId, el); }} class="flex-1 overflow-hidden p-2 pt-1" onSubmit={handleFormSubmit}>
          <DataSheet
            class="h-full"
            items={items}
            storageKey={local.storageKey != null ? `${local.storageKey}-sheet` : undefined}
            page={totalPageCount() > 0 ? page() : undefined}
            onPageChange={setPage}
            totalPageCount={totalPageCount()}
            sorts={sorts()}
            onSortsChange={setSorts}
            isItemSelectable={local.isItemSelectable}
            selectionMode={
              isSelectMode()
                ? local.selectionMode
                : local.dialogEdit?.deleteItems != null || local.dialogEdit?.restoreItems != null
                  ? "multiple"
                  : undefined
            }
            selection={selection()}
            onSelectionChange={handleSelectionChange}
            autoSelect={isSelectMode() && local.selectionMode === "single" ? "click" : undefined}
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
                      disabled={!(local.isItemDeletable?.(dsCtx.item) ?? true)}
                      onClick={() => handleToggleDelete(dsCtx.item, dsCtx.index)}
                    >
                      <Icon icon={isItemDeleted(dsCtx.item) ? IconTrashOff : IconTrash} />
                    </Link>
                  </div>
                )}
              </DataSheetColumn>
            </Show>

            {/* User-defined columns -- map CrudSheetColumn to DataSheetColumn */}
            <For each={columnSlots()}>
              {(col) => (
                <DataSheetColumn<TItem>
                  key={col.key}
                  header={normalizeHeader(col.header)}
                  headerContent={col.headerContent}
                  headerStyle={col.headerStyle}
                  summary={col.summary}
                  tooltip={col.tooltip}
                  fixed={col.fixed ?? false}
                  hidden={col.hidden ?? false}
                  collapse={col.collapse ?? false}
                  width={col.width}
                  class={col.class}
                  sortable={col.sortable ?? true}
                  resizable={col.resizable ?? true}
                >
                  {(dsCtx) => {
                    const crudCtx: CrudSheetCellContext<any> = {
                      ...dsCtx,
                      setItem: (key, value) => {
                        setItems(dsCtx.index as any, key as any, value);
                      },
                    };

                    // dialogEdit editable column -- wrap with edit link
                    if (
                      local.dialogEdit &&
                      (col.editTrigger ?? false) &&
                      canEdit() &&
                      (local.isItemEditable?.(dsCtx.item) ?? true)
                    ) {
                      return (
                        <Link
                          class={clsx("flex", gap.default)}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleEditItem(dsCtx.item);
                          }}
                        >
                          <div class={"p-1"}>
                            <Icon icon={IconExternalLink} />
                          </div>
                          <div class={"flex-1"}>{col.children(crudCtx)}</div>
                        </Link>
                      );
                    }

                    return col.children(crudCtx);
                  }}
                </DataSheetColumn>
              )}
            </For>

            {/* Auto lastModified columns */}
            <Show when={local.lastModifiedAtProp}>
              <DataSheetColumn<TItem> key={local.lastModifiedAtProp!} header={i18n.t("crudSheet.lastModified")} hidden>
                {(dsCtx) => (
                  <div class={clsx(pad.default, "text-center")}>
                    {(
                      obj.getChainValue(dsCtx.item, local.lastModifiedAtProp!, true) as
                        | DateTime
                        | undefined
                    )?.toFormatString("yyyy-MM-dd HH:mm")}
                  </div>
                )}
              </DataSheetColumn>
            </Show>

            <Show when={local.lastModifiedByProp}>
              <DataSheetColumn<TItem> key={local.lastModifiedByProp!} header={i18n.t("crudSheet.modifiedBy")} hidden>
                {(dsCtx) => (
                  <div class={clsx(pad.default, "text-center")}>
                    {obj.getChainValue(dsCtx.item, local.lastModifiedByProp!, true) as string}
                  </div>
                )}
              </DataSheetColumn>
            </Show>
          </DataSheet>
        </form>

        {/* Select mode bottom bar */}
        <Show when={isInDialog && isSelectMode()}>
          <div class="flex gap-2 border-t p-2">
            <div class="flex-1" />
            <Show when={selection().length > 0}>
              <Button size="sm" theme="danger" onClick={handleSelectCancel}>
                {local.selectionMode === "multiple" ? i18n.t("crudSheet.deselectAll") : i18n.t("crudSheet.deselect")}
              </Button>
            </Show>
            <Show when={local.selectionMode === "multiple"}>
              <Button size="sm" theme="primary" onClick={handleSelectConfirm}>
                {i18n.t("crudSheet.confirm")} ({selection().length})
              </Button>
            </Show>
          </div>
        </Show>
      </BusyContainer>
    </>
  );
};

//#region Export
export const CrudSheet = Object.assign(CrudSheetBase, {
  Column: CrudSheetColumn,
  Filter: CrudSheetFilter,
  Tools: CrudSheetTools,
  Header: CrudSheetHeader,
});
//#endregion
