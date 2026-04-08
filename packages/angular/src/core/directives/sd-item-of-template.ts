import { Directive, input } from "@angular/core";

@Directive({
  selector: "ng-template[itemOf]",
  standalone: true,
})
export class SdItemOfTemplate<TItem> {
  itemOf = input.required<TItem[]>();

  static ngTemplateContextGuard<TContextItem>(
    _dir: SdItemOfTemplate<TContextItem>,
    _ctx: unknown,
  ): _ctx is SdItemOfTemplateContext<TContextItem> {
    return true;
  }
}

export interface SdItemOfTemplateContext<TItem> {
  $implicit: TItem;
  item: TItem;
  index: number;
  depth: number;
}
