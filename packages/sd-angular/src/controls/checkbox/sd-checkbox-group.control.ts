import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../../utils/tramsforms";
import { $model } from "../../utils/$hooks";

@Component({
  selector: "sd-checkbox-group",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>
  `,
})
export class SdCheckboxGroupControl<T> {
  _value = input<T[]>([], { alias: "value" });
  _valueChange = output<T[]>({ alias: "valueChange" });
  value = $model(this._value, this._valueChange);


  disabled = input(false, { transform: transformBoolean });
}
