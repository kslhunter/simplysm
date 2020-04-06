import {Directive, EventEmitter, HostListener, NgZone, Output} from "@angular/core";
import {SdResizeEvent} from "@simplysm/sd-core-browser";

@Directive({
  selector: "[sdResize]"
})
export class SdResizeDirective {
  @Output()
  public readonly sdResize = new EventEmitter<SdResizeEvent>();

  public constructor(private readonly _zone: NgZone) {
  }

  @HostListener("resize", ["$event"])
  public onResize(event: SdResizeEvent): void {
    this._zone.run(() => {
      this.sdResize.emit(event);
    });
  }
}
