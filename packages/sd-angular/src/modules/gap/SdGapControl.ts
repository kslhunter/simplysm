import {ChangeDetectionStrategy, Component, HostBinding, Input, ViewEncapsulation} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";

@Component({
  selector: "sd-gap",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: ``,
  styles: [/* language=SCSS */ `
    @import "../../../scss/variables-scss";

    sd-gap {
      @each $gap in $arr-gap {
        &[sd-height='#{$gap}'] {
          height: var(--gap-#{$gap});
        }
        &[sd-width='#{$gap}'] {
          width: var(--gap-#{$gap});
        }
      }
    }
  `]
})
export class SdGapControl {
  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["xxs", "xs", "sm", "default", "lg", "xl", "xxl"]
  })
  @HostBinding("attr.sd-height")
  public height?: "xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl" | number;

  @Input("height.px")
  @SdTypeValidate(Number)
  @HostBinding("style.height.px")
  public heightPx?: number;

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["xxs", "xs", "sm", "default", "lg", "xl", "xxl"]
  })
  @HostBinding("attr.sd-width")
  public width?: "xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl" | number;

  @Input("width.px")
  @SdTypeValidate(Number)
  @HostBinding("style.width.px")
  public widthPx?: number;

  @HostBinding("style.display")
  public get display(): "block" | "inline-block" | undefined {
    if (this.width || this.widthPx) {
      return "inline-block";
    }
    else if (this.height || this.heightPx) {
      return "block";
    }
  }
}
