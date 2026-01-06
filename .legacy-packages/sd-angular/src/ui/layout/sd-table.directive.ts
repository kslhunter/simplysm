import { Directive } from "@angular/core";

@Directive({
  selector: "sd-table,[sd-table]",
  standalone: true,
  host: {
    "class": "table",
    "[style.display]": "'table'",
  },
})
export class SdTableDirective {}
