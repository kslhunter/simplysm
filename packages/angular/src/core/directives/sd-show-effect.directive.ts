import { booleanAttribute, Directive, input } from "@angular/core";
import { setupRevealOnShow } from "../utils/setups/setupRevealOnShow";

@Directive({
  selector: "[sd-show-effect]",
  standalone: true,
})
export class SdShowEffectDirective {
  enabled = input.required({ alias: "sd-show-effect", transform: booleanAttribute });
  sdShowEffectType = input<"l2r" | "t2b">("t2b");

  constructor() {
    setupRevealOnShow(() => ({
      type: this.sdShowEffectType(),
      enabled: this.enabled(),
    }));
  }
}
