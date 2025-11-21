import { Directive } from "@angular/core";

@Directive({
  selector: "sd-form-table,[sd-form-table]",
  standalone: true,
  host: {
    "class": "form-table",
    "[style.display]": "'table'",
  },
})
export class SdFormTableDirective {}
