import { type Signal, type WritableSignal, effect, inject } from "@angular/core";
import { type ArrayOneWayDiffResult, obj } from "@simplysm/core-common";
import { SdToastProvider } from "../../core/providers/sd-toast.provider";
import { SdSharedDataProvider } from "../../core/providers/sd-shared-data.provider";
import { withBusy } from "../../core/utils/withBusy";
import type { SdDataSheetSearchResult } from "./sd-data-sheet.types";

export function injectDataSheetRefreshManager<
  TItem,
  TKey extends string | number | undefined,
>(options: {
  busyCount: WritableSignal<number>;
  initialized: WritableSignal<boolean>;
  canUse: () => boolean;
  items: WritableSignal<TItem[]>;
  selectedItems: WritableSignal<TItem[]>;
  pageLength: WritableSignal<number>;
  summaryData: WritableSignal<Partial<TItem>>;
  page: Signal<number>;
  lastFilter: Signal<unknown>;
  sortingDefs: Signal<unknown[]>;
  getItemInfoFn: (item: TItem) => { key: TKey };
  search: (
    usePagination: boolean,
  ) => Promise<SdDataSheetSearchResult<TItem>> | SdDataSheetSearchResult<TItem>;
  prepareRefreshEffect?: () => void;
  getDiffsExcludes: () => string[] | undefined;
}) {
  const sdToast = inject(SdToastProvider);
  const sdSharedData = inject(SdSharedDataProvider);
  let itemsSnapshot: TItem[] = [];

  async function refresh(): Promise<void> {
    const result = await options.search(true);
    options.items.set(result.items);
    itemsSnapshot = obj.clone(result.items);

    options.pageLength.set(result.pageLength ?? 0);
    options.summaryData.set(result.summary ?? {});

    const selectedKeySet = new Set(
      options.selectedItems().map((sel) => options.getItemInfoFn(sel).key),
    );
    options.selectedItems.set(
      options.items().filter((item) => selectedKeySet.has(options.getItemInfoFn(item).key)),
    );
  }

  function getDiffs(): ArrayOneWayDiffResult<TItem>[] {
    const diffsExcludes = options.getDiffsExcludes();
    return options
      .items()
      .oneWayDiffs(
        itemsSnapshot,
        (item) => options.getItemInfoFn(item).key,
        diffsExcludes ? { excludes: diffsExcludes } : undefined,
      )
      .filter((d) => d.type !== "same");
  }

  effect((onCleanup) => {
    options.page();
    options.lastFilter();
    options.sortingDefs();
    options.prepareRefreshEffect?.();

    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });

    queueMicrotask(async () => {
      if (cancelled) return;
      if (!options.canUse()) {
        options.initialized.set(true);
        return;
      }

      await withBusy(options.busyCount, () =>
        sdToast.try(async () => {
          await sdSharedData.wait();
          await refresh();
        }),
      );
      options.initialized.set(true);
    });
  });

  return { refresh, getDiffs };
}
