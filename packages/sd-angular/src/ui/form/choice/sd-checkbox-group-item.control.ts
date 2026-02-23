import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdCheckboxGroupControl } from "./sd-checkbox-group.control";
import { SdCheckboxControl } from "./sd-checkbox.control";
import { transformBoolean } from "../../../core/utils/transforms/transformBoolean";
import { $computed } from "../../../core/utils/bindings/$computed";

@Component({
  selector: "sd-checkbox-group-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCheckboxControl],
  template: `
    <sd-checkbox
      [value]="isSelected()"
      (valueChange)="onSelectedChange($event)"
      [inline]="inline()"
      [disabled]="disabled()"
    >
      <ng-content></ng-content>
    </sd-checkbox>
  `,
})
export class SdCheckboxGroupItemControl<T> {
  private readonly _parentControl = inject<SdCheckboxGroupControl<T>>(
    forwardRef(() => SdCheckboxGroupControl),
  );

  value = input.required<T>();
  inline = input(false, { transform: transformBoolean });

  isSelected = $computed(() => this._parentControl.value().includes(this.value()));
  disabled = $computed(() => this._parentControl.disabled());

  onSelectedChange(selected: boolean) {
    this._parentControl.value.update((v) => {
      if (selected) {
        return [...v, this.value()];
      } else {
        return v.filter((item) => item !== this.value());
      }
    });
  }
}
