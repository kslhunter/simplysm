import { Component } from "@angular/core";
import { SdIntersectionDirective, type SdIntersectionEvent } from "../../../src/core/events/sd-intersection";

@Component({
  selector: "sd-intersection-test-template",
  standalone: true,
  imports: [SdIntersectionDirective],
  template: `<div class="target" (sdIntersection)="onIntersection($event)"></div>`,
})
export class SdIntersectionTestTemplate {
  events: SdIntersectionEvent[] = [];
  onIntersection(e: SdIntersectionEvent) {
    this.events.push(e);
  }
}
