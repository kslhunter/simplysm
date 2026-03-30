import { booleanAttribute, Directive, input } from "@angular/core";
import { setupRipple } from "../utils/setups/setupRipple";

@Directive({
  selector: "[sd-ripple]",
  standalone: true,
})
export class SdRippleDirective {
  enabled = input.required({ alias: "sd-ripple", transform: booleanAttribute });

  constructor() {
    setupRipple(() => this.enabled());
  }
}
