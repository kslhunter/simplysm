import {Directive, EventEmitter, HostListener, NgZone, Output} from "@angular/core";
import {ISdResizeEvent} from "@simplysm/sd-core-browser";

@Directive({
  selector: "[sdResize]",
  standalone: true
})
export class SdResizeDirective {
  @Output()
  public readonly sdResize = new EventEmitter<ISdResizeEvent>();

  public constructor(private readonly _zone: NgZone) {
  }

  @HostListener("resize", ["$event"])
  public onResize(event: ISdResizeEvent): void {
    this._zone.run(() => {
      this.sdResize.emit(event);
    });
  }
}
