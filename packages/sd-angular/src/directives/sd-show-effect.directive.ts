import { Directive, input } from "@angular/core";
import { transformBoolean } from "../utils/type-tramsforms";
import { useShowEffect } from "../utils/use-show-effect";

@Directive({
  selector: "[sd-show-effect]",
  standalone: true,
})
export class SdShowEffectDirective {
  enabled = input.required({ alias: "sd-show-effect", transform: transformBoolean });
  type = input<"l2r" | "t2b">("t2b");

  constructor() {
    useShowEffect(() => ({
      type: this.type(),
      enabled: this.enabled(),
    }));
  }
}
