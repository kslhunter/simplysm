import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdTabControl } from "./sd-tab.control";
import { $computed } from "../../../core/utils/bindings/$computed";

@Component({
  selector: "sd-tab-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  host: {
    "[attr.data-sd-selected]": "isSelected()",
    "(click)": "onClick()",
  },
  template: `
    <ng-content></ng-content>
  `,
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
})
export class SdTabItemControl {
  private readonly _parentControl = inject<SdTabControl>(forwardRef(() => SdTabControl));

  value = input<any>();

  isSelected = $computed(() => this._parentControl.value() === this.value());

  onClick() {
    this._parentControl.value.set(this.value());
  }
}
