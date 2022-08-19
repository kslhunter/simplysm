import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { sdSizes, TSdSize } from "../commons";

@Component({
  selector: "sd-gap",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: "",
  styles: [/* language=SCSS */ `
    @import "../../scss/scss_settings";

    :host {
      @each $gap in $arr-gap {
        &[sd-direction=height][sd-size='#{$gap}'] {
          height: var(--gap-#{$gap});
        }
        &[sd-direction=width][sd-size='#{$gap}'] {
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
    notnull: true,
    includes: ["height", "width"]
  })
  @HostBinding("attr.sd-direction")
  public direction: "height" | "width" = "height";

  @Input()
  @SdInputValidate({
    type: String,
    includes: sdSizes
  })
  @HostBinding("attr.sd-size")
  public size?: TSdSize;

  @HostBinding("style.display")
  public get display(): "block" | "inline-block" {
    if (this.direction === "width") {
      return "inline-block";
    }
    else {
      return "block";
    }
  }
}
