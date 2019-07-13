import {ChangeDetectionStrategy, Component, HostBinding, Input, ViewEncapsulation} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";

function colorValidator(value: string): boolean {
  return /^#[0-9a-fA-F]*$/.test(value);
}

@Component({
  selector: "sd-label",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/variables-scss";

    sd-label {
      display: inline-block;
      background: var(--theme-grey-darkest);
      color: var(--text-reverse-color-default);
      padding: 0 var(--gap-xs);
      border-radius: 2px;
      text-indent: 0;

      @each $color in $arr-theme-color {
        &[sd-theme=#{$color}] {
          background: var(--theme-#{$color}-default);
        }
      }

      &[sd-clickable=true] {
        cursor: pointer;

        &:hover {
          background: var(--theme-grey-dark);

          @each $color in $arr-theme-color {
            &[sd-theme=#{$color}] {
              background: var(--theme-#{$color}-dark);
            }
          }
        }
      }
    }
  `]
})
export class SdLabelControl {
  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["primary", "info", "success", "warning", "danger", "grey", "bluegrey"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "info" | "success" | "warning" | "danger" | "grey" | "bluegrey";

  @Input()
  @SdTypeValidate({
    type: String,
    validator: colorValidator
  })
  @HostBinding("style.background")
  public color?: string;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-clickable")
  public clickable?: boolean;
}
