import { Directive, input } from "@angular/core";
import { transformBoolean } from "../utils/type-tramsforms";
import { setupRevealOnShow } from "../utils/setups/setup-reveal-on-show";

@Directive({
  selector: "[sd-show-effect]",
  standalone: true,
})
export class SdShowEffectDirective {
  enabled = input.required({ alias: "sd-show-effect", transform: transformBoolean });
  type = input<"l2r" | "t2b">("t2b", { alias: "sd-show-effect-type" });

  constructor() {
    setupRevealOnShow(() => ({
      type: this.type(),
      enabled: this.enabled(),
    }));
  }
}
