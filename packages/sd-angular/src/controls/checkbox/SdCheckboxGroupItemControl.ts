import {ChangeDetectionStrategy, Component, forwardRef, inject, Input} from "@angular/core";
import {SdCheckboxGroupControl} from "./SdCheckboxGroupControl";

@Component({
  selector: "sd-checkbox-group-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-checkbox [value]="isSelected" (valueChange)="onValueChange()" [inline]="true">
      <ng-content></ng-content>
    </sd-checkbox>`
})
export class SdCheckboxGroupItemControl<T> {
  #parentControl = inject(forwardRef(() => SdCheckboxGroupControl));

  @Input()
  value?: T;

  get isSelected(): boolean {
    return this.#parentControl.getIsItemSelected(this.value);
  }

  onValueChange(): void {
    this.#parentControl.toggleValueItem(this.value);
  }
}
