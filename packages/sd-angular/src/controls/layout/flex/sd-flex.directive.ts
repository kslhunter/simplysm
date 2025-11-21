import { Directive, input } from "@angular/core";
import { transformBoolean } from "../../../utils/transforms/tramsformBoolean";

@Directive({
  selector: "sd-flex,[sd-flex]",
  standalone: true,
  host: {
    "[class]": "clazz()",
  },
})
export class SdFlexDirective {
  vertical = input(false, { transform: transformBoolean });
  inline = input(false, { transform: transformBoolean });

  clazz = () => [`flex${this.vertical() ? "-column" : "-row"}${this.inline() ? "-inline" : ""}`];
}
