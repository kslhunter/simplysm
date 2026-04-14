import { Directive, input } from "@angular/core";
import type { SdSheetCellContext } from "./sd-sheet-column";

@Directive({
  selector: "ng-template[cell]",
  standalone: true,
})
export class SdSheetColumnCellTemplate<T> {
  cell = input.required<T[]>();

  static ngTemplateContextGuard<TContextItem>(
    _dir: SdSheetColumnCellTemplate<TContextItem>,
    _ctx: unknown,
  ): _ctx is SdSheetCellContext<TContextItem> {
    return true;
  }
}
