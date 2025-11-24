import { Directive, input } from "@angular/core";
import { transformBoolean } from "../utils/transforms/tramsformBoolean";
import { setupRipple } from "../utils/setups/setupRipple";

@Directive({
  selector: "[sd-ripple]",
  standalone: true,
})
export class SdRippleDirective {
  enabled = input.required({ alias: "sd-ripple", transform: transformBoolean });

  constructor() {
    setupRipple(() => this.enabled());
  }
}
