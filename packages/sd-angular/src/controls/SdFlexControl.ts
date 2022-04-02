import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";

@Component({
  selector: "sd-flex",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/variables-scss-arr";

    :host {
      display: flex;
      flex-wrap: wrap;

      @each $gap in $arr-gap {
        &[sd-gap='#{$gap}'] {
          gap: var(--gap-#{$gap});
        }
      }

      &[sd-inline=true] {
        display: inline-flex;
      }

      &[sd-vertical-align=middle] {
        align-items: center;
      }

      &[sd-vertical-align=top] {
        align-items: start;
      }

      &[sd-vertical-align=bottom] {
        align-items: end;
      }

      &[sd-vertical-align=fill] {
        align-items: stretch;
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
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["center", "start", "end", "stretch"]
  })
  @HostBinding("style.align-items")
  public alignItems?: "center" | "start" | "end" | "stretch";
}
