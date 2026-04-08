import { Component, signal } from "@angular/core";
import { SdView } from "../../../../src/ui/layout/view/sd-view";
import { SdViewItem } from "../../../../src/ui/layout/view/sd-view-item";

@Component({
  selector: "sd-view-test-basic",
  standalone: true,
  imports: [SdView, SdViewItem],
  template: `
    <sd-view [value]="activeTab()">
      <sd-view-item [value]="'tab1'">Tab 1 Content</sd-view-item>
      <sd-view-item [value]="'tab2'">Tab 2 Content</sd-view-item>
    </sd-view>
  `,
})
export class SdViewTestBasic {
  activeTab = signal("tab1");
}

@Component({
  selector: "sd-view-test-fill",
  standalone: true,
  imports: [SdView, SdViewItem],
  template: `
    <sd-view [value]="'tab1'" [fill]="true">
      <sd-view-item [value]="'tab1'">Tab 1 Content</sd-view-item>
    </sd-view>
  `,
})
export class SdViewTestFill {}

@Component({
  selector: "sd-view-test-no-fill",
  standalone: true,
  imports: [SdView, SdViewItem],
  template: `
    <sd-view [value]="'tab1'">
      <sd-view-item [value]="'tab1'">Tab 1 Content</sd-view-item>
    </sd-view>
  `,
})
export class SdViewTestNoFill {}
