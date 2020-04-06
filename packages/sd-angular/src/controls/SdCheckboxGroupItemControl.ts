import {ChangeDetectionStrategy, Component, forwardRef, Inject, Input} from "@angular/core";
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
  @Input()
  public value?: any;

  public get isSelected(): boolean {
    return this._parentControl.getIsItemSelected(this.value);
  }

  public constructor(@Inject(forwardRef(() => SdCheckboxGroupControl))
                     private readonly _parentControl: SdCheckboxGroupControl) {
  }

  public onValueChange(): void {
    this._parentControl.toggleValueItem(this.value);
  }
}
