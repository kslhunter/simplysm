import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdInputValidate} from "../utils/SdInputValidate";
import {CommonModule} from "@angular/common";

@Component({
  selector: "sd-gap",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
  template: "",
  styles: [/* language=SCSS */ `
    @import "../scss/variables";

    :host {
      @each $key, $val in map-get($vars, gap) {
        &[sd-height='#{$key}'] {
          height: var(--gap-#{$key});
        }

        &[sd-width='#{$key}'] {
          width: var(--gap-#{$key});
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

  @Input()
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

  @Input()
  @SdInputValidate(Number)
  @HostBinding("style.width.px")
  public widthPx?: number;

  @Input()
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
