import { Directive, output } from "@angular/core";
import { ISdResizeEvent } from "../plugins/events/sd-resize.event-plugin";

@Directive({
  selector: "[invalid.capture], [keydown.capture], [sdResize], [sdRefreshCommand], [sdSaveCommand], [sdInsertCommand]",
  standalone: true,
})
export class SdEventsDirective {
  invalidCapture = output<Event>({ alias: "invalid.capture" });
  keydownCapture = output<KeyboardEvent>({ alias: "keydown.capture" });

  sdResize = output<ISdResizeEvent>();

  sdRefreshCommand = output<KeyboardEvent>();
  sdSaveCommand = output<KeyboardEvent>();
  sdInsertCommand = output<KeyboardEvent>();
}
