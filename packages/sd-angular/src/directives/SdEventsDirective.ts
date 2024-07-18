import {Directive, EventEmitter, Output} from "@angular/core";
import {ISdResizeEvent} from "../plugins/SdResizeEventPlugin";


@Directive({
  selector: "[sdResize], [sdResize.outside], [focus.outside], [click.outside], [mousedown.outside], [keydown.outside], [scroll.outside], [invalid.capture]",
  standalone: true
})
export class SdEventsDirective {
  @Output("sdResize") resize = new EventEmitter<ISdResizeEvent>();
  @Output("sdResize.outside") resizeOutside = new EventEmitter<ISdResizeEvent>();
  @Output("focus.outside") focusOutside = new EventEmitter<FocusEvent>();
  @Output("click.outside") clickOutside = new EventEmitter<MouseEvent>();
  @Output("mousedown.outside") mousedownOutside = new EventEmitter<MouseEvent>();
  @Output("keydown.outside") keydownOutside = new EventEmitter<KeyboardEvent>();
  @Output("scroll.outside") scrollOutside = new EventEmitter<Event>();

  @Output("invalid.capture") invalidCapture = new EventEmitter<Event>();
}