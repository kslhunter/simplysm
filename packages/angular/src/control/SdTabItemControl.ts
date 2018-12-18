import {ChangeDetectionStrategy, Component, forwardRef, HostBinding, HostListener, Inject, Input} from "@angular/core";
import {SdTabControl} from "./SdTabControl";


@Component({
  selector: "sd-tab-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdTabItemControl {


  @Input()
  public value?: any;

  @HostBinding("attr.sd-selected")
  public get isSelected(): boolean {
    return this._parentControl.value === this.value;
  }

  public constructor(@Inject(forwardRef(() => SdTabControl))
                     private readonly _parentControl: SdTabControl) {
  }

  @HostListener("click")
  public onClick(): void {
    this._parentControl.setValue(this.value);
  }
}