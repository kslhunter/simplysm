import {Directive, EventEmitter, NgModule, Output} from "@angular/core";
import {ISdResizeEvent} from "../plugins/SdResizeEventPlugin";


@Directive({
  selector: "[sdResize]"
})
export class SdResizeDirective {
  @Output("sdResize")
  public readonly output = new EventEmitter<ISdResizeEvent>();
}

@Directive({
  selector: "[sdResize.outside]"
})
export class SdResizeOutsideDirective {
  @Output("sdResize.outside")
  public readonly output = new EventEmitter<ISdResizeEvent>();
}

@Directive({
  selector: "[focus.outside]"
})
export class FocusOutsideDirective {
  @Output("focus.outside")
  public readonly output = new EventEmitter<FocusEvent>();
}

@Directive({
  selector: "[click.outside]"
})
export class ClickOutsideDirective {
  @Output("click.outside")
  public readonly output = new EventEmitter<MouseEvent>();
}


@Directive({
  selector: "[mousedown.outside]"
})
export class MousedownOutsideDirective {
  @Output("mousedown.outside")
  public readonly output = new EventEmitter<MouseEvent>();
}

@Directive({
  selector: "[keydown.outside]"
})
export class KeydownOutsideDirective {
  @Output("keydown.outside")
  public readonly output = new EventEmitter<KeyboardEvent>();
}

@Directive({
  selector: "[scroll.outside]"
})
export class ScrollOutsideDirective {
  @Output("scroll.outside")
  public readonly output = new EventEmitter<Event>();
}

@NgModule({
  imports: [],
  declarations: [
    SdResizeDirective,
    SdResizeOutsideDirective,
    FocusOutsideDirective,
    ClickOutsideDirective,
    MousedownOutsideDirective,
    KeydownOutsideDirective,
    ScrollOutsideDirective,
  ],
  exports: [
    SdResizeDirective,
    SdResizeOutsideDirective,
    FocusOutsideDirective,
    ClickOutsideDirective,
    MousedownOutsideDirective,
    KeydownOutsideDirective,
    ScrollOutsideDirective,
  ],
  providers: []
})
export class SdEventDirectiveModule {
}