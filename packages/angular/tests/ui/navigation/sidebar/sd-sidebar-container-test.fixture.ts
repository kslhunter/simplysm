import { Component } from "@angular/core";
import { SdSidebarContainerControl } from "../../../../src/ui/navigation/sidebar/sd-sidebar-container.control";
import { SdSidebarControl } from "../../../../src/ui/navigation/sidebar/sd-sidebar.control";

@Component({
  selector: "sd-sidebar-toggle-false-test",
  template: `
    <sd-sidebar-container>
      <sd-sidebar>Sidebar Content</sd-sidebar>
      <div class="main-content">Main Content</div>
    </sd-sidebar-container>
  `,
  standalone: true,
  imports: [SdSidebarContainerControl, SdSidebarControl],
})
export class SdSidebarToggleFalseTest {}

@Component({
  selector: "sd-sidebar-toggle-true-test",
  template: `
    <sd-sidebar-container>
      <sd-sidebar>Sidebar Content</sd-sidebar>
      <div class="main-content">Main Content</div>
    </sd-sidebar-container>
  `,
  standalone: true,
  imports: [SdSidebarContainerControl, SdSidebarControl],
})
export class SdSidebarToggleTrueTest {}

@Component({
  selector: "sd-sidebar-backdrop-test",
  template: `
    <sd-sidebar-container>
      <sd-sidebar>Sidebar Content</sd-sidebar>
      <div class="main-content">Main Content</div>
    </sd-sidebar-container>
  `,
  standalone: true,
  imports: [SdSidebarContainerControl, SdSidebarControl],
})
export class SdSidebarBackdropTest {}
