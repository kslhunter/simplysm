import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from "@angular/core";
import {SdTextfieldControl, TSdTextfieldType, TSdTextfieldValue} from "./SdTextfieldControl";
import {coercionBoolean} from "../utils/commons";

@Component({
  selector: "sd-range",
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    :host {
      display: flex;
      flex-direction: row;
      gap: var(--gap-sm);
      align-items: center;
    }
  `]
})
export class SdRangeControl<K extends TSdTextfieldType> {
  @Input({required: true})
  type!: K;

  @Input()
  value: [TSdTextfieldValue<K> | undefined, TSdTextfieldValue<K> | undefined] = [undefined, undefined];

  @Output()
  valueChange = new EventEmitter<[TSdTextfieldValue<K> | undefined, TSdTextfieldValue<K> | undefined]>();

  @Input({transform: coercionBoolean})
  required = false;

  @Input({transform: coercionBoolean})
  disabled = false;
}