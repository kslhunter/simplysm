import {ChangeDetectionStrategy, Component, forwardRef, HostBinding, inject, Input} from "@angular/core";
import {SdTabviewControl} from "./SdTabviewControl";

@Component({
  selector: "sd-tabview-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
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
export class SdTabviewItemControl<T> {
  @Input({required: true}) value!: T;
  @Input() header?: string;

  #parentControl = inject<SdTabviewControl<T>>(forwardRef(() => SdTabviewControl));

  @HostBinding("attr.sd-selected")
  get isSelected(): boolean {
    return this.#parentControl.value === this.value;
  }
}
