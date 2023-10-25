import {Directive, EventEmitter, Output} from "@angular/core";
import {ISdResizeEvent} from "../plugins/SdResizeEventPlugin";


@Directive({
  selector: "[sdResize], [sdResize.outside], [focus.outside], [click.outside], [mousedown.outside], [keydown.outside], [scroll.outside]",
  standalone: true
})
export class SdEventsDirective {
  @Output("sdResize")
  public readonly resize = new EventEmitter<ISdResizeEvent>();

  @Output("sdResize.outside")
  public readonly resizeOutside = new EventEmitter<ISdResizeEvent>();

  @Output("focus.outside")
  public readonly focusOutside = new EventEmitter<FocusEvent>();

  @Output("click.outside")
  public readonly clickOutside = new EventEmitter<MouseEvent>();

  @Output("mousedown.outside")
  public readonly mousedownOutside = new EventEmitter<MouseEvent>();

  @Output("keydown.outside")
  public readonly keydownOutside = new EventEmitter<KeyboardEvent>();

  @Output("scroll.outside")
  public readonly scrollOutside = new EventEmitter<Event>();
}