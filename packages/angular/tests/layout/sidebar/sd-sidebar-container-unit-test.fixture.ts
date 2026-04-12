import { Component } from "@angular/core";
import { SdSidebarContainer } from "../../../src/layout/sidebar/sd-sidebar-container";

@Component({
  selector: "sd-container-unit-test",
  template: `
    <sd-sidebar-container>
      <div class="inner">content</div>
    </sd-sidebar-container>
  `,
  standalone: true,
  imports: [SdSidebarContainer],
})
export class ContainerUnitTest {}

@Component({
  selector: "sd-container-router-test",
  template: `
    <sd-sidebar-container>content</sd-sidebar-container>
  `,
  standalone: true,
  imports: [SdSidebarContainer],
})
export class ContainerRouterTest {}
