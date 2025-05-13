import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/type-tramsforms";
import { $model } from "../utils/hooks/$model";

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
  __value = input<T[]>([], { alias: "value" });
  __valueChange = output<T[]>({ alias: "valueChange" });
  value = $model(this.__value, this.__valueChange);


  disabled = input(false, { transform: transformBoolean });
}
