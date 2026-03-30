import { Component } from "@angular/core";
import { SdTopbarContainerControl } from "../../../../src/ui/navigation/topbar/sd-topbar-container.control";

@Component({
  selector: "sd-topbar-container-unit-test",
  template: `<sd-topbar-container><div>content</div></sd-topbar-container>`,
  standalone: true,
  imports: [SdTopbarContainerControl],
  styles: [
    `
      :host {
        display: block;
        height: 500px;
      }
    `,
  ],
})
export class TopbarContainerUnitTest {}
