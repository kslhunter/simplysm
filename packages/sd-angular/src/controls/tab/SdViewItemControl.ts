import {ChangeDetectionStrategy, Component, forwardRef, HostBinding, inject, Input} from "@angular/core";
import {SdViewControl} from "./SdViewControl";

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
  value?: any;

  @HostBinding("attr.sd-selected")
  get isSelected(): boolean {
    return this.#parentControl.value === this.value;
  }

  #parentControl: SdViewControl = inject(forwardRef(() => SdViewControl));
}
