import { booleanAttribute, Directive, input } from "@angular/core";
import { setupRipple } from "../utils/setups/setupRipple";

@Directive({
  selector: "[sdRipple]",
  standalone: true,
})
export class SdRipple {
  enabled = input.required({ alias: "sdRipple", transform: booleanAttribute });

  constructor() {
    setupRipple(() => this.enabled());
  }
}
