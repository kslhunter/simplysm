import { Component, viewChild } from "@angular/core";
import { SdTopbarContainer } from "../../../src/layout/topbar/sd-topbar-container";
import { SdTopbar } from "../../../src/layout/topbar/sd-topbar";
import { SdSidebarContainer } from "../../../src/layout/sidebar/sd-sidebar-container";

@Component({
  selector: "sd-topbar-with-sidebar-test",
  template: `
    <sd-sidebar-container>
      <sd-topbar-container>
        <sd-topbar>Topbar</sd-topbar>
        <div class="main-content">Main</div>
      </sd-topbar-container>
    </sd-sidebar-container>
  `,
  standalone: true,
  imports: [SdSidebarContainer, SdTopbarContainer, SdTopbar],
})
export class TopbarWithSidebarTest {}

@Component({
  selector: "sd-topbar-with-external-sidebar-test",
  template: `
    <sd-sidebar-container #sc />
    <sd-topbar-container>
      <sd-topbar [sidebarContainer]="sc">Topbar</sd-topbar>
      <div class="main-content">Main</div>
    </sd-topbar-container>
  `,
  standalone: true,
  imports: [SdSidebarContainer, SdTopbarContainer, SdTopbar],
})
export class TopbarWithExternalSidebarTest {
  sidebarContainer = viewChild.required<SdSidebarContainer>("sc");
}

@Component({
  selector: "sd-topbar-no-sidebar-test",
  template: `
    <sd-topbar-container>
      <sd-topbar>Topbar</sd-topbar>
      <div class="main-content">Main</div>
    </sd-topbar-container>
  `,
  standalone: true,
  imports: [SdTopbarContainer, SdTopbar],
})
export class TopbarNoSidebarTest {}
