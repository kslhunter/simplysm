import { Directive, input } from "@angular/core";
import { setupInvalid } from "../utils/setups/setupInvalid";

@Directive({
  selector: "[sdInvalid]",
  standalone: true,
})
export class SdInvalid {
  invalidMessage = input.required<string>({ alias: "sdInvalid" });

  constructor() {
    setupInvalid(() => this.invalidMessage());
  }
}
