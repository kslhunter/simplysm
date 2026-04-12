import {
  type OutputEmitterRef,
  type WritableSignal,
  inject,
} from "@angular/core";
import type { ArrayOneWayDiffResult } from "@simplysm/core-common";
import { mark } from "../../core/mark";
import { SdToastProvider } from "../../core/toast/sd-toast.provider";
import { withBusy } from "../../core/withBusy";
import type { SdDataSheetItemPropInfo } from "./sd-data-sheet.types";

export function injectDataSheetInlineEditManager<TItem, TKey>(options: {
  busyCount: WritableSignal<number>;
  canEdit: () => boolean;
  items: WritableSignal<TItem[]>;
  submitted: OutputEmitterRef<boolean>;
  itemPropInfo: () => SdDataSheetItemPropInfo<TItem>;
  getItemInfoFn: (item: TItem) => { key: TKey };
  getDiffs: () => ArrayOneWayDiffResult<TItem>[];
  refresh: () => Promise<void>;
  getNewItemFn: () => (() => Promise<TItem> | TItem) | undefined;
  getSubmitFn: () =>
    | ((diffs: ArrayOneWayDiffResult<TItem>[]) => Promise<boolean> | boolean)
    | undefined;
  errorMessageFn: (err: unknown) => string;
}) {
  const sdToast = inject(SdToastProvider);

  async function doAddItem(): Promise<void> {
    const newItemFn = options.getNewItemFn();
    if (!newItemFn) return;

    await withBusy(options.busyCount, () =>
      sdToast.try(async () => {
        const newItem = await newItemFn();
        options.items.update((items) => [newItem, ...items]);
      }),
    );
  }

  async function doSubmit(opt?: {
    permCheck?: boolean;
    hideNoChangeMessage?: boolean;
  }): Promise<void> {
    if (options.busyCount() > 0) return;
    if (opt?.permCheck && !options.canEdit()) return;
    const submitFn = options.getSubmitFn();
    if (!submitFn) return;

    const diffs = options.getDiffs();

    if (diffs.length === 0) {
      if (!opt?.hideNoChangeMessage) {
        sdToast.info("변경사항이 없습니다.");
      }
      return;
    }

    await withBusy(options.busyCount, () =>
      sdToast.try(
        async () => {
          const result = await submitFn(diffs);
          if (!result) return;

          sdToast.success("저장되었습니다.");
          await options.refresh();
          options.submitted.emit(true);
        },
        (err) => options.errorMessageFn(err),
      ),
    );
  }

  function doToggleDeleteItem(item: TItem): void {
    if (!options.canEdit()) return;
    const propInfo = options.itemPropInfo();
    if (propInfo.isDeleted == null) return;

    if (options.getItemInfoFn(item).key == null) {
      options.items.update((items) => items.filter((item1) => item1 !== item));
      return;
    }

    (item[propInfo.isDeleted] as boolean) = !(item[propInfo.isDeleted] as boolean);
    mark(options.items);
  }

  return { doAddItem, doSubmit, doToggleDeleteItem };
}
