import { type Signal, type WritableSignal, effect, signal } from "@angular/core";
import { obj } from "@simplysm/core-common";

export function useDataSheetFilterManager<TFilter extends Record<string, any>>(options: {
  bindFilter: () => TFilter;
  busyCount: Signal<number>;
  canUse: () => boolean;
  page: WritableSignal<number>;
  checkIgnoreChanges: () => boolean;
}) {
  const filter = signal<TFilter>({} as TFilter);
  const lastFilter = signal<TFilter>({} as TFilter);

  effect(() => {
    const f = options.bindFilter();
    filter.set(f);
    lastFilter.set(obj.clone(f));
  });

  function doFilterSubmit(): void {
    if (options.busyCount() > 0) return;
    if (!options.canUse()) return;
    if (!options.checkIgnoreChanges()) return;

    options.page.set(0);
    lastFilter.set(obj.clone(filter()));
  }

  return { filter, lastFilter, doFilterSubmit };
}
