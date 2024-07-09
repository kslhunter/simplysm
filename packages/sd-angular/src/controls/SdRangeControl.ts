import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation} from "@angular/core";
import {SdTextfieldControl, TSdTextfieldType, TSdTextfieldValue} from "./SdTextfieldControl";
import {coercionBoolean} from "../utils/commons";

@Component({
  selector: "sd-range",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdTextfieldControl
  ],
  template: `
    <!--suppress TypeScriptValidateTypes -->
    <sd-textfield [type]="type"
                  [(value)]="value[0]"
                  [required]="required"
                  [disabled]="disabled"/>
    <div>~</div>
    <sd-textfield [type]="type"
                  [(value)]="value[1]"
                  [required]="required"
                  [disabled]="disabled"/>`,
  styles: [/* language=SCSS */ `
    sd-range {
      display: flex;
      flex-direction: row;
      gap: var(--gap-sm);
      align-items: center;
    }
  `]
})
export class SdRangeControl<K extends TSdTextfieldType> {
  @Input({required: true}) type!: K;

  @Input() value: [TSdTextfieldValue<K>?, TSdTextfieldValue<K>?] = [];
  @Output() valueChange = new EventEmitter<[TSdTextfieldValue<K> | undefined, TSdTextfieldValue<K> | undefined]>();

  @Input({transform: coercionBoolean}) required = false;
  @Input({transform: coercionBoolean}) disabled = false;
}