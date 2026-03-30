import { Component } from "@angular/core";
import { SdTopbarContainerControl } from "../../../../src/ui/navigation/topbar/sd-topbar-container.control";
import { SdTopbarControl } from "../../../../src/ui/navigation/topbar/sd-topbar.control";

@Component({
  selector: "sd-topbar-container-layout-test",
  template: `
    <sd-topbar-container>
      <sd-topbar>Topbar</sd-topbar>
      <div class="main-content">Main Content</div>
    </sd-topbar-container>
  `,
  standalone: true,
  imports: [SdTopbarContainerControl, SdTopbarControl],
  styles: [
    `
      :host {
        display: block;
        height: 600px;
      }
    `,
  ],
})
export class TopbarContainerLayoutTest {}
