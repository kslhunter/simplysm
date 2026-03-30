import { Component, viewChild } from "@angular/core";
import { SdTopbarControl } from "../../../../src/ui/navigation/topbar/sd-topbar.control";
import { SdSidebarContainerControl } from "../../../../src/ui/navigation/sidebar/sd-sidebar-container.control";

@Component({
  selector: "sd-topbar-unit-with-sidebar",
  template: `
    <sd-sidebar-container>
      <sd-topbar>Content</sd-topbar>
    </sd-sidebar-container>
  `,
  standalone: true,
  imports: [SdSidebarContainerControl, SdTopbarControl],
})
export class TopbarUnitWithSidebarTest {}

@Component({
  selector: "sd-topbar-unit-external-sidebar",
  template: `
    <sd-sidebar-container #sc />
    <sd-topbar [sidebarContainer]="sc">Content</sd-topbar>
  `,
  standalone: true,
  imports: [SdSidebarContainerControl, SdTopbarControl],
})
export class TopbarUnitExternalSidebarTest {
  sidebarContainer = viewChild.required<SdSidebarContainerControl>("sc");
}

@Component({
  selector: "sd-topbar-unit-no-sidebar",
  template: `<sd-topbar>Content</sd-topbar>`,
  standalone: true,
  imports: [SdTopbarControl],
})
export class TopbarUnitNoSidebarTest {}
