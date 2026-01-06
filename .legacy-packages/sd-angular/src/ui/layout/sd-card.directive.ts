import { Directive } from "@angular/core";

@Directive({
  selector: "sd-card,[sd-card]",
  standalone: true,
  host: {
    class: "card",
  },
})
export class SdCardDirective {}
