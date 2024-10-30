import { ChangeDetectionStrategy, Component, input, model, ViewEncapsulation } from "@angular/core";
import { SdTextfieldControl, TSdTextfieldTypes } from "./SdTextfieldControl";
import { transformBoolean } from "../utils/tramsforms";

@Component({
  selector: "sd-range",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdTextfieldControl],
  template: `
    <!--suppress TypeScriptValidateTypes -->
    <sd-textfield [type]="type()" [(value)]="from" [required]="required()" [disabled]="disabled()" />
    <div>~</div>
    <sd-textfield [type]="type()" [(value)]="to" [required]="required()" [disabled]="disabled()" />
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

  required = input(false, { transform: transformBoolean });
  disabled = input(false, { transform: transformBoolean });
}
