import {ChangeDetectionStrategy, Component, HostBinding} from "@angular/core";

@Component({
  selector: "sd-link",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdLinkControl {
  @HostBinding("attr.tabindex")
  public tabindex = 0;
}
