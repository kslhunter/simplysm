import { ChangeDetectionStrategy, Component, forwardRef, HostBinding, Inject, Input } from "@angular/core";
import { SdViewControl } from "./SdViewControl";

@Component({
  selector: "sd-view-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: none;

      &[sd-selected=true] {
        display: block;
      }
    }
  `]
})
export class SdViewItemControl {
  @Input()
  public value?: any;

  @HostBinding("attr.sd-selected")
  public get isSelected(): boolean {
    return this._parentControl.value === this.value;
  }

  public constructor(@Inject(forwardRef(() => SdViewControl))
                     private readonly _parentControl: SdViewControl) {
  }
}
