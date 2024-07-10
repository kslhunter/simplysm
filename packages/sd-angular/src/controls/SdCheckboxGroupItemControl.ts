import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  forwardRef,
  inject,
  Injector,
  Input,
  ViewEncapsulation
} from "@angular/core";
import {SdCheckboxGroupControl} from "./SdCheckboxGroupControl";
import {SdCheckboxControl} from "./SdCheckboxControl";
import {SdNgHelper} from "../utils/SdNgHelper";

@Component({
  selector: "sd-checkbox-group-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdCheckboxControl
  ],
  template: `
    <sd-checkbox [value]="isSelected" (valueChange)="onSelectedChange($event)"
                 [inline]="inline">
      <ng-content></ng-content>
    </sd-checkbox>`
})
export class SdCheckboxGroupItemControl<T> implements DoCheck {
  #parentControl = inject<SdCheckboxGroupControl<T>>(forwardRef(() => SdCheckboxGroupControl));

  @Input({required: true}) value!: T;
  @Input() inline = false;

  isSelected = false;

  #sdNgHelper = new SdNgHelper(inject(Injector));

  ngDoCheck(): void {
    this.#sdNgHelper.doCheck(run => {
      run({
        parentKeyProp: [this.#parentControl.keyProp],
        parentValue: [this.#parentControl.value],
        value: [this.value]
      }, () => {
        const thisKeys = (this.#parentControl.keyProp != null)
          ? this.#parentControl.value.map((item) => item[this.#parentControl.keyProp!])
          : this.#parentControl.value;
        const itemKey = (this.#parentControl.keyProp != null) ? this.value[this.#parentControl.keyProp] : this.value;

        this.isSelected = thisKeys.includes(itemKey);
      });
    });
  }

  onSelectedChange(selected: boolean): void {
    const newValues = [...this.#parentControl.value];

    if (selected) {
      newValues.push(this.value);
    }
    else {
      newValues.remove(this.value);
    }

    if (this.#parentControl.valueChange.observed) {
      this.#parentControl.valueChange.emit(newValues);
    }
    else {
      this.#parentControl.value = newValues;
    }
  }
}
