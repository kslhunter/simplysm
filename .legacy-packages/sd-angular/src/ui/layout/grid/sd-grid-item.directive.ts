import { Directive, input } from "@angular/core";
import { $computed } from "../../../core/utils/bindings/$computed";

@Directive({
  selector: "sd-grid-item,[sd-grid-item]",
  standalone: true,
  host: {
    "[class]": "clazz()",
  },
})
export class SdGridItemDirective {
  colSpan = input<number>(1);
  colSpanSm = input<number>();
  colSpanXs = input<number>();
  colSpanXxs = input<number>();

  clazz = $computed(() => [
    `grid-${this.colSpan()}`,
    ...(this.colSpanSm() != null ? [`grid-sm-${this.colSpanSm()}`] : []),
    ...(this.colSpanXs() != null ? [`grid-xs-${this.colSpanXs()}`] : []),
    ...(this.colSpanXxs() != null ? [`grid-xxs-${this.colSpanXxs()}`] : []),
  ]);
}
