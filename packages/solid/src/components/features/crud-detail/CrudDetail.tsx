import {
  children,
  createMemo,
  createSignal,
  createUniqueId,
  type JSX,
  onCleanup,
  onMount,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { registerCrud, unregisterCrud, activateCrud, isActiveCrud } from "../crudRegistry";
import { reconcile, unwrap } from "solid-js/store";
import { createControllableStore } from "../../../hooks/createControllableStore";
import { objClone, objEqual } from "@simplysm/core-common";
import { BusyContainer } from "../../feedback/busy/BusyContainer";
import { useNotification } from "../../feedback/notification/NotificationProvider";
import { Button } from "../../form-control/Button";
import { Icon } from "../../display/Icon";
import { createTopbarActions, TopbarContext } from "../../layout/topbar/TopbarContext";
import { Dialog } from "../../disclosure/Dialog";
import { createEventListener } from "@solid-primitives/event-listener";
import { useI18n } from "../../../providers/i18n/I18nContext";
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
    "close",
    "class",
  ]);

  const noti = useNotification();
  const i18n = useI18n();
  const topbarCtx = useContext(TopbarContext);
  // eslint-disable-next-line solid/reactivity -- local.close is stable (injected once by DialogProvider)
  const isInDialog = local.close !== undefined;

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

  const crudId = createUniqueId();

  // -- Load --
  async function doLoad() {
    setBusyCount((c) => c + 1);
    try {
      const result = await local.load();
      setData(reconcile(result.data) as any);
      originalData = objClone(result.data);
      setInfo(result.info);
    } catch (err) {
      noti.error(err, i18n.t("crudDetail.lookupFailed"));
    }
    setBusyCount((c) => c - 1);
    setReady(true);
  }

  onMount(() => {
    void doLoad();
  });
  onCleanup(() => unregisterCrud(crudId));

  createEventListener(() => formRef, "pointerdown", () => activateCrud(crudId));
  createEventListener(() => formRef, "focusin", () => activateCrud(crudId));

  // -- Change Detection --
  function hasChanges(): boolean {
    if (originalData == null) return false;
    return !objEqual(unwrap(data) as unknown, originalData as unknown);
  }

  // -- Refresh --
  async function handleRefresh() {
    if (hasChanges()) {
      if (!confirm(i18n.t("crudDetail.discardChanges"))) return;
    }
    await doLoad();
  }

  // -- Save --
  async function handleSave() {
    if (busyCount() > 0) return;
    if (!local.submit) return;

    const currentInfo = info();
    if (currentInfo && !currentInfo.isNew && !hasChanges()) {
      noti.info(i18n.t("crudDetail.notice"), i18n.t("crudDetail.noChanges"));
      return;
    }

    setBusyCount((c) => c + 1);
    try {
      const result = await local.submit(objClone(unwrap(data)));
      if (result) {
        noti.success(i18n.t("crudDetail.saveCompleted"), i18n.t("crudDetail.saveSuccess"));
        if (local.close) {
          local.close(true);
        } else {
          await doLoad();
        }
      }
    } catch (err) {
      noti.error(err, i18n.t("crudDetail.saveFailed"));
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
        noti.success(del ? i18n.t("crudDetail.deleteCompleted") : i18n.t("crudDetail.restoreCompleted"), del ? i18n.t("crudDetail.deleteSuccess") : i18n.t("crudDetail.restoreSuccess"));
        if (local.close) {
          local.close(true);
        } else {
          await doLoad();
        }
      }
    } catch (err) {
      noti.error(err, del ? i18n.t("crudDetail.deleteFailed") : i18n.t("crudDetail.restoreFailed"));
    }
    setBusyCount((c) => c - 1);
  }

  // -- Keyboard Shortcuts --
  createEventListener(document, "keydown", (e: KeyboardEvent) => {
    if (!isActiveCrud(crudId)) return;
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      e.stopImmediatePropagation();
      formRef?.requestSubmit();
    }
    if (e.ctrlKey && e.altKey && e.key === "l") {
      e.preventDefault();
      e.stopImmediatePropagation();
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
            {i18n.t("crudDetail.save")}
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
              {info()!.isDeleted ? i18n.t("crudDetail.restore") : i18n.t("crudDetail.delete")}
            </Button>
          )}
        </Show>
        <Button size="lg" variant="ghost" theme="info" onClick={() => void handleRefresh()}>
          <Icon icon={IconRefresh} class="mr-1" />
          {i18n.t("crudDetail.refresh")}
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
      {/* Dialog mode: Dialog.Action (refresh button in header) */}
      <Show when={isInDialog}>
        <Dialog.Action>
          <Button size={"sm"} variant={"ghost"} onClick={() => void handleRefresh()}>
            <Icon icon={IconRefresh} />
          </Button>
        </Dialog.Action>
      </Show>

      <BusyContainer
        ready={ready()}
        busy={busyCount() > 0}
        class={clsx("flex h-full flex-col gap-2", local.class)}
      >
        {/* Toolbar */}
        <Show when={(!isInDialog && !topbarCtx) || defs().tools}>
          <div class="flex gap-2 pb-0">
            <Show when={!topbarCtx && !isInDialog}>
              <Show when={canEdit() && local.submit}>
                <Button
                  size="sm"
                  theme="primary"
                  variant="ghost"
                  onClick={() => formRef?.requestSubmit()}
                >
                  <Icon icon={IconDeviceFloppy} class="mr-1" />
                  {i18n.t("crudDetail.save")}
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
                    {info()!.isDeleted ? i18n.t("crudDetail.restore") : i18n.t("crudDetail.delete")}
                  </Button>
                )}
              </Show>
              <Button size="sm" theme="info" variant="ghost" onClick={() => void handleRefresh()}>
                <Icon icon={IconRefresh} class="mr-1" />
                {i18n.t("crudDetail.refresh")}
              </Button>
            </Show>
            <Show when={defs().tools}>{(toolsDef) => toolsDef().children}</Show>
          </div>
        </Show>

        {/* Before (outside form) */}
        <Show when={defs().before}>{(beforeDef) => beforeDef().children}</Show>

        {/* Form */}
        <form ref={(el) => { formRef = el; registerCrud(crudId, el); }} class="flex-1 overflow-auto" onSubmit={handleFormSubmit}>
          {formContent()}
        </form>

        {/* Last modified info */}
        <Show when={info()?.lastModifiedAt}>
          {(_) => (
            <div class="px-2 pb-1 text-xs text-base-400">
              {i18n.t("crudDetail.lastModified")}: {info()!.lastModifiedAt!.toFormatString("yyyy-MM-dd HH:mm")}
              <Show when={info()?.lastModifiedBy}> ({info()!.lastModifiedBy})</Show>
            </div>
          )}
        </Show>

        {/* After (outside form) */}
        <Show when={defs().after}>{(afterDef) => afterDef().children}</Show>

        {/* Dialog mode: bottom bar */}
        <Show when={isInDialog && canEdit()}>
          <div class="flex gap-2 border-t border-base-200 px-3 py-1.5">
            <div class="flex-1" />
            <Show
              when={local.toggleDelete && info() && !info()!.isNew && (local.deletable ?? true)}
            >
              {(_) => (
                <Button variant={"solid"} theme="danger" onClick={() => void handleToggleDelete()}>
                  <Icon icon={info()!.isDeleted ? IconTrashOff : IconTrash} class="mr-1" />
                  {info()!.isDeleted ? i18n.t("crudDetail.restore") : i18n.t("crudDetail.delete")}
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
                {i18n.t("crudDetail.confirm")}
              </Button>
            </Show>
          </div>
        </Show>
      </BusyContainer>
    </>
  );
};

//#region Export
export const CrudDetail = Object.assign(CrudDetailBase, {
  Tools: CrudDetailTools,
  Before: CrudDetailBefore,
  After: CrudDetailAfter,
}) as unknown as CrudDetailComponent;
//#endregion
