import { ChangeDetectionStrategy, Component, forwardRef, inject, input, ViewEncapsulation } from "@angular/core";
import { SdViewControl } from "./SdViewControl";
import { $computed } from "../utils/$hooks";
import { $hostBinding } from "../utils/$hostBinding";

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
  template: ` <ng-content></ng-content> `,
})
export class SdViewItemControl {
  value = input<any>();

  #parentControl = inject<SdViewControl>(forwardRef(() => SdViewControl));

  isSelected$ = $computed(() => this.#parentControl.value() === this.value());

  constructor() {
    $hostBinding("attr.sd-selected", this.isSelected$);
  }
}
