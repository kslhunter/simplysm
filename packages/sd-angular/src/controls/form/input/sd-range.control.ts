import { ChangeDetectionStrategy, Component, input, model, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../../../core/utils/transforms/tramsformBoolean";
import { SdTextfieldControl, TSdTextfieldTypes } from "./sd-textfield.control";

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
      [min]="from()"
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

  from = model<TSdTextfieldTypes[K]>();
  to = model<TSdTextfieldTypes[K]>();

  inputStyle = input<string>();

  required = input(false, { transform: transformBoolean });
  disabled = input(false, { transform: transformBoolean });
}
