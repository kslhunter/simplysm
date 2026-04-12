import { Component, signal } from "@angular/core";
import { SdCollapse } from "../../../src/controls/collapse/sd-collapse";
import { SdCollapseIcon } from "../../../src/controls/collapse/sd-collapse-icon";

// --- sd-collapse fixtures ---

@Component({
  selector: "sd-collapse-closed-test",
  template: `
    <sd-collapse [open]="false">
      <div class="inner-content" style="height: 100px">Content</div>
    </sd-collapse>
  `,
  standalone: true,
  imports: [SdCollapse],
})
export class SdCollapseClosedTest {}

@Component({
  selector: "sd-collapse-open-test",
  template: `
    <sd-collapse [open]="true">
      <div class="inner-content" style="height: 100px">Content</div>
    </sd-collapse>
  `,
  standalone: true,
  imports: [SdCollapse],
})
export class SdCollapseOpenTest {}

@Component({
  selector: "sd-collapse-toggle-test",
  template: `
    <sd-collapse [open]="open()">
      <div class="inner-content" style="height: 100px">Content</div>
    </sd-collapse>
  `,
  standalone: true,
  imports: [SdCollapse],
})
export class SdCollapseToggleTest {
  open = signal(false);
}

// --- sd-collapse-icon fixtures ---

@Component({
  selector: "sd-collapse-icon-closed-test",
  template: `<sd-collapse-icon [open]="false" />`,
  standalone: true,
  imports: [SdCollapseIcon],
})
export class SdCollapseIconClosedTest {}

@Component({
  selector: "sd-collapse-icon-open-test",
  template: `<sd-collapse-icon [open]="true" />`,
  standalone: true,
  imports: [SdCollapseIcon],
})
export class SdCollapseIconOpenTest {}

@Component({
  selector: "sd-collapse-icon-custom-rotate-test",
  template: `<sd-collapse-icon [open]="true" [openRotate]="180" />`,
  standalone: true,
  imports: [SdCollapseIcon],
})
export class SdCollapseIconCustomRotateTest {}
