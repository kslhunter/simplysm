import { Directive, EventEmitter, HostListener, Output } from "@angular/core";
import { ISdResizeEvent } from "@simplysm/sd-core-browser";

@Directive({
  selector: "[sdResizeOutside]"
})
export class SdResizeOutsideDirective {
  @Output()
  public readonly sdResizeOutside = new EventEmitter<ISdResizeEvent>();

  @HostListener("resize", ["$event"])
  public onResize(event: ISdResizeEvent): void {
    this.sdResizeOutside.emit(event);
  }
}
