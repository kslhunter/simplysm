import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  HostBinding,
  inject,
  Input,
  ViewEncapsulation,
} from "@angular/core";
import { SdTabviewControl } from "./SdTabviewControl";

@Component({
  selector: "sd-tabview-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ` <ng-content></ng-content>`,
  styles: [
    /* language=SCSS */ `
      sd-tabview-item {
        display: none;
        width: 100%;
        height: 100%;
        overflow: auto;

        &[sd-selected="true"] {
          display: block;
        }
      }
    `,
  ],
})
export class SdTabviewItemControl<T> {
  @Input({ required: true }) value!: T;
  @Input() header?: string;

  #parentControl = inject<SdTabviewControl<T>>(forwardRef(() => SdTabviewControl));

  @HostBinding("attr.sd-selected")
  get isSelected(): boolean {
    return this.#parentControl.value === this.value;
  }
}
