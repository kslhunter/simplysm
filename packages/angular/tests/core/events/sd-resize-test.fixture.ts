import { Component } from "@angular/core";
import { SdResizeDirective, type SdResizeEvent } from "../../../src/core/events/sd-resize";

@Component({
  selector: "sd-resize-test-template",
  standalone: true,
  imports: [SdResizeDirective],
  template: `<div class="target" (sdResize)="onResize($event)"></div>`,
})
export class SdResizeTestTemplate {
  events: SdResizeEvent[] = [];
  onResize(e: SdResizeEvent) {
    this.events.push(e);
  }
}

@Component({
  selector: "sd-resize-test-host-directive",
  standalone: true,
  imports: [],
  hostDirectives: [{ directive: SdResizeDirective, outputs: ["sdResize"] }],
  host: {
    "(sdResize)": "onHostResize($event)",
  },
  template: `<ng-content />`,
})
export class SdResizeTestHostDirective {
  events: SdResizeEvent[] = [];
  onHostResize(e: SdResizeEvent) {
    this.events.push(e);
  }
}

