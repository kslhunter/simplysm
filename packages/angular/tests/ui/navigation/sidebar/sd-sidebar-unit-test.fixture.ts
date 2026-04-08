import { Component } from "@angular/core";
import { SdSidebarContainer } from "../../../../src/ui/navigation/sidebar/sd-sidebar-container";
import { SdSidebar } from "../../../../src/ui/navigation/sidebar/sd-sidebar";

@Component({
  selector: "sd-sidebar-unit-test",
  template: `
    <sd-sidebar-container>
      <sd-sidebar>Sidebar</sd-sidebar>
      <div class="main">Main</div>
    </sd-sidebar-container>
  `,
  standalone: true,
  imports: [SdSidebarContainer, SdSidebar],
})
export class SidebarUnitTest {}
