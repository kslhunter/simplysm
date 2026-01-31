import { Directive, Input } from "@angular/core";

@Directive({
  selector: "ng-template[cell]",
  standalone: true,
})
export class SdSheetColumnCellTemplateDirective<TItem> {
  @Input({ required: true }) cell!: TItem[];

  static ngTemplateContextGuard<TContextItem>(
    dir: SdSheetColumnCellTemplateDirective<TContextItem>,
    ctx: unknown,
  ): ctx is SdSheetColumnCellTemplateContext<TContextItem> {
    return true;
  }
}

export interface SdSheetColumnCellTemplateContext<TItem> {
  $implicit: TItem;
  item: TItem;
  index: number;
  depth: number;
  edit: boolean;
}
