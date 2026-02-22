import {
  children,
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { createStore, produce, reconcile } from "solid-js/store";
import { createControllableStore } from "../../../hooks/createControllableStore";
import { objClone } from "@simplysm/core-common";
import "@simplysm/core-common"; // register extensions
import type { SortingDef } from "../sheet/types";
import { DataSheet } from "../sheet/DataSheet";
import { DataSheetColumn } from "../sheet/DataSheetColumn";
import { BusyContainer } from "../../feedback/busy/BusyContainer";
import { useNotification } from "../../feedback/notification/NotificationContext";
import { Button } from "../../form-control/Button";
import { Icon } from "../../display/Icon";
import { FormGroup } from "../../layout/FormGroup";
import { TopbarContext, createTopbarActions } from "../../layout/topbar/TopbarContext";
import { useDialogInstance } from "../../disclosure/DialogInstanceContext";
import { Dialog } from "../../disclosure/Dialog";
import { Link } from "../../display/Link";
import { createEventListener } from "@solid-primitives/event-listener";
import clsx from "clsx";
import {
  IconDeviceFloppy,
  IconFileExcel,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconTrashOff,
  IconUpload,
} from "@tabler/icons-solidjs";
import { isCrudSheetColumnDef, CrudSheetColumn } from "./CrudSheetColumn";
import { isCrudSheetFilterDef, CrudSheetFilter } from "./CrudSheetFilter";
import { isCrudSheetToolsDef, CrudSheetTools } from "./CrudSheetTools";
import { isCrudSheetHeaderDef, CrudSheetHeader } from "./CrudSheetHeader";
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
  const [local, _rest] = splitProps(props, [
    "search",
    "getItemKey",
    "persistKey",
    "itemsPerPage",
    "editable",
    "itemEditable",
    "itemDeletable",
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

  // eslint-disable-next-line solid/reactivity -- filterInitial은 초기값으로만 사용
  const [filter, setFilter] = createStore<TFilter>((local.filterInitial ?? {}) as TFilter);
  const [lastFilter, setLastFilter] = createSignal<TFilter>(objClone(filter));

  const [page, setPage] = createSignal(1);
  const [totalPageCount, setTotalPageCount] = createSignal(0);
  const [sorts, setSorts] = createSignal<SortingDef[]>([]);

  const [busyCount, setBusyCount] = createSignal(0);
  const [ready, setReady] = createSignal(false);

  const [selectedItems, setSelectedItems] = createSignal<TItem[]>([]);

  let formRef: HTMLFormElement | undefined;

  // -- Auto Refresh Effect --
  createEffect(() => {
    const currLastFilter = lastFilter();
    const currSorts = sorts();
    const currPage = page();

    queueMicrotask(async () => {
      setBusyCount((c) => c + 1);
      await noti.try(async () => {
        await refresh(currLastFilter, currSorts, currPage);
      }, "조회 실패");
      setBusyCount((c) => c - 1);
      setReady(true);
    });
  });

  async function refresh(currLastFilter: TFilter, currSorts: SortingDef[], currPage: number) {
    const usePagination = local.itemsPerPage != null;
    const result: SearchResult<TItem> = await local.search(
      currLastFilter,
      usePagination ? currPage : 0,
      currSorts,
    );
    setItems(reconcile(result.items));
    originalItems = objClone(result.items);
    setTotalPageCount(result.pageCount ?? 0);
  }

  /* eslint-disable solid/reactivity -- 이벤트 핸들러에서만 호출, store 즉시 읽기 */
  function getItemDiffs() {
    return (items as unknown as TItem[]).oneWayDiffs(originalItems, ((item: TItem) => {
      return local.getItemKey(item);
    }) as (item: TItem) => keyof TItem);
  }
  /* eslint-enable solid/reactivity */

  // -- Filter --
  function handleFilterSubmit(e: Event) {
    e.preventDefault();
    setPage(1);
    setLastFilter(() => objClone(filter));
  }

  function handleRefresh() {
    setLastFilter(() => ({ ...lastFilter() }));
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
      noti.info("안내", "변경사항이 없습니다.");
      return;
    }

    const currLastFilter = lastFilter();
    const currSorts = sorts();
    const currPage = page();

    setBusyCount((c) => c + 1);
    // eslint-disable-next-line solid/reactivity -- noti.try 내부에서 비동기 refresh 호출
    await noti.try(async () => {
      await local.inlineEdit!.submit(diffs);
      noti.success("저장 완료", "저장되었습니다.");
      await refresh(currLastFilter, currSorts, currPage);
    }, "저장 실패");
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
    // eslint-disable-next-line solid/reactivity -- noti.try 내부에서 비동기 refresh 호출
    await noti.try(async () => {
      await refresh(lastFilter(), sorts(), page());
    }, "조회 실패");
    setBusyCount((c) => c - 1);
  }

  async function handleDeleteItems() {
    if (!local.modalEdit?.deleteItems) return;
    const result = await local.modalEdit.deleteItems(selectedItems());
    if (!result) return;

    setBusyCount((c) => c + 1);
    // eslint-disable-next-line solid/reactivity -- noti.try 내부에서 비동기 refresh 호출
    await noti.try(async () => {
      await refresh(lastFilter(), sorts(), page());
      noti.success("삭제 완료", "삭제되었습니다.");
    }, "삭제 실패");
    setBusyCount((c) => c - 1);
  }

  // -- Excel --
  async function handleExcelDownload() {
    if (!local.excel) return;

    setBusyCount((c) => c + 1);
    // eslint-disable-next-line solid/reactivity -- noti.try 내부에서 비동기 호출
    await noti.try(async () => {
      const result = await local.search(lastFilter(), 0, sorts());
      await local.excel!.download(result.items);
    }, "엑셀 다운로드 실패");
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
      // eslint-disable-next-line solid/reactivity -- noti.try 내부에서 비동기 호출
      await noti.try(async () => {
        await local.excel!.upload!(file);
        noti.success("완료", "엑셀 업로드가 완료되었습니다.");
        await refresh(lastFilter(), sorts(), page());
      }, "엑셀 업로드 실패");
      setBusyCount((c) => c - 1);
    };
    input.click();
  }

  // -- Select Mode --
  function handleSelectConfirm() {
    local.onSelect?.({
      items: selectedItems(),
      keys: selectedItems()
        .map((item) => local.getItemKey(item))
        .filter((k): k is string | number => k != null),
    });
  }

  function handleSelectCancel() {
    local.onSelect?.({ items: [], keys: [] });
  }

  // -- Keyboard Shortcuts --
  createEventListener(document, "keydown", (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === "s" && !isSelectMode()) {
      e.preventDefault();
      formRef?.requestSubmit();
    }
    if (e.ctrlKey && e.altKey && e.key === "l") {
      e.preventDefault();
      handleRefresh();
    }
  });

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
            저장
          </Button>
        </Show>
        <Button size="lg" variant="ghost" theme="info" onClick={handleRefresh}>
          <Icon icon={IconRefresh} class="mr-1" />
          새로고침
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
      handleRefresh();
      await Promise.resolve();
    },
    addItem: handleAddRow,
    setPage,
    setSorts,
  };

  // -- Render --
  const deleteProp = () => local.inlineEdit?.deleteProp;

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
        <Show when={!isModal && !topbarCtx && canEdit() && local.inlineEdit}>
          <div class="flex gap-2 p-2 pb-0">
            <Button
              size="sm"
              theme="primary"
              variant="ghost"
              onClick={() => formRef?.requestSubmit()}
            >
              <Icon icon={IconDeviceFloppy} class="mr-1" />
              저장
            </Button>
            <Button size="sm" theme="info" variant="ghost" onClick={handleRefresh}>
              <Icon icon={IconRefresh} class="mr-1" />
              새로고침
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
                    조회
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
                  <Icon icon={IconPlus} class="mr-1" />행 추가
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
                  등록
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
                    !selectedItems().some((item) => local.itemDeletable?.(item) ?? true)
                  }
                >
                  <Icon icon={IconTrash} class="mr-1" />
                  선택 삭제
                </Button>
              </Show>

              {/* Excel buttons */}
              <Show when={canEdit() && local.excel?.upload}>
                <Button size="sm" theme="success" variant="ghost" onClick={handleExcelUpload}>
                  <Icon icon={IconUpload} class="mr-1" />
                  엑셀 업로드
                </Button>
              </Show>
              <Show when={local.excel}>
                <Button size="sm" theme="success" variant="ghost" onClick={handleExcelDownload}>
                  <Icon icon={IconFileExcel} class="mr-1" />
                  엑셀 다운로드
                </Button>
              </Show>
            </Show>

            {/* Custom tools */}
            <Show when={defs().tools}>{(toolsDef) => toolsDef().children(ctx)}</Show>
          </div>
        </Show>

        {/* DataSheet */}
        <form ref={formRef} class="flex-1 overflow-hidden p-2 pt-1" onSubmit={handleFormSubmit}>
          <DataSheet
            class="h-full"
            items={items}
            persistKey={local.persistKey != null ? `${local.persistKey}-sheet` : undefined}
            page={local.itemsPerPage != null ? page() : undefined}
            onPageChange={setPage}
            totalPageCount={totalPageCount()}
            itemsPerPage={local.itemsPerPage}
            sorts={sorts()}
            onSortsChange={setSorts}
            selectMode={
              isSelectMode()
                ? local.selectMode === "multi"
                  ? "multiple"
                  : "single"
                : local.modalEdit?.deleteItems != null
                  ? "multiple"
                  : undefined
            }
            selectedItems={selectedItems()}
            onSelectedItemsChange={setSelectedItems}
            autoSelect={isSelectMode() && local.selectMode === "single" ? "click" : undefined}
            cellClass={(item, _colKey) => {
              const dp = deleteProp();
              if (dp != null && Boolean((item as Record<string, unknown>)[dp])) {
                return clsx("line-through");
              }
              return undefined;
            }}
          >
            {/* Auto delete column */}
            <Show when={deleteProp() != null && canEdit() ? deleteProp() : undefined}>
              {(dp) => (
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
                        <Icon
                          icon={
                            Boolean((dsCtx.item as Record<string, unknown>)[dp()])
                              ? IconTrashOff
                              : IconTrash
                          }
                        />
                      </Link>
                    </div>
                  )}
                </DataSheetColumn>
              )}
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
                      col.editable &&
                      canEdit() &&
                      (local.itemEditable?.(dsCtx.item) ?? true)
                    ) {
                      return (
                        <Link
                          class="flex w-full"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleEditItem(dsCtx.item);
                          }}
                        >
                          {col.cell(crudCtx)}
                        </Link>
                      );
                    }

                    return col.cell(crudCtx);
                  }}
                </DataSheetColumn>
              )}
            </For>
          </DataSheet>
        </form>

        {/* Select mode bottom bar */}
        <Show when={isModal && isSelectMode()}>
          <div class="flex gap-2 border-t p-2">
            <div class="flex-1" />
            <Show when={selectedItems().length > 0}>
              <Button size="sm" theme="danger" onClick={handleSelectCancel}>
                {local.selectMode === "multi" ? "모두" : "선택"} 해제
              </Button>
            </Show>
            <Show when={local.selectMode === "multi"}>
              <Button size="sm" theme="primary" onClick={handleSelectConfirm}>
                확인({selectedItems().length})
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
