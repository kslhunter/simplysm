import { ChangeDetectionStrategy, Component, forwardRef, inject, input, ViewEncapsulation } from "@angular/core";
import { SdViewControl } from "./sd-view.control";
import { $computed } from "../utils/hooks/hooks";

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
  template: `
    <ng-content></ng-content>
  `,
  host: {
    "[attr.sd-selected]": "isSelected()",
  },
})
export class SdViewItemControl {
  value = input<any>();

  private _parentControl = inject<SdViewControl>(forwardRef(() => SdViewControl));

  isSelected = $computed(() => this._parentControl.value() === this.value());
}
