import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdTabviewControl } from "./sd-tabview.control";
import { $computed } from "../../../core/utils/bindings/$computed";

@Component({
  selector: "sd-tabview-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-tabview-item {
        display: none;
        width: 100%;
        height: 100%;
        overflow: auto;

        &[data-sd-selected="true"] {
          display: block;
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
export class SdTabviewItemControl<T> {
  value = input.required<T>();
  header = input<string>();

  parentControl = inject<SdTabviewControl<T>>(forwardRef(() => SdTabviewControl));

  isSelected = $computed(() => this.parentControl.value() === this.value());
}
