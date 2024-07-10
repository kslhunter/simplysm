import {Directive, Input} from "@angular/core";

@Directive({
  selector: 'ng-template[itemOf]',
  standalone: true
})
export class SdItemOfTemplateDirective<TItem> {
  @Input({required: true}) itemOf!: TItem[];

  static ngTemplateContextGuard<TContextItem>(
    dir: SdItemOfTemplateDirective<TContextItem>,
    ctx: unknown
  ): ctx is SdItemOfTemplateContext<TContextItem> {
    return true;
  }
}

export interface SdItemOfTemplateContext<TItem> {
  $implicit: TItem;
  item: TItem;
  index: number;
  depth: number;
}