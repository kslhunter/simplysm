import { Component, viewChild } from "@angular/core";
import { SdTopbar } from "../../../src/layout/topbar/sd-topbar";
import { SdSidebarContainer } from "../../../src/layout/sidebar/sd-sidebar-container";

@Component({
  selector: "sd-topbar-unit-with-sidebar",
  template: `
    <sd-sidebar-container>
      <sd-topbar>Content</sd-topbar>
    </sd-sidebar-container>
  `,
  standalone: true,
  imports: [SdSidebarContainer, SdTopbar],
})
export class TopbarUnitWithSidebarTest {}

@Component({
  selector: "sd-topbar-unit-external-sidebar",
  template: `
    <sd-sidebar-container #sc />
    <sd-topbar [sidebarContainer]="sc">Content</sd-topbar>
  `,
  standalone: true,
  imports: [SdSidebarContainer, SdTopbar],
})
export class TopbarUnitExternalSidebarTest {
  sidebarContainer = viewChild.required<SdSidebarContainer>("sc");
}

@Component({
  selector: "sd-topbar-unit-no-sidebar",
  template: `<sd-topbar>Content</sd-topbar>`,
  standalone: true,
  imports: [SdTopbar],
})
export class TopbarUnitNoSidebarTest {}
