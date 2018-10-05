import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";

@Component({
  selector: "sd-label",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: inline-block;
      background: get($theme-color, grey, darkest);
      color: text-color(reverse, default);
      padding: 0 gap(xs);
      border-radius: 2px;
      text-indent: 0;

      &[sd-theme='primary'] {
        background: get($theme-color, primary, default);
      }

      &[sd-theme='info'] {
        background: get($theme-color, info, default);
      }

      &[sd-theme='success'] {
        background: get($theme-color, success, default);
      }

      &[sd-theme='warning'] {
        background: get($theme-color, warning, default);
      }

      &[sd-theme='danger'] {
        background: get($theme-color, danger, default);
      }

      &[sd-theme='grey'] {
        background: get($theme-color, grey, default);
      }

      &[sd-theme='bluegrey'] {
        background: get($theme-color, bluegrey, default);
      }

      &[sd-clickable=true] {
        cursor: pointer;

        &:hover {
          background: get($theme-color, grey, dark);

          &[sd-theme='primary'] {
            background: get($theme-color, primary, dark);
          }

          &[sd-theme='info'] {
            background: get($theme-color, info, dark);
          }

          &[sd-theme='success'] {
            background: get($theme-color, success, dark);
          }

          &[sd-theme='warning'] {
            background: get($theme-color, warning, dark);
          }

          &[sd-theme='danger'] {
            background: get($theme-color, danger, dark);
          }

          &[sd-theme='grey'] {
            background: get($theme-color, grey, dark);
          }

          &[sd-theme='bluegrey'] {
            background: get($theme-color, bluegrey, dark);
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
    validator: value => ["primary", "info", "success", "warning", "danger", "grey", "bluegrey"].includes(value)
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "info" | "success" | "warning" | "danger" | "grey" | "bluegrey";

  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => /^#[0-9a-fA-F]*$/.test(value)
  })
  @HostBinding("style.background")
  public color?: string;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-clickable")
  public clickable?: boolean;
}