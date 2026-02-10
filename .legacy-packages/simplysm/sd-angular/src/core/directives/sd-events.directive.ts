import { Directive, output } from "@angular/core";
import type { ISdResizeEvent } from "../plugins/events/sd-resize-event.plugin";

@Directive({
  selector: `
    [click.capture], [click.once], [click.capture.once],
    [mousedown.capture], [mouseup.capture], [mouseover.capture], [mouseout.capture],
    [keydown.capture], [keyup.capture],
    [focus.capture], [blur.capture],
    [invalid.capture],
    [scroll.capture], [scroll.passive], [scroll.capture.passive],
    [wheel.passive], [wheel.capture.passive],
    [touchstart.passive], [touchstart.capture.passive],
    [touchmove.passive], [touchmove.capture.passive],
    [touchend.passive],
    [dragover.capture], [dragenter.capture], [dragleave.capture], [drop.capture],
    [transitionend.once], [animationend.once],
    [sdResize],
    [sdRefreshCommand], [sdSaveCommand], [sdInsertCommand]
  `,
  standalone: true,
})
export class SdEventsDirective {
  // Click
  "click.capture" = output<MouseEvent>();
  "click.once" = output<MouseEvent>();
  "click.capture.once" = output<MouseEvent>();

  // Mouse
  "mousedown.capture" = output<MouseEvent>();
  "mouseup.capture" = output<MouseEvent>();
  "mouseover.capture" = output<MouseEvent>();
  "mouseout.capture" = output<MouseEvent>();

  // Keyboard
  "keydown.capture" = output<KeyboardEvent>();
  "keyup.capture" = output<KeyboardEvent>();

  // Focus (버블링 안 되므로 capture 필수)
  "focus.capture" = output<FocusEvent>();
  "blur.capture" = output<FocusEvent>();

  // Form
  "invalid.capture" = output<Event>();

  // Scroll (passive로 성능 최적화)
  "scroll.capture" = output<Event>();
  "scroll.passive" = output<Event>();
  "scroll.capture.passive" = output<Event>();

  // Wheel (passive로 성능 최적화)
  "wheel.passive" = output<WheelEvent>();
  "wheel.capture.passive" = output<WheelEvent>();

  // Touch (passive로 성능 최적화)
  "touchstart.passive" = output<TouchEvent>();
  "touchstart.capture.passive" = output<TouchEvent>();
  "touchmove.passive" = output<TouchEvent>();
  "touchmove.capture.passive" = output<TouchEvent>();
  "touchend.passive" = output<TouchEvent>();

  // Drag & Drop
  "dragover.capture" = output<DragEvent>();
  "dragenter.capture" = output<DragEvent>();
  "dragleave.capture" = output<DragEvent>();
  "drop.capture" = output<DragEvent>();

  // Animation/Transition (once로 한 번만)
  "transitionend.once" = output<TransitionEvent>();
  "animationend.once" = output<AnimationEvent>();

  // Custom events
  "sdResize" = output<ISdResizeEvent>();

  // Command events
  "sdRefreshCommand" = output<KeyboardEvent>();
  "sdSaveCommand" = output<KeyboardEvent>();
  "sdInsertCommand" = output<KeyboardEvent>();
}
