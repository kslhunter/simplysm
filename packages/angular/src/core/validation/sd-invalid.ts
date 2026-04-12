import { Directive, input } from "@angular/core";
import { setupInvalid } from "./setupInvalid";

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
