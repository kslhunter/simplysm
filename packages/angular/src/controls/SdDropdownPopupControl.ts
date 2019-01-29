import {ChangeDetectionStrategy, Component, ElementRef, HostBinding} from "@angular/core";

@Component({
  selector: "sd-dropdown-popup",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class._large]="height >= 300">
      {{ height }}
      <ng-content></ng-content>
    </div>`
})
export class SdDropdownPopupControl {
  @HostBinding("style.height.px")
  public get height(): number | undefined {
    if (this._elRef.nativeElement.firstElementChild!.clientHeight >= 300) {
      return 300;
    }
    else {
      return undefined;
    }
  }

  public constructor(private readonly _elRef: ElementRef<HTMLElement>) {
  }
}
