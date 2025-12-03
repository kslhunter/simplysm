import { ChangeDetectionStrategy, Component, input, model, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../../../core/utils/transforms/transformBoolean";
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
      @use "../../../../scss/commons/mixins";
      
      sd-range {        
        display: flex;
        align-items: center;

        @include mixins.flex-direction(row, var(--gap-sm));
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
