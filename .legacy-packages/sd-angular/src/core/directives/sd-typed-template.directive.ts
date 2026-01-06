import { Directive, Input } from "@angular/core";

@Directive({
  selector: "ng-template[typed]",
  standalone: true,
})
export class SdTypedTemplateDirective<T> {
  @Input({ required: true }) typed!: T;

  static ngTemplateContextGuard<TypeToken>(
    _dir: SdTypedTemplateDirective<TypeToken>,
    _ctx: unknown,
  ): _ctx is TypeToken {
    return true;
  }
}
