import { Component } from "@angular/core";
import { SdTopbarContainer } from "../../../../src/ui/navigation/topbar/sd-topbar-container";
import { SdTopbar } from "../../../../src/ui/navigation/topbar/sd-topbar";

@Component({
  selector: "sd-topbar-container-layout-test",
  template: `
    <sd-topbar-container>
      <sd-topbar>Topbar</sd-topbar>
      <div class="main-content">Main Content</div>
    </sd-topbar-container>
  `,
  standalone: true,
  imports: [SdTopbarContainer, SdTopbar],
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
