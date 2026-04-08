import { Component } from "@angular/core";
import { SdPane } from "../../../src/ui/layout/sd-pane";
import { SdGap } from "../../../src/ui/layout/sd-gap";

@Component({
  selector: "sd-pane-test",
  standalone: true,
  imports: [SdPane],
  template: `<div sdPane>content</div>`,
})
export class SdPaneTest {}

@Component({
  selector: "sd-gap-test-height",
  standalone: true,
  imports: [SdGap],
  template: `<sd-gap [height]="'default'" />`,
})
export class SdGapTestHeight {}

@Component({
  selector: "sd-gap-test-width",
  standalone: true,
  imports: [SdGap],
  template: `<sd-gap [width]="'sm'" />`,
})
export class SdGapTestWidth {}

@Component({
  selector: "sd-gap-test-height-px",
  standalone: true,
  imports: [SdGap],
  template: `<sd-gap [heightPx]="20" />`,
})
export class SdGapTestHeightPx {}

@Component({
  selector: "sd-gap-test-width-em",
  standalone: true,
  imports: [SdGap],
  template: `<sd-gap [widthEm]="2" />`,
})
export class SdGapTestWidthEm {}

@Component({
  selector: "sd-gap-test-zero",
  standalone: true,
  imports: [SdGap],
  template: `<sd-gap [heightPx]="0" />`,
})
export class SdGapTestZero {}

