import { Directive, input } from "@angular/core";

@Directive({
  selector: "ng-template[typed]",
  standalone: true,
})
export class SdTypedTemplate<T> {
  typed = input.required<T>();

  static ngTemplateContextGuard<TypeToken>(
    _dir: SdTypedTemplate<TypeToken>,
    _ctx: unknown,
  ): _ctx is TypeToken {
    return true;
  }
}
