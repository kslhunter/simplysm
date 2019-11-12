import {ChangeDetectionStrategy, Component, HostBinding, Input, ViewEncapsulation} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";

@Component({
  selector: "sd-note",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/variables-scss";

    sd-note {
      display: block;
      padding: var(--gap-default);
      background: var(--theme-grey-lightest);
      border-left: var(--gap-sm) solid var(--trans-color-default);

      @each $color in $arr-theme-color {
        &[sd-theme=#{$color}] {
          background: var(--theme-#{$color}-lightest);
          border-color: var(--theme-#{$color}-lighter);
        }
      }

      &[sd-size=sm] {
        font-size: var(--font-size-sm);
        padding: var(--gap-xs) var(--gap-sm);
      }

      &[sd-size=lg] {
        padding: var(--gap-default) var(--gap-lg);
      }
    }
  `]
})
export class SdNoteControl {
  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["primary", "info", "success", "warning", "danger"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "info" | "success" | "warning" | "danger";

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";
}
