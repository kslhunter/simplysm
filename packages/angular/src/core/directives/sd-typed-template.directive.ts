import { Directive, input } from "@angular/core";

@Directive({
  selector: "ng-template[typed]",
  standalone: true,
})
export class SdTypedTemplateDirective<T> {
  typed = input.required<T>();

  static ngTemplateContextGuard<TypeToken>(
    _dir: SdTypedTemplateDirective<TypeToken>,
    _ctx: unknown,
  ): _ctx is TypeToken {
    return true;
  }
}
