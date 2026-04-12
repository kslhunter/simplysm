import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdTab } from "./sd-tab";

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
export class SdTabItem {
  private readonly _parentControl = inject<SdTab>(forwardRef(() => SdTab));

  value = input<any>();

  isSelected = computed(() => this._parentControl.value() === this.value());

  onClick() {
    this._parentControl.value.set(this.value());
  }
}
