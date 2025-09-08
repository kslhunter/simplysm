import { Directive, input } from "@angular/core";
import { transformBoolean } from "../utils/transforms/tramsformBoolean";
import { setupRevealOnShow } from "../utils/setups/setupRevealOnShow";

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
