import {ChangeDetectionStrategy, Component, forwardRef, inject, input, ViewEncapsulation} from "@angular/core";
import {SdCheckboxGroupControl} from "./SdCheckboxGroupControl";
import {SdCheckboxControl} from "./SdCheckboxControl";
import {$computed} from "../utils/$hooks";

@Component({
  selector: "sd-checkbox-group-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCheckboxControl],
  template: `
    <sd-checkbox [value]="isSelected()"
                 (valueChange)="onSelectedChange($event)"
                 [inline]="inline()"
                 [disabled]="disabled()">
      <ng-content></ng-content>
    </sd-checkbox>
  `
})
export class SdCheckboxGroupItemControl<T> {
  #parentControl = inject<SdCheckboxGroupControl<T>>(forwardRef(() => SdCheckboxGroupControl));

  value = input.required<T>();
  inline = input(false);

  isSelected = $computed(() => this.#parentControl.value().includes(this.value()));
  disabled = $computed(() => this.#parentControl.disabled());

  onSelectedChange(selected: boolean): void {
    this.#parentControl.value.update((v) => {
      if (selected) {
        return [...v, this.value()];
      }
      else {
        return v.filter((item) => item !== this.value());
      }
    });
  }
}
