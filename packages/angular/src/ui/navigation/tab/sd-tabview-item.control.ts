import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdTabviewControl } from "./sd-tabview.control";

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

  private readonly _parentControl = inject<SdTabviewControl<T>>(
    forwardRef(() => SdTabviewControl),
  );

  isSelected = computed(() => this._parentControl.value() === this.value());
}
