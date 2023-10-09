import {Directive, EventEmitter, HostListener, NgZone, Output} from "@angular/core";
import {ISdMutationEvent} from "@simplysm/sd-core-browser";

@Directive({
  selector: "[sdMutation]",
  standalone: true,
})
export class SdMutationDirective {
  @Output()
  public readonly sdMutation = new EventEmitter<ISdMutationEvent>();

  public constructor(private readonly _zone: NgZone) {
  }

  @HostListener("mutation", ["$event"])
  public onMutation(event: ISdMutationEvent): void {
    this._zone.run(() => {
      this.sdMutation.emit(event);
    });
  }
}
