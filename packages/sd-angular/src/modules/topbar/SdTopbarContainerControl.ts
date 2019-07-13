import {ChangeDetectionStrategy, Component, HostBinding, Input, ViewEncapsulation} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";

@Component({
  selector: "sd-topbar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    sd-topbar-container {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      padding-top: var(--topbar-height);

      &[sd-hide-topbar=true] {
        padding-top: 0 !important;

        sd-topbar {
          display: none !important;
        }
      }
    }
  `]
})
export class SdTopbarContainerControl {
  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-hide-topbar")
  public hideTopbar?: boolean;
}
