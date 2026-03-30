import { Component, viewChild } from "@angular/core";
import { SdTopbarContainerControl } from "../../../../src/ui/navigation/topbar/sd-topbar-container.control";
import { SdTopbarControl } from "../../../../src/ui/navigation/topbar/sd-topbar.control";
import { SdSidebarContainerControl } from "../../../../src/ui/navigation/sidebar/sd-sidebar-container.control";

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
  imports: [SdSidebarContainerControl, SdTopbarContainerControl, SdTopbarControl],
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
  imports: [SdSidebarContainerControl, SdTopbarContainerControl, SdTopbarControl],
})
export class TopbarWithExternalSidebarTest {
  sidebarContainer = viewChild.required<SdSidebarContainerControl>("sc");
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
  imports: [SdTopbarContainerControl, SdTopbarControl],
})
export class TopbarNoSidebarTest {}
