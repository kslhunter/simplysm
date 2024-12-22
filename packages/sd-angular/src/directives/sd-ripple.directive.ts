import { Directive, input } from "@angular/core";
import { transformBoolean } from "../utils/type-tramsforms";
import { useRipple } from "../utils/use-ripple";

@Directive({
  selector: "[sd-ripple]",
  standalone: true,
})
export class SdRippleDirective {
  enabled = input.required({ alias: "sd-ripple", transform: transformBoolean });

  constructor() {
    useRipple(() => this.enabled());
  }
}
