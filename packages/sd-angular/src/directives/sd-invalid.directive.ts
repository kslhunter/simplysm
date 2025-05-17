import { Directive, input } from "@angular/core";
import { setupInvalid } from "../utils/setups/setup-invalid";

@Directive({
  selector: "[sd-invalid]",
  standalone: true,
})
export class SdInvalidDirective {
  invalidMessage = input.required<string>({ alias: "sd-invalid" });

  constructor() {
    setupInvalid(() => this.invalidMessage());
  }
}
