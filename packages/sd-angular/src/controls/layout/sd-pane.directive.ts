import { Directive } from "@angular/core";

@Directive({
  selector: "sd-pane,[sd-pane]",
  standalone: true,
  host: {
    class: "fill",
    style: "display: block;",
  },
})
export class SdPaneDirective {}
