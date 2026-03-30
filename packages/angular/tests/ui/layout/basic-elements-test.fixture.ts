import { Component } from "@angular/core";
import { SdPaneDirective } from "../../../src/ui/layout/sd-pane.directive";
import { SdGapControl } from "../../../src/ui/layout/sd-gap.control";

@Component({
  selector: "sd-pane-test",
  standalone: true,
  imports: [SdPaneDirective],
  template: `<div sd-pane>content</div>`,
})
export class SdPaneTest {}

@Component({
  selector: "sd-gap-test-height",
  standalone: true,
  imports: [SdGapControl],
  template: `<sd-gap [height]="'default'" />`,
})
export class SdGapTestHeight {}

@Component({
  selector: "sd-gap-test-width",
  standalone: true,
  imports: [SdGapControl],
  template: `<sd-gap [width]="'sm'" />`,
})
export class SdGapTestWidth {}

@Component({
  selector: "sd-gap-test-height-px",
  standalone: true,
  imports: [SdGapControl],
  template: `<sd-gap [heightPx]="20" />`,
})
export class SdGapTestHeightPx {}

@Component({
  selector: "sd-gap-test-width-em",
  standalone: true,
  imports: [SdGapControl],
  template: `<sd-gap [widthEm]="2" />`,
})
export class SdGapTestWidthEm {}

@Component({
  selector: "sd-gap-test-zero",
  standalone: true,
  imports: [SdGapControl],
  template: `<sd-gap [heightPx]="0" />`,
})
export class SdGapTestZero {}

