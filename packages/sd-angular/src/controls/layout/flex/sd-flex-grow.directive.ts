import { Directive, input } from "@angular/core";
import { $computed } from "../../../utils/bindings/$computed";

@Directive({
  selector: "[sd-flex-grow]",
  standalone: true,
  host: {
    "[class]": "clazz()",
  },
})
export class SdFlexGrowDirective {
  grow = input.required<"auto" | "fill" | "min">({ alias: "sd-flex-grow" });

  clazz = $computed(() => `flex-${this.grow()}`);
}
