import { Directive } from "@angular/core";

@Directive({
  selector: "sd-form-box-item,[sd-form-box-item]",
  standalone: true,
  host: {
    class: "form-box-item",
  },
})
export class SdFormBoxItemDirective {}
