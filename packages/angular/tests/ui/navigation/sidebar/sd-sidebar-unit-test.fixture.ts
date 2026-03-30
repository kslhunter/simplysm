import { Component } from "@angular/core";
import { SdSidebarContainerControl } from "../../../../src/ui/navigation/sidebar/sd-sidebar-container.control";
import { SdSidebarControl } from "../../../../src/ui/navigation/sidebar/sd-sidebar.control";

@Component({
  selector: "sd-sidebar-unit-test",
  template: `
    <sd-sidebar-container>
      <sd-sidebar>Sidebar</sd-sidebar>
      <div class="main">Main</div>
    </sd-sidebar-container>
  `,
  standalone: true,
  imports: [SdSidebarContainerControl, SdSidebarControl],
})
export class SidebarUnitTest {}
