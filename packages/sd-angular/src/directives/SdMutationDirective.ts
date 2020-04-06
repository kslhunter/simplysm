import {Directive, EventEmitter, HostListener, NgZone, Output} from "@angular/core";
import {SdMutationEvent} from "@simplysm/sd-core-browser";

@Directive({
  selector: "[sdMutation]"
})
export class SdMutationDirective {
  @Output()
  public readonly sdMutation = new EventEmitter<SdMutationEvent>();

  public constructor(private readonly _zone: NgZone) {
  }

  @HostListener("mutation", ["$event"])
  public onMutation(event: SdMutationEvent): void {
    this._zone.run(() => {
      this.sdMutation.emit(event);
    });
  }
}
