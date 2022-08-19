import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";

@Component({
  selector: "sd-flex",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/scss_settings";

    :host {
      display: flex;
      flex-wrap: wrap;

      @each $gap in $arr-gap {
        &[sd-gap='#{$gap}'] {
          gap: var(--gap-#{$gap});
        }
      }
    }`]
})
export class SdFlexControl {
  @Input()
  @SdInputValidate({
    type: String,
    includes: ["xxs", "xs", "sm", "default", "lg", "xl", "xxl"]
  })
  @HostBinding("attr.sd-gap")
  public gap?: "xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl";

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["row", "column"]
  })
  @HostBinding("style.flex-direction")
  public direction?: "row" | "column";
}
