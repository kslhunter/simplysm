import {ChangeDetectionStrategy, Component, forwardRef, Inject, Injector, Input} from "@angular/core";
import {SdCheckboxGroupControl} from "./SdCheckboxGroupControl";
import {SdControlBase, SdStyleProvider} from "../provider/SdStyleProvider";

@Component({
  selector: "sd-checkbox-group-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-checkbox [value]="isSelected" (valueChange)="onValueChange($event)" [inline]="true">
      <ng-content></ng-content>
    </sd-checkbox>`
})
export class SdCheckboxGroupItemControl extends SdControlBase {
  public sdInitStyle(vars: SdStyleProvider): string {
    return /* language=LESS */ ``;
  }

  @Input()
  public value?: any;

  public get isSelected(): boolean {
    return this._parentControl.getIsItemSelected(this.value);
  }

  public constructor(injector: Injector,
                     @Inject(forwardRef(() => SdCheckboxGroupControl))
                     private readonly _parentControl: SdCheckboxGroupControl) {
    super(injector);
  }

  public onValueChange(): void {
    this._parentControl.toggleValueItem(this.value);
  }
}