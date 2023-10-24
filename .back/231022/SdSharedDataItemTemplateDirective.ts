import {Directive, Input} from "@angular/core";

@Directive({
  selector: 'ng-template[shared]',
})
export class SdSharedDataItemTemplateDirective<TItem> {
  @Input('shared') data!: TItem[];

  static ngTemplateContextGuard<TContextItem>(
    dir: SdSharedDataItemTemplateDirective<TContextItem>,
    ctx: unknown
  ): ctx is SdSharedDataItemTemplateContext<TContextItem> {
    return true;
  }
}

export interface SdSharedDataItemTemplateContext<TItem> {
  $implicit: TItem;
  item: TItem;
  index: number;
  depth: number;
}
