import {
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
  inject,
} from "@angular/core";
import { SdToastProvider } from "../../core/providers/sd-toast.provider";
import { withBusy } from "../../core/utils/withBusy";
import type { ISelectModalOutputResult } from "../../core/types/select-modal-output-result";

export function useDataSheetModalEditManager<TItem, TKey>(options: {
  busyCount: WritableSignal<number>;
  canEdit: () => boolean;
  selectedItemKeys: Signal<TKey[]>;
  selectedItems: Signal<TItem[]>;
  close: OutputEmitterRef<ISelectModalOutputResult<TItem>>;
  refresh: () => Promise<void>;
  getEditItemFn: () =>
    | ((item?: TItem) => Promise<boolean | undefined> | boolean | undefined)
    | undefined;
  getToggleDeleteItemsFn: () =>
    | ((del: boolean) => Promise<boolean>)
    | undefined;
  errorMessageFn: (err: unknown) => string;
}) {
  const sdToast = inject(SdToastProvider);

  async function doEditItem(item?: TItem): Promise<void> {
    const editItemFn = options.getEditItemFn();
    if (!editItemFn) return;

    const result = await editItemFn(item);
    if (!result) return;

    await withBusy(options.busyCount, () =>
      sdToast.try(async () => {
        await options.refresh();
      }),
    );
  }

  async function doToggleDeleteItems(del: boolean): Promise<void> {
    if (!options.canEdit()) return;
    const toggleDeleteItemsFn = options.getToggleDeleteItemsFn();
    if (!toggleDeleteItemsFn) return;

    await withBusy(options.busyCount, () =>
      sdToast.try(
        async () => {
          const result = await toggleDeleteItemsFn(del);
          if (!result) return;

          await options.refresh();
          sdToast.success(`${del ? "삭제" : "복구"} 되었습니다.`);
        },
        (err) => options.errorMessageFn(err),
      ),
    );
  }

  function doModalConfirm(): void {
    options.close.emit({
      selectedItemKeys: options.selectedItemKeys(),
      selectedItems: options.selectedItems(),
    });
  }

  function doModalCancel(): void {
    options.close.emit({
      selectedItemKeys: [],
      selectedItems: [],
    });
  }

  return { doEditItem, doToggleDeleteItems, doModalConfirm, doModalCancel };
}
