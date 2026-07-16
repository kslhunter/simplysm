import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { SdTextfield } from "./sd-textfield";
import type { SdTextfieldTypes } from "./sd-textfield-type-handlers";

@Component({
  selector: "sd-range",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdTextfield],
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
      @use "../../../scss/commons/mixins";

      sd-range {
        display: flex;
        align-items: center;

        @include mixins.flex-direction(row, var(--sd-gap-sm));
      }
    `,
  ],
})
export class SdRange<K extends keyof SdTextfieldTypes> {
  type = input.required<K>();

  from = model<SdTextfieldTypes[K]>();
  to = model<SdTextfieldTypes[K]>();

  inputStyle = input<string>();

  required = input(false, { transform: booleanAttribute });
  disabled = input(false, { transform: booleanAttribute });
}
