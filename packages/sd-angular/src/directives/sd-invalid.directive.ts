import { Directive, input } from "@angular/core";
import { useInvalid } from "../utils/use-invalid";

@Directive({
  selector: "[sd-invalid]",
  standalone: true,
})
export class SdInvalidDirective {
  invalidMessage = input.required<string | undefined>({ alias: "sd-invalid" });

  constructor() {
    useInvalid(this.invalidMessage);
  }
}
