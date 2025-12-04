import { Signal, WritableSignal } from "@angular/core";
import { $computed } from "../bindings/$computed";

export class SdExpandingManager<T> {
  constructor(private readonly _options: {
    items: Signal<T[]>;
    expandedItems: WritableSignal<T[]>;
    getChildrenFn: Signal<((item: T, index: number) => T[] | undefined) | undefined>;
    sort: (items: T[]) => T[];
  }) {
  }

  private readonly _itemDefs = $computed(() => {
    let rootItems: ISdExpandItemDef<T>[] = this._options.items().map((item) => ({
      item,
      parentDef: undefined,
      hasChildren: false,
      depth: 0,
    }));

    const getChildrenFn = this._options.getChildrenFn();
    if (!getChildrenFn) return rootItems;

    const queue: ISdExpandItemDef<T>[] = [...rootItems];
    const result: ISdExpandItemDef<T>[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const children = getChildrenFn(current.item, result.length - 1) ?? [];
      if (children.length > 0) {
        current.hasChildren = true;

        let displayChildren = children;
        displayChildren = this._options.sort(displayChildren);

        const childDefs: ISdExpandItemDef<T>[] = displayChildren.map((child) => ({
          item: child,
          parentDef: current,
          hasChildren: false,
          depth: current.depth + 1,
        }));

        queue.push(...childDefs);
      }
    }

    return result;
  });

  flattedItems = $computed(() => this._itemDefs().map(item => item.item));

  private readonly _expandableItems = $computed(() =>
    this._itemDefs().filter((itemDef) => itemDef.hasChildren).map((itemDef) => itemDef.item),
  );

  hasExpandable = $computed(() => this._expandableItems().length > 0);

  isAllExpanded = $computed(() =>
    this._expandableItems().length <= this._options.expandedItems().length &&
    this._expandableItems().every((item) => this._options.expandedItems().includes(item)),
  );

  toggleAll() {
    if (this.isAllExpanded()) {
      this._options.expandedItems.set([]);
    }
    else {
      const expandedItems = this._itemDefs()
        .filter((item) => item.hasChildren)
        .map((item) => item.item);
      this._options.expandedItems.set(expandedItems);
    }
  }

  toggle(item: T) {
    this._options.expandedItems.update((v) => {
      const r = [...v];
      if (r.includes(item)) {
        r.remove(item);
      }
      else {
        r.push(item);
      }
      return r;
    });
  }

  getIsVisible(item: T) {
    let itemDef = this.getDef(item);
    while (itemDef.parentDef) {
      if (!this._options.expandedItems().some((item1) => item1 === itemDef.parentDef!.item)) {
        return false;
      }

      itemDef = itemDef.parentDef;
    }
    return true;
  }

  getDef(item: T) {
    return this._itemDefs().single(item1 => item1.item === item)!;
  }
}

export interface ISdExpandItemDef<T> {
  item: T;
  parentDef: ISdExpandItemDef<T> | undefined;
  hasChildren: boolean;
  depth: number;
}
