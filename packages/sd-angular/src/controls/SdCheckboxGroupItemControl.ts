import { ChangeDetectionStrategy, Component, forwardRef, inject, Input, ViewEncapsulation } from "@angular/core";
import { SdCheckboxGroupControl } from "./SdCheckboxGroupControl";
import { SdCheckboxControl } from "./SdCheckboxControl";
import { sdGetter } from "../utils/hooks";

@Component({
  selector: "sd-checkbox-group-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCheckboxControl],
  template: `
    <sd-checkbox
      [value]="getIsSelected()"
      (valueChange)="onSelectedChange($event)"
      [inline]="inline"
      [disabled]="disabled"
    >
      <ng-content></ng-content>
    </sd-checkbox>
  `,
})
export class SdCheckboxGroupItemControl<T> {
  #parentControl = inject<SdCheckboxGroupControl<T>>(forwardRef(() => SdCheckboxGroupControl));

  @Input({ required: true }) value!: T;
  @Input() inline = false;

  getIsSelected = sdGetter(
    () => ({
      parentValue: [this.#parentControl.value, "one"],
      value: [this.value],
    }),
    () => {
      return this.#parentControl.value.includes(this.value);
    },
  );

  get disabled() {
    return this.#parentControl.disabled;
  }

  onSelectedChange(selected: boolean): void {
    if (selected) {
      this.#parentControl.value.push(this.value);
    } else {
      this.#parentControl.value.remove(this.value);
    }

    this.#parentControl.valueChange.emit(this.#parentControl.value);
  }
}
