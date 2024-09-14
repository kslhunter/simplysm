import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdViewControl } from "./SdViewControl";

@Component({
  selector: "sd-view-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-view-item {
        display: none;

        &[sd-selected="true"] {
          display: block;
        }

        sd-view[sd-fill="true"] & {
          height: 100%;
        }
      }
    `,
  ],
  template: ` <ng-content></ng-content>`,
  host: {
    "[attr.sd-selected]": "isSelected()",
  },
})
export class SdViewItemControl {
  value = input<any>();

  #parentControl = inject<SdViewControl>(forwardRef(() => SdViewControl));

  isSelected = computed(() => this.#parentControl.value() === this.value());
}
