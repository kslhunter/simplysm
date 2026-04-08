import { booleanAttribute, Directive, input } from "@angular/core";
import { setupRevealOnShow } from "../utils/setups/setupRevealOnShow";

@Directive({
  selector: "[sdShowEffect]",
  standalone: true,
})
export class SdShowEffect {
  enabled = input.required({ alias: "sdShowEffect", transform: booleanAttribute });
  sdShowEffectType = input<"l2r" | "t2b">("t2b");

  constructor() {
    setupRevealOnShow(() => ({
      type: this.sdShowEffectType(),
      enabled: this.enabled(),
    }));
  }
}
