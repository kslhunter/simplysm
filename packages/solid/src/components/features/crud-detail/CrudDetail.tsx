import {
  children,
  createMemo,
  createSignal,
  type JSX,
  onMount,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { reconcile, unwrap } from "solid-js/store";
import { createControllableStore } from "../../../hooks/createControllableStore";
import { objClone, objEqual } from "@simplysm/core-common";
import { BusyContainer } from "../../feedback/busy/BusyContainer";
import { useNotification } from "../../feedback/notification/NotificationContext";
import { Button } from "../../form-control/Button";
import { Icon } from "../../display/Icon";
import { createTopbarActions, TopbarContext } from "../../layout/topbar/TopbarContext";
import { useDialogInstance } from "../../disclosure/DialogInstanceContext";
import { Dialog } from "../../disclosure/Dialog";
import { createEventListener } from "@solid-primitives/event-listener";
import clsx from "clsx";
import {
  IconCheck,
  IconDeviceFloppy,
  IconRefresh,
  IconTrash,
  IconTrashOff,
} from "@tabler/icons-solidjs";
import { CrudDetailTools, isCrudDetailToolsDef } from "./CrudDetailTools";
import { CrudDetailBefore, isCrudDetailBeforeDef } from "./CrudDetailBefore";
import { CrudDetailAfter, isCrudDetailAfterDef } from "./CrudDetailAfter";
import type {
  CrudDetailAfterDef,
  CrudDetailBeforeDef,
  CrudDetailContext,
  CrudDetailInfo,
  CrudDetailProps,
  CrudDetailToolsDef,
} from "./types";

interface CrudDetailComponent {
  <TData extends object>(props: CrudDetailProps<TData>): JSX.Element;
  Tools: typeof CrudDetailTools;
  Before: typeof CrudDetailBefore;
  After: typeof CrudDetailAfter;
}

const CrudDetailBase = <TData extends object>(props: CrudDetailProps<TData>) => {
  const [local] = splitProps(props, [
    "load",
    "children",
    "submit",
    "toggleDelete",
    "editable",
    "deletable",
    "data",
    "onDataChange",
    "class",
  ]);

  const noti = useNotification();
  const topbarCtx = useContext(TopbarContext);
  const dialogInstance = useDialogInstance<boolean>();

  const isModal = dialogInstance !== undefined;

  const canEdit = () => local.editable ?? true;

  // -- State --
  const [data, setData] = createControllableStore<TData>({
    value: () => local.data ?? ({} as TData),
    onChange: () => local.onDataChange,
  });
  let originalData: TData | undefined;

  const [info, setInfo] = createSignal<CrudDetailInfo>();
  const [busyCount, setBusyCount] = createSignal(0);
  const [ready, setReady] = createSignal(false);

  let formRef: HTMLFormElement | undefined;

  // -- Load --
  async function doLoad() {
    setBusyCount((c) => c + 1);
    try {
      const result = await local.load();
      setData(reconcile(result.data) as any);
      originalData = objClone(result.data);
      setInfo(result.info);
    } catch (err) {
      noti.error(err, "Lookup failed");
    }
    setBusyCount((c) => c - 1);
    setReady(true);
  }

  onMount(() => {
    void doLoad();
  });

  // -- Change Detection --
  function hasChanges(): boolean {
    if (originalData == null) return false;
    return !objEqual(unwrap(data) as unknown, originalData as unknown);
  }

  // -- Refresh --
  async function handleRefresh() {
    if (hasChanges()) {
      if (!confirm("변경사항을 무시하시겠습니까?")) return;
    }
    await doLoad();
  }

  // -- Save --
  async function handleSave() {
    if (busyCount() > 0) return;
    if (!local.submit) return;

    const currentInfo = info();
    if (currentInfo && !currentInfo.isNew && !hasChanges()) {
      noti.info("Notice", "No changes to save.");
      return;
    }

    setBusyCount((c) => c + 1);
    try {
      const result = await local.submit(objClone(unwrap(data)));
      if (result) {
        noti.success("Save completed", "Saved successfully.");
        if (dialogInstance) {
          dialogInstance.close(true);
        } else {
          await doLoad();
        }
      }
    } catch (err) {
      noti.error(err, "Save failed");
    }
    setBusyCount((c) => c - 1);
  }

  async function handleFormSubmit(e: Event) {
    e.preventDefault();
    await handleSave();
  }

  // -- Toggle Delete --
  async function handleToggleDelete() {
    if (busyCount() > 0) return;
    if (!local.toggleDelete) return;

    const currentInfo = info();
    if (!currentInfo) return;

    const del = !currentInfo.isDeleted;

    setBusyCount((c) => c + 1);
    try {
      const result = await local.toggleDelete(del);
      if (result) {
        noti.success(del ? "Delete completed" : "Restore completed", del ? "Deleted successfully." : "Restored successfully.");
        if (dialogInstance) {
          dialogInstance.close(true);
        } else {
          await doLoad();
        }
      }
    } catch (err) {
      noti.error(err, del ? "Delete failed" : "Restore failed");
    }
    setBusyCount((c) => c - 1);
  }

  // -- Keyboard Shortcuts --
  createEventListener(document, "keydown", (e: KeyboardEvent) => {
    if (!formRef?.contains(document.activeElement)) return;
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      formRef.requestSubmit();
    }
    if (e.ctrlKey && e.altKey && e.key === "l") {
      e.preventDefault();
      void handleRefresh();
    }
  });

  // -- Topbar Actions (Page mode) --
  if (topbarCtx) {
    createTopbarActions(() => (
      <>
        <Show when={canEdit() && local.submit}>
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
        <Show
          when={
            canEdit() && local.toggleDelete && info() && !info()!.isNew && (local.deletable ?? true)
          }
        >
          {(_) => (
            <Button
              size="lg"
              variant="ghost"
              theme="danger"
              onClick={() => void handleToggleDelete()}
            >
              <Icon icon={info()!.isDeleted ? IconTrashOff : IconTrash} class="mr-1" />
              {info()!.isDeleted ? "복구" : "삭제"}
            </Button>
          )}
        </Show>
        <Button size="lg" variant="ghost" theme="info" onClick={() => void handleRefresh()}>
          <Icon icon={IconRefresh} class="mr-1" />
          새로고침
        </Button>
      </>
    ));
  }

  // -- Context --
  const ctx: CrudDetailContext<TData> = {
    data,
    setData,
    info: () => info()!,
    busy: () => busyCount() > 0,
    hasChanges,
    save: handleSave,
    refresh: handleRefresh,
  };

  // -- Children Resolution --
  const rendered = children(() => local.children(ctx));
  const defs = createMemo(() => {
    const arr = rendered.toArray();
    return {
      tools: arr.find(isCrudDetailToolsDef) as CrudDetailToolsDef | undefined,
      before: arr.find(isCrudDetailBeforeDef) as CrudDetailBeforeDef | undefined,
      after: arr.find(isCrudDetailAfterDef) as CrudDetailAfterDef | undefined,
    };
  });

  const formContent = () =>
    rendered
      .toArray()
      .filter(
        (el) =>
          !isCrudDetailToolsDef(el) && !isCrudDetailBeforeDef(el) && !isCrudDetailAfterDef(el),
      );

  // -- Render --
  return (
    <>
      {/* Modal mode: Dialog.Action (refresh button in header) */}
      <Show when={isModal}>
        <Dialog.Action>
          <Button size={"sm"} variant={"ghost"} onClick={() => void handleRefresh()}>
            <Icon icon={IconRefresh} />
          </Button>
        </Dialog.Action>
      </Show>

      <BusyContainer
        ready={ready()}
        busy={busyCount() > 0}
        class={clsx("flex h-full flex-col", local.class)}
      >
        {/* Toolbar */}
        <Show when={(!isModal && !topbarCtx) || defs().tools}>
          <div class="flex gap-2 p-2 pb-0">
            <Show when={!topbarCtx && !isModal}>
              <Show when={canEdit() && local.submit}>
                <Button
                  size="sm"
                  theme="primary"
                  variant="ghost"
                  onClick={() => formRef?.requestSubmit()}
                >
                  <Icon icon={IconDeviceFloppy} class="mr-1" />
                  저장
                </Button>
              </Show>
              <Show
                when={
                  canEdit() &&
                  local.toggleDelete &&
                  info() &&
                  !info()!.isNew &&
                  (local.deletable ?? true)
                }
              >
                {(_) => (
                  <Button
                    size="sm"
                    theme="danger"
                    variant="ghost"
                    onClick={() => void handleToggleDelete()}
                  >
                    <Icon icon={info()!.isDeleted ? IconTrashOff : IconTrash} class="mr-1" />
                    {info()!.isDeleted ? "복구" : "삭제"}
                  </Button>
                )}
              </Show>
              <Button size="sm" theme="info" variant="ghost" onClick={() => void handleRefresh()}>
                <Icon icon={IconRefresh} class="mr-1" />
                새로고침
              </Button>
            </Show>
            <Show when={defs().tools}>{(toolsDef) => toolsDef().children}</Show>
          </div>
        </Show>

        {/* Before (outside form) */}
        <Show when={defs().before}>{(beforeDef) => beforeDef().children}</Show>

        {/* Form */}
        <form ref={formRef} class="flex-1 overflow-auto p-4" onSubmit={handleFormSubmit}>
          {formContent()}
        </form>

        {/* Last modified info */}
        <Show when={info()?.lastModifiedAt}>
          {(_) => (
            <div class="px-2 pb-1 text-xs text-base-400">
              최종 수정: {info()!.lastModifiedAt!.toFormatString("yyyy-MM-dd HH:mm")}
              <Show when={info()?.lastModifiedBy}> ({info()!.lastModifiedBy})</Show>
            </div>
          )}
        </Show>

        {/* After (outside form) */}
        <Show when={defs().after}>{(afterDef) => afterDef().children}</Show>

        {/* Modal mode: bottom bar */}
        <Show when={isModal && canEdit()}>
          <div class="flex gap-2 border-t border-base-200 px-3 py-1.5">
            <div class="flex-1" />
            <Show
              when={local.toggleDelete && info() && !info()!.isNew && (local.deletable ?? true)}
            >
              {(_) => (
                <Button variant={"solid"} theme="danger" onClick={() => void handleToggleDelete()}>
                  <Icon icon={info()!.isDeleted ? IconTrashOff : IconTrash} class="mr-1" />
                  {info()!.isDeleted ? "복구" : "삭제"}
                </Button>
              )}
            </Show>
            <Show when={local.submit}>
              <Button
                variant={"solid"}
                theme="primary"
                onClick={() => formRef?.requestSubmit()}
                class={"gap-1"}
              >
                <Icon icon={IconCheck} />
                확인
              </Button>
            </Show>
          </div>
        </Show>
      </BusyContainer>
    </>
  );
};

export const CrudDetail = CrudDetailBase as unknown as CrudDetailComponent;
CrudDetail.Tools = CrudDetailTools;
CrudDetail.Before = CrudDetailBefore;
CrudDetail.After = CrudDetailAfter;
