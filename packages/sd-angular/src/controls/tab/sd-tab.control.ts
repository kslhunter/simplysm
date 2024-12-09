import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from "@angular/core";
import { $model } from "../../utils/$hooks";

@Component({
  selector: "sd-tab",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-tab {
        display: block;
        border-bottom: 2px solid var(--theme-grey-lighter);

        @media not all and (pointer: coarse) {
          background: var(--theme-grey-lightest);
          padding-left: var(--gap-default);
          padding-top: 1px;
        }

        @media all and (pointer: coarse) {
          padding: 0 calc(var(--gap-default) + 1px) 0 calc(var(--gap-default) - 1px);
        }
      }
    `,
  ],
  template: `
    <ng-content></ng-content>`,
})
export class SdTabControl {
  _value = input<any>(undefined, { alias: "value" });
  _valueChange = output<any>({ alias: "valueChange" });
  value = $model(this._value, this._valueChange);
}
