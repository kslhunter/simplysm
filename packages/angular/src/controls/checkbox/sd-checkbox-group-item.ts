import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdCheckboxGroup } from "./sd-checkbox-group";
import { SdCheckbox } from "./sd-checkbox";

@Component({
  selector: "sd-checkbox-group-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdCheckbox],
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
export class SdCheckboxGroupItem<T> {
  private readonly _parentControl = inject<SdCheckboxGroup<T>>(
    forwardRef(() => SdCheckboxGroup),
  );

  value = input.required<T>();
  inline = input(false, { transform: booleanAttribute });

  isSelected = computed(() => this._parentControl.value().includes(this.value()));
  disabled = computed(() => this._parentControl.disabled());

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
