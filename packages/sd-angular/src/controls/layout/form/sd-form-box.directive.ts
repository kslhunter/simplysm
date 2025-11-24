import { Directive, input } from "@angular/core";
import { transformBoolean } from "../../../core/utils/transforms/tramsformBoolean";

@Directive({
  selector: "sd-form-box,[sd-form-box]",
  standalone: true,
  host: {
    "[class]": "clazz()",
  },
})
export class SdFormBoxDirective {
  inline = input(false, { transform: transformBoolean });

  clazz = () => [`form-box${this.inline() ? "-inline" : ""}`];
}
