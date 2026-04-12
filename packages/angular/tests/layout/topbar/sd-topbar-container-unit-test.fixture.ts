import { Component } from "@angular/core";
import { SdTopbarContainer } from "../../../src/layout/topbar/sd-topbar-container";

@Component({
  selector: "sd-topbar-container-unit-test",
  template: `<sd-topbar-container><div>content</div></sd-topbar-container>`,
  standalone: true,
  imports: [SdTopbarContainer],
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
