import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from "@angular/core";
import { SdTextfieldControl, TSdTextfieldTypes } from "./sd-textfield.control";
import { transformBoolean } from "../utils/type-tramsforms";
import { $model } from "../utils/hooks";

@Component({
  selector: "sd-range",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdTextfieldControl],
  template: `
    <sd-textfield
      [type]="type()"
      [(value)]="from"
      [required]="required()"
      [disabled]="disabled()"
      [inputStyle]="inputStyle()"
    />
    <div>~</div>
    <sd-textfield
      [type]="type()"
      [(value)]="to"
      [required]="required()"
      [disabled]="disabled()"
      [inputStyle]="inputStyle()"
    />
  `,
  styles: [
    /* language=SCSS */ `
      sd-range {
        display: flex;
        flex-direction: row;
        gap: var(--gap-sm);
        align-items: center;
      }
    `,
  ],
})
export class SdRangeControl<K extends keyof TSdTextfieldTypes> {
  type = input.required<K>();

  _from = input<TSdTextfieldTypes[K] | undefined>(undefined, { alias: "from" });
  _fromChange = output<TSdTextfieldTypes[K] | undefined>({ alias: "fromChange" });
  from = $model(this._from, this._fromChange);

  _to = input<TSdTextfieldTypes[K] | undefined>(undefined, { alias: "to" });
  _toChange = output<TSdTextfieldTypes[K] | undefined>({ alias: "toChange" });
  to = $model(this._to, this._toChange);

  inputStyle = input<string>();

  required = input(false, { transform: transformBoolean });
  disabled = input(false, { transform: transformBoolean });
}
