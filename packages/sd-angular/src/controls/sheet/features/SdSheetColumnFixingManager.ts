import { Signal } from "@angular/core";
import { $computed } from "../../../utils/bindings/$computed";
import { $signal } from "../../../utils/bindings/$signal";

export class SdSheetColumnFixingManager {
  #widths = $signal<Record<number, number>>({});

  constructor(private readonly _options: { fixedLength: Signal<number> }) {
  }

  fixedLeftMap = $computed(() => {
    const fixedLength = this._options.fixedLength();
    const widths = this.#widths();

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
    if (this.#widths()[col] !== width) {
      this.#widths.update(v => ({
        ...v,
        [col]: width,
      }));
    }
  }
}
