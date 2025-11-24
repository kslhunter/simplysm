import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  HostListener,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdTabControl } from "./sd-tab.control";
import { $computed } from "../../utils/bindings/$computed";

@Component({
  selector: "sd-tab-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-tab-item {
        display: inline-block;
        padding: var(--gap-sm) var(--gap-default);
        cursor: pointer;
        margin-bottom: -2px;

        border-bottom: 2px solid transparent !important;
        font-weight: bold;
        color: var(--theme-gray-default);

        &[data-sd-selected="true"] {
          border-bottom: 3px solid var(--theme-primary-default) !important;
          color: var(--theme-primary-default);
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
export class SdTabItemControl {
  #parentControl = inject<SdTabControl>(forwardRef(() => SdTabControl));

  value = input<any>();

  isSelected = $computed(() => this.#parentControl.value() === this.value());

  @HostListener("click")
  onClick() {
    this.#parentControl.value.set(this.value());
  }
}
