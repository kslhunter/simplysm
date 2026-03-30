import { Component } from "@angular/core";
import { SdSidebarContainerControl } from "../../../../src/ui/navigation/sidebar/sd-sidebar-container.control";

@Component({
  selector: "sd-container-unit-test",
  template: `
    <sd-sidebar-container>
      <div class="inner">content</div>
    </sd-sidebar-container>
  `,
  standalone: true,
  imports: [SdSidebarContainerControl],
})
export class ContainerUnitTest {}

@Component({
  selector: "sd-container-router-test",
  template: `
    <sd-sidebar-container>content</sd-sidebar-container>
  `,
  standalone: true,
  imports: [SdSidebarContainerControl],
})
export class ContainerRouterTest {}
