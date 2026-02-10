import type { Signal } from "@angular/core";
import { $computed } from "../../../../core/utils/bindings/$computed";
import { $signal } from "../../../../core/utils/bindings/$signal";

export class SdSheetColumnFixingManager {
  private readonly _widths = $signal<Record<number, number>>({});

  constructor(private readonly _options: { fixedLength: Signal<number> }) {}

  fixedLeftMap = $computed(() => {
    const fixedLength = this._options.fixedLength();
    const widths = this._widths();

    const result = new Map<number, number>();
    let nextLeft: number = 0;
    for (const keyC of Object.keys(widths).orderBy()) {
      const c = Number.parseInt(keyC);

      if (c < fixedLength) {
        result.set(c, nextLeft);
        nextLeft += widths[c];
      }
    }

    return result;
  });

  registerWidth(col: number, width: number) {
    if (this._widths()[col] !== width) {
      this._widths.update((v) => ({
        ...v,
        [col]: width,
      }));
    }
  }
}
