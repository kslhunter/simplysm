import {Directive, Input} from "@angular/core";

@Directive({
  selector: "ng-template[typed]",
  standalone: true
})
export class SdTypedTemplateDirective<T> {
  @Input({alias: "typed", required: true})
  typeToken!: T;

  static ngTemplateContextGuard<TypeToken>(
    _dir: SdTypedTemplateDirective<TypeToken>,
    _ctx: unknown
  ): _ctx is TypeToken {
    return true;
  }
}