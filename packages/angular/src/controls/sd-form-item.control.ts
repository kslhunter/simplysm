import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {SdTypeValidate} from "../decorators/SdTypeValidate";

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
      margin-bottom: gap(sm);
      &:last-child {
        margin-bottom: 0;
      }

      & > label {
        display: block;
        margin-bottom: gap(xs);
      }
    }
  `]
})
export class SdFormItemControl {
  @Input()
  @SdTypeValidate(String)
  public label?: string;
}