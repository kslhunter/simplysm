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
export class SdCheckboxGroupItemControl {
  private _parentControl = inject(forwardRef(() => SdCheckboxGroupControl));

  @Input()
  value?: any;

  get isSelected(): boolean {
    return this._parentControl.getIsItemSelected(this.value);
  }

  onValueChange(): void {
    this._parentControl.toggleValueItem(this.value);
  }
}
