import { Directive } from "@angular/core";

@Directive({
  selector: "sd-pane,[sdPane]",
  standalone: true,
  host: {
    class: "fill",
    style: "display: block;",
  },
})
export class SdPane {}
