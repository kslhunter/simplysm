import { Directive, input } from "@angular/core";
import { transformBoolean } from "../utils/transforms";
import { useRipple } from "../utils/useRipple";

@Directive({
  selector: "[sdUseRipple]",
  standalone: true,
})
export class SdUseRippleDirective {
  sdUseRipple = input.required({ transform: transformBoolean });

  constructor() {
    useRipple(() => this.sdUseRipple());
  }
}
