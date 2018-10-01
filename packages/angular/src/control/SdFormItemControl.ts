import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {SdTypeValidate} from "../decorator/SdTypeValidate";

@Component({
  selector: "sd-form-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [style.display]="label ? 'display' : 'none'">
      {{ label }}
    </label>
    <div>
      <ng-content></ng-content>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      margin-bottom: gap(default);
      &:last-child {
        margin-bottom: 0;
      }

      & > label {
        display: block;
        font-weight: bold;
        margin-bottom: gap(xs);
      }

      @media #{$screen-mobile} {
        width: 100%;
        margin: 0;
        overflow-x: hidden;

        > label {
          padding: gap(xs) gap(sm);
          font-size: font-size(sm);
          background: rgba(0, 0, 0, .1);
          margin: 0;
        }

        > div /deep/ {
          > sd-textfield > input {
            border: none;
          }

          > sd-markdown-editor {
            border: none;
          }

          > sd-select > select {
            border: none;
          }

          > sd-multi-select > sd-dropdown > div {
            border: none;
          }
        }
      }
    }
  `]
})
export class SdFormItemControl {
  @Input()
  @SdTypeValidate(String)
  public label?: string;
}