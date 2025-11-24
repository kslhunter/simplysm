import { Directive, output } from "@angular/core";
import { ISdResizeEvent } from "../plugins/events/sd-resize-event.plugin";

@Directive({
  selector: `[invalid.capture], [keydown.capture], [focus.capture], [blur.capture], [dragover.capture], [sdResize], [sdRefreshCommand], [sdSaveCommand], [sdInsertCommand]`,
  standalone: true,
})
export class SdEventsDirective {
  invalidCapture = output<Event>({ alias: "invalid.capture" });
  keydownCapture = output<KeyboardEvent>({ alias: "keydown.capture" });
  focusCapture = output<FocusEvent>({ alias: "focus.capture" });
  blurCapture = output<FocusEvent>({ alias: "blur.capture" });
  dragoverCapture = output<DragEvent>({ alias: "dragover.capture" });

  sdResize = output<ISdResizeEvent>();

  sdRefreshCommand = output<KeyboardEvent>();
  sdSaveCommand = output<KeyboardEvent>();
  sdInsertCommand = output<KeyboardEvent>();
}
