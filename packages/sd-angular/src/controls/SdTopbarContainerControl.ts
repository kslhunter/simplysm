import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";

@Component({
  selector: "sd-topbar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    :host {
      @include container-base();
      //padding-top: var(--sd-topbar-height);

      &[sd-size="sm"] {
        padding-top: var(--sd-topbar-height-sm);
      }

      &[sd-size="lg"] {
        padding-top: var(--sd-topbar-height-lg);
      }
    }
  `]
})
export class SdTopbarContainerControl {
  @Input()
  @SdInputValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  @HostBinding("style.padding-top.px")
  public paddingTopPx = 0;
}
