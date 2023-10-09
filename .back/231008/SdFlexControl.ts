import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";
import {CommonModule} from "@angular/common";

@Component({
  selector: "sd-flex",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../scss/variables-scss-arr";

    :host {
      display: flex;
      flex-wrap: nowrap;

      @each $gap in $arr-gap {
        &[sd-gap='#{$gap}'] {
          gap: var(--gap-#{$gap});
        }
      }

      &[sd-inline=true] {
        display: inline-flex;
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

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["center", "flex-start", "flex-end", "stretch"]
  })
  @HostBinding("style.justify-content")
  public justifyContent?: "center" | "flex-start" | "flex-end" | "stretch";

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["row", "column"]
  })
  @HostBinding("style.flex-direction")
  public direction?: "row" | "column";
}
