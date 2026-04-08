import { Directive } from "@angular/core";

@Directive({
  selector: "sd-card,[sdCard]",
  standalone: true,
  host: {
    class: "card",
  },
})
export class SdCard {}
