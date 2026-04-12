import { type Signal, type WritableSignal, effect, untracked } from "@angular/core";

export function setupCumulateSelectedKeys<TItem, TKey>(options: {
  items: Signal<TItem[]>;
  selectedItems: WritableSignal<TItem[]>;
  selectedItemKeys: WritableSignal<TKey[]>;
  selectMode: () => "single" | "multi" | undefined;
  keySelectorFn: (item: TItem) => TKey | undefined;
}): void {
  // items 변경 시 selectedItems에서 현재 items에 존재하지 않는 항목 제거
  // selectedItems는 untracked로 읽어 effect 재실행 방지
  effect(() => {
    const items = options.items();
    const selectedItems = untracked(() => options.selectedItems());
    if (selectedItems.length === 0) return;

    const itemKeySet = new Set(
      items.map((item) => options.keySelectorFn(item)).filter((k) => k !== undefined),
    );
    const filtered = selectedItems.filter((item) => {
      const key = options.keySelectorFn(item);
      return key !== undefined && itemKeySet.has(key);
    });

    if (filtered.length !== selectedItems.length) {
      options.selectedItems.set(filtered);
    }
  });

  // selectedItems 변경 시 selectedItemKeys 갱신
  effect(() => {
    const selectedItems = options.selectedItems();
    const keys = selectedItems
      .map((item) => options.keySelectorFn(item))
      .filter((k): k is TKey => k !== undefined);
    options.selectedItemKeys.set(keys);
  });
}
