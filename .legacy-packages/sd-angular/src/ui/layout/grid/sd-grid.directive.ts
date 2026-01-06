import { Directive } from "@angular/core";

@Directive({
  selector: "sd-grid,[sd-grid]",
  standalone: true,
  host: {
    class: "grid",
  },
})
export class SdGridDirective {}
