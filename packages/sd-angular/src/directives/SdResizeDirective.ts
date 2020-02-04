import {Directive, EventEmitter, HostListener, NgZone, Output} from "@angular/core";
import {ResizeEvent} from "@simplysm/sd-core-browser";

@Directive({
  selector: "[sdResize]"
})
export class SdResizeDirective {
  @Output()
  public readonly sdResize = new EventEmitter<ResizeEvent>();

  public constructor(private readonly _zone: NgZone) {
  }

  @HostListener("resize", ["$event"])
  public onResize(event: ResizeEvent): void {
    this._zone.run(() => {
      this.sdResize.emit(event);
    });
  }
}
