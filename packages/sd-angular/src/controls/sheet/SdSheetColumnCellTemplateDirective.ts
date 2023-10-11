import {Directive, Input} from "@angular/core";

@Directive({
  selector: 'ng-template[cell]',
})
export class SdSheetColumnCellTemplateDirective<TItem> {
  @Input('cell') data!: TItem[];

  static ngTemplateContextGuard<TContextItem>(
    dir: SdSheetColumnCellTemplateDirective<TContextItem>,
    ctx: unknown
  ): ctx is SdSheetColumnCellTemplateContext<TContextItem> {
    return true;
  }
}

export interface SdSheetColumnCellTemplateContext<TItem> {
  $implicit: TItem;
  item: TItem;
  index: number;
  depth: number;
  edit: boolean
}
