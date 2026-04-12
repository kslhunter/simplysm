import { Component } from "@angular/core";
import { SdSidebarContainer } from "../../../src/layout/sidebar/sd-sidebar-container";
import { SdSidebar } from "../../../src/layout/sidebar/sd-sidebar";

@Component({
  selector: "sd-sidebar-toggle-false-test",
  template: `
    <sd-sidebar-container>
      <sd-sidebar>Sidebar Content</sd-sidebar>
      <div class="main-content">Main Content</div>
    </sd-sidebar-container>
  `,
  standalone: true,
  imports: [SdSidebarContainer, SdSidebar],
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
  imports: [SdSidebarContainer, SdSidebar],
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
  imports: [SdSidebarContainer, SdSidebar],
})
export class SdSidebarBackdropTest {}
