import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdViewControl } from "./sd-view.control";
import { $computed } from "../../../core/utils/bindings/$computed";

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

        &[data-sd-selected="true"] {
          display: block;
        }

        sd-view[data-sd-fill="true"] & {
          height: 100%;
        }
      }
    `,
  ],
  template: `
    <ng-content></ng-content>
  `,
  host: {
    "[attr.data-sd-selected]": "isSelected()",
  },
})
export class SdViewItemControl {
  value = input<any>();

  #parentControl = inject<SdViewControl>(forwardRef(() => SdViewControl));

  isSelected = $computed(() => this.#parentControl.value() === this.value());
}
