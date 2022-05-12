import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";

@Component({
  selector: "sd-gap",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: "",
  styles: [/* language=SCSS */ `
    @import "../../scss/variables-scss-arr";

    :host {
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
  @SdInputValidate({
    type: String,
    includes: ["xxs", "xs", "sm", "default", "lg", "xl", "xxl"]
  })
  @HostBinding("attr.sd-height")
  public height?: "xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl";

  @Input("height.px")
  @SdInputValidate(Number)
  @HostBinding("style.height.px")
  public heightPx?: number;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["xxs", "xs", "sm", "default", "lg", "xl", "xxl"]
  })
  @HostBinding("attr.sd-width")
  public width?: "xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl";

  @Input("width.px")
  @SdInputValidate(Number)
  @HostBinding("style.width.px")
  public widthPx?: number;

  @Input("width.em")
  @SdInputValidate(Number)
  @HostBinding("style.width.em")
  public widthEm?: number;

  @HostBinding("style.display")
  public get display(): "block" | "inline-block" | "none" | undefined {
    if (this.widthPx === 0 || this.heightPx === 0 || this.widthEm === 0) {
      return "none";
    }
    else if (this.width !== undefined || this.widthPx !== undefined || this.widthEm !== undefined) {
      return "inline-block";
    }
    else if (this.height !== undefined || this.heightPx !== undefined) {
      return "block";
    }

    return undefined;
  }
}
