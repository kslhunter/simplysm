import { Directive, Input } from "@angular/core";

@Directive({
  selector: "ng-template[cell]",
  standalone: true,
})
export class SdSheet2ColumnCellTemplateDirective<TItem> {
  @Input({ required: true }) cell!: TItem[];

  static ngTemplateContextGuard<TContextItem>(
    dir: SdSheet2ColumnCellTemplateDirective<TContextItem>,
    ctx: unknown,
  ): ctx is SdSheet2ColumnCellTemplateContext<TContextItem> {
    return true;
  }
}

export interface SdSheet2ColumnCellTemplateContext<TItem> {
  $implicit: TItem;
  item: TItem;
  index: number;
}
