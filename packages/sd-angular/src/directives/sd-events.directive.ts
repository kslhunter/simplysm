import { Directive, output } from "@angular/core";
import { type ISdResizeEvent } from "../plugins/events/sd-resize.event-plugin";

@Directive({
  selector: "[sdResize], [invalid.capture], [keydown.capture]",
  standalone: true,
})
export class SdEventsDirective {
  sdResize = output<ISdResizeEvent>();
  invalidCapture = output<Event>({ alias: "invalid.capture" });
  keydownCapture = output<KeyboardEvent>({ alias: "keydown.capture" });
}
