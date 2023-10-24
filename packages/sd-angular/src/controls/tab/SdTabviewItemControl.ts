import {ChangeDetectionStrategy, Component, forwardRef, HostBinding, inject, Input} from "@angular/core";
import {SdTabviewControl} from "./SdTabviewControl";

@Component({
  selector: "sd-tabview-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: none;
      width: 100%;
      height: 100%;
      overflow: auto;

      &[sd-selected=true] {
        display: block;
      }
    }
  `]
})
export class SdTabviewItemControl {
  @Input()
  value?: any;

  @Input()
  header?: string;

  @HostBinding("attr.sd-selected")
  get isSelected(): boolean {
    return this.#parentControl.value === this.value;
  }

  #parentControl: SdTabviewControl = inject(forwardRef(() => SdTabviewControl));
}
